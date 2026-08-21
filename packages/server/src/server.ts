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
 */
import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { randomBytes } from 'node:crypto';
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { ConstitutionSession, sha256Hex, view } from '../../constitution/src/index.js';
import type { LogEntry } from '../../constitution/src/index.js';
import { Auth } from './auth.js';
import type { ServerConfig } from './config.js';
import { DocStore, slugify, uniqueSlug } from './store.js';
import type { LoadedDoc } from './store.js';
import { FilePersistence, WriteChain } from './persistence.js';
import type { Persistence } from './persistence.js';
import { PgPersistence } from './pg-persistence.js';
import { Stash } from './stash.js';
import { MAILS, makeMailer } from './mailer.js';
import { asEngineDoc, driveBridge, persistEngine, resumeBridge } from './engine-host.js';
import { ParticipantApi } from '../../engine-core/src/participant-api.js';
import type { Mail, Mailer } from './mailer.js';
import { LIMITS, cap, emailOk, runCommand, str } from './commands.js';

/**
 * One cookie per document (review #1, finding 13): a single name meant
 * logging into one document logged you out of every other. The document
 * id is a hex string, cookie-name-safe by construction; the legacy name
 * is still read, for its own document only, until those cookies expire.
 */
/** The address grammar the page shares (Q460): lower case, digits,
 *  hyphens, three characters or more. */
const SLUG_OK = /^[a-z0-9][a-z0-9-]{2,}$/;
const LEGACY_COOKIE = 'draft_session';
const cookieName = (docId: string): string =>
  `draft_session_${docId.replace(/[^A-Za-z0-9_-]/g, '')}`;

/** Q346 territory, minimally: the mail-minting doors are rate-limited
 *  per address+route — in memory, generous, a brake not a wall. */
const BUCKET = new Map<string, { n: number; resetMs: number }>();
function rateLimited(key: string, nowMs: number, max = 20, windowMs = 600_000): boolean {
  const b = BUCKET.get(key);
  if (!b || b.resetMs < nowMs) { BUCKET.set(key, { n: 1, resetMs: nowMs + windowMs }); return false; }
  b.n += 1;
  return b.n > max;
}

export interface DraftServer {
  server: Server;
  store: DocStore;
  auth: Auth;
  mailer: Mailer;
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
  const persistence = injected ?? await openPersistence(cfg);
  const store = new DocStore(persistence);
  await store.loadAll();
  for (const doc of store.all()) {
    try {
      await resumeBridge(persistence, doc);
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
  const stash = new Stash(persistence);
  const commits = new WriteChain();

  /** Non-decreasing time per document (the module requires it). */
  const tOf = (cs: ConstitutionSession, nowMs: number): number => {
    const log = cs.logEntries();
    const last = log.length > 0 ? log[log.length - 1]!.event.t : 0;
    return Math.max(nowMs, last);
  };

  /** Mail follows the fold: relay what freshly-persisted events imply. */
  const relay = async (doc: LoadedDoc, fresh: readonly LogEntry[], nowMs: number): Promise<void> => {
    const cs = doc.cs;
    const title = cs.titleOf;
    const loginLink = (memberId: string, email: string): string => {
      // deferred: one relay pass persists the token batch once, not per mail
      const token = auth.mintDeferred(
        { kind: 'login', email, docId: doc.id, memberId }, nowMs);
      return `${cfg.baseUrl}/auth/login?token=${token}`;
    };
    const queue: Mail[] = [];
    for (const { event } of fresh) {
      if (event.type === 'member-invited') {
        queue.push({ to: event.email,
          ...MAILS.invite(title, loginLink(event.member, event.email)) });
      } else if (event.type === 'member-admitted') {
        // without this, an admitted applicant is stranded: their applicant
        // cookie can only submit, and nothing tells them they are in
        // (review #1, finding 7)
        const m = cs.memberRecords().get(event.member);
        if (m !== undefined && m.email.length > 0) {
          queue.push({ to: m.email,
            ...MAILS.admitted(title, loginLink(event.member, m.email)) });
        }
      } else if (event.type === 'closed') {
        // the close (SPEC §4.6): every member and invitee is told, once — the
        // close is one event in the log, and only fresh entries relay
        const link = `${cfg.baseUrl}/d/${cs.slug}`;
        const seen = new Set<string>();
        const tell = (email: string | null | undefined): void => {
          if (!email || seen.has(email)) return;
          seen.add(email);
          queue.push({ to: email, ...MAILS.closed(title, link) });
        };
        tell(cs.convenorRecord().email);
        for (const m of cs.memberRecords().values()) if (!m.removed) tell(m.email);
      } else if (event.type === 'lapse-warned' || event.type === 'member-lapsed') {
        const m = cs.memberRecords().get(event.member);
        const email = m?.email ?? (event.member === cs.convenorRecord().id
          ? cs.convenorRecord().email : null);
        if (email !== null) {
          const make = event.type === 'lapse-warned' ? MAILS.lapseWarning : MAILS.lapsed;
          queue.push({ to: email, ...make(title, loginLink(event.member, email)) });
        }
      }
    }
    if (queue.length > 0) await auth.flush(nowMs); // every queued mail minted a token
    for (const mail of queue) void mailer.send(mail).catch((e) => {
      console.error(`mail to ${mail.to} failed:`, e);
    });
  };

  /** Persist a document's fresh entries, durably, in order. A 200 means
   *  this resolved; the WriteChain is what makes "in order" true. */
  const commit = (doc: LoadedDoc, nowMs: number): Promise<number> =>
    commits.run(doc.id, async () => {
      // the engine rides every commit (Q391): born at constitute, synced
      // with roster truth and ground shifts, closed when the ending passes
      driveBridge(doc, tOf(doc.cs, nowMs), cfg.engineTuning);
      // the document log first — it is the source of truth, and the
      // bridge's persisted cursor points into it (review #2, finding 2):
      // a crash after this and before the engine persist leaves a cursor
      // *behind* the log, which resume's sync simply catches up; the other
      // order leaves it ahead, and the entries in between are never fed
      const fresh = await store.persist(doc);
      await persistEngine(persistence, doc);
      if (fresh.length > 0) await relay(doc, fresh, nowMs);
      return doc.cs.logEntries().length;
    });

  /**
   * The member's side of the engine (Q391, stage 8): the document as it
   * stands — the engine's once races run, the starting text before — the
   * text races over it, what is theirs, the record so far, their cards
   * and their wallet. Blind throughout (§3.5): wordings, rationales, the
   * member's own judgments and resolved outcomes; never standings, never
   * anybody else's judgments, never an author.
   */
  const raceView = (doc: LoadedDoc, memberId: string, nowMs: number): {
    text: string; textVersion: number; clauses: unknown[]; mine: unknown[];
    records: unknown[]; raceCards: unknown[]; wallet: number | null;
    walletInfo: unknown; floor: number;
  } => {
    const ed = asEngineDoc(doc);
    const idle = { clauses: [], mine: [], records: [], raceCards: [], wallet: null, record: null,
      walletInfo: null, floor: 0 };
    if (ed.bridge === null) return { text: doc.cs.text ?? '', textVersion: 0, ...idle };
    const engine = ed.bridge.engine;
    const api = new ParticipantApi(engine, memberId);
    const myJ = api.myJudgments();
    const touches = (ids: Set<string>) => (j: { aId: string; bId: string }) =>
      ids.has(j.aId) || ids.has(j.bId);
    // per-race judge counts are the record's own numbers (§8.2): a count,
    // never who or which way
    const allJ = engine.judgments();
    const floor = engine.adoptionFloor();
    const clauses = engine.races().filter((r) => r.settingId === undefined).map((r) => {
      const ids = new Set([...r.members, r.incumbentId]);
      const here = myJ.filter(touches(ids));
      const standing = here.some((j) => !j.superseded && !j.locked);
      return {
        id: r.id,
        contested: r.contested,
        incumbentId: r.incumbentId,
        deadlocked: r.deadlocked,
        // closeness to resolution as a magnitude (SPEC §8.3) — see RaceView
        closeness: r.closeness,
        judges: r.distinctMovers,
        floor,
        candidates: r.members.map((id) => {
          const c = engine.getCandidate(id);
          return { id, hunks: c.patch?.hunks ?? [], rationale: c.rationale,
            mine: c.author === memberId };
        }),
        judged: standing,
        // a judgment of mine locked by a ground shift, with nothing of mine
        // standing since: the race will ask me again (↻)
        shifted: !standing && here.some((j) => j.locked && !j.superseded),
      };
    });
    const mine = api.myCandidates().flatMap((m) => {
      const c = engine.getCandidate(m.id);
      if (c.patch === undefined) return []; // motions have their own records
      return [{ id: m.id, state: m.state, rationale: m.rationale,
        patch: c.patch, footprint: c.footprint }];
    });
    // the record, one entry per race (Q503c): the whole field, the text it
    // displaced as it stood at resolution, and the race's judge count
    type Rec = { raceId: string; candidateId: string; outcome: string; when: number;
      p: number | null; threshold: number | null; version: number;
      footprint: unknown; displaced: string[]; judges: number; judgedByMe: boolean;
      field: Array<{ candidateId: string; outcome: string; p: number | null;
        threshold: number | null; hunks: Array<{ start: number; end: number; lines: string[] }>;
        rationale: string; judgedByMe: boolean }> };
    const byRace = new Map<string, Rec>();
    // an author's derived preference is a mover (§3.3, §8.2): counted, never named
    const authorsOf = new Map<string, Set<string>>();
    for (const o of api.outcomes()) {
      const c = engine.getCandidate(o.candidateId);
      if (c.patch === undefined) continue;
      const mineJ = myJ.some((j) => j.aId === o.candidateId || j.bId === o.candidateId);
      const entry = { candidateId: o.candidateId, outcome: o.outcome, p: o.p ?? null,
        threshold: o.threshold ?? null, hunks: c.patch.hunks, rationale: c.rationale,
        judgedByMe: mineJ };
      let rec = byRace.get(o.raceId);
      if (!rec) {
        rec = { raceId: o.raceId, candidateId: o.candidateId, outcome: o.outcome, when: o.t,
          p: o.p ?? null, threshold: o.threshold ?? null, version: o.version,
          footprint: c.footprint, displaced: [], judges: 0, judgedByMe: false, field: [] };
        byRace.set(o.raceId, rec);
      }
      rec.field.push(entry);
      if (!authorsOf.has(o.raceId)) authorsOf.set(o.raceId, new Set());
      authorsOf.get(o.raceId)!.add(c.author);
      rec.judgedByMe = rec.judgedByMe || mineJ;
      if (o.outcome === 'adopted') {
        rec.candidateId = o.candidateId; rec.outcome = 'adopted'; rec.when = o.t;
        rec.p = o.p ?? null; rec.threshold = o.threshold ?? null; rec.version = o.version;
        rec.footprint = c.footprint;
      }
    }
    for (const rec of byRace.values()) {
      const hs = rec.field.flatMap((f) => f.hunks);
      const span = { start: Math.min(...hs.map((h) => h.start)), end: Math.max(...hs.map((h) => h.end)) };
      let prev: string[] = [];
      try { prev = engine.documentAt(rec.version).split('\n'); } catch { prev = []; }
      rec.displaced = prev.slice(span.start, span.end);
      const ids = new Set(rec.field.map((f) => f.candidateId));
      rec.judges = new Set([...allJ.filter(touches(ids)).map((j) => j.participantId),
        ...(authorsOf.get(rec.raceId) ?? [])]).size;
    }
    const records = [...byRace.values()].sort((a, b) => a.when - b.when).slice(-50);
    // **The record** (SPEC §4.6, the shape record-builder renders), once closed:
    // the final text, what adopted, the backlog of undecided races each with
    // its field and the text that stood, the changes carried-but-unassented,
    // the signatures. Authorship reveals here as the 👤 ladder says (§3.5a):
    // `sealed` unseals at the record, `public` already was, `anonymous` never.
    const record = !engine.closed ? null : (() => {
      const r = ed.bridge!.closeRecord();
      const rung = (doc.cs.settingState('authorship').value as { rung?: string } | null)?.rung ?? 'sealed';
      const nameOf = (id: string): string | null => {
        if (id === doc.cs.convenorRecord().id) return doc.cs.convenorRecord().name ?? null;
        return doc.cs.memberRecords().get(id)?.name ?? null;
      };
      const withAuthors = (field: Rec['field']) => field.map((f) => rung === 'anonymous' ? f
        : { ...f, author: { id: engine.getCandidate(f.candidateId).author,
          name: nameOf(engine.getCandidate(f.candidateId).author) } });
      const all = [...byRace.values()].sort((a, b) => a.when - b.when)
        .map((x) => ({ ...x, field: withAuthors(x.field) }));
      return {
        closedAt: r.closedAt, text: r.text,
        adopted: all.filter((x) => x.outcome === 'adopted'),
        undecided: all.filter((x) => x.outcome === 'undecided'),
        carriedButUnassented: r.carriedButUnassented,
        signatures: r.signatures,
      };
    })();
    const base = { text: engine.document(), textVersion: engine.currentVersion(),
      clauses, mine, records, floor, record };
    if (engine.closed) return { ...base, raceCards: [], wallet: null, walletInfo: null };
    try {
      const t = tOf(doc.cs, nowMs);
      const w = api.wallet(t);
      // JSON has no Infinity: a document that does not drip says null
      const fin = (x: number) => (Number.isFinite(x) ? x : null);
      return { ...base, raceCards: api.nextCards(10, t), wallet: w.balance,
        walletInfo: { balance: w.balance, nextDripInMs: fin(w.nextDripInMs),
          dripIntervalMs: fin(w.dripIntervalMs), cap: w.cap } };
    } catch {
      return { ...base, raceCards: [], wallet: null, walletInfo: null }; // a clerk, or a seat out of E
    }
  };

  const tick = async (nowMs: number = Date.now()): Promise<void> => {
    for (const [key, b] of BUCKET) if (b.resetMs < nowMs) BUCKET.delete(key);
    for (const doc of store.all()) {
      if (closing !== null) return; // shutting down: no new commits join the drain
      if (doc.cs.constitutedAtT === null) continue;
      // engine first (SPEC §4.6): the final adoption batch must run before
      // the constitution closes, or a carried motion has nowhere to land —
      // driveBridge closes the engine at the ending and finishes the
      // constitution's close itself; cs.tick then finds it closed
      driveBridge(doc, tOf(doc.cs, nowMs), cfg.engineTuning);
      doc.cs.tick(tOf(doc.cs, nowMs));
      await commit(doc, nowMs);
    }
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
      if (internal) console.error('internal error:', e);
      const message = e instanceof Error ? e.message : String(e);
      if (!res.headersSent) {
        if (internal) json(res, 500, { error: 'something went wrong' });
        else json(res, 400, { error: message });
      }
    });
  });

  const httpsOn = cfg.baseUrl.startsWith('https://');

  async function route(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const nowMs = Date.now();
    const url = new URL(req.url ?? '/', cfg.baseUrl);
    const path = url.pathname;
    const seg = path.split('/').filter((s) => s.length > 0);

    // security headers on everything (stage 3, defects 2/9); the page
    // ships large inline scripts, so a script CSP waits for the asset
    // pipeline — these directives bite without breaking it
    res.setHeader('x-content-type-options', 'nosniff');
    // which bytes are answering (see cfg.buildSha): CI polls this after a
    // deploy so that "verified" is a statement about the new build
    if (cfg.buildSha !== null) res.setHeader('x-build', cfg.buildSha);
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
      if (origin !== undefined && origin !== new URL(cfg.baseUrl).origin) {
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

    /** 404 for a document that isn't there; hand back whatever is. */
    /** Free if no document holds it and no live pending creation has
     *  reserved it (Q462b). */
    const slugFree = async (slug: string): Promise<boolean> =>
      !store.slugTaken(slug) && (await stash.reservedBy(slug, nowMs)) === null;
    /** uniqueSlug over both kinds of taken-ness. */
    const uniqueSlugAsync = async (base: string): Promise<string> => {
      if (await slugFree(base)) return base;
      for (let n = 2; ; n++) {
        const candidate = `${base}-${n}`;
        if (await slugFree(candidate)) return candidate;
      }
    };

    const docOr404 = (doc: LoadedDoc | null): LoadedDoc | null => {
      if (doc === null) json(res, 404, { error: 'no such document' });
      return doc;
    };
    /** 429 a mail-minting door when its per-IP bucket overflows. */
    const tooMany = (route: string, max = 20): boolean => {
      if (!rateLimited(`${route}:${ipOf(req, cfg)}`, nowMs, max)) return false;
      json(res, 429, { error: 'too many requests — try again shortly' });
      return true;
    };

    /* -- health (stage 7): which bytes, which store, how much is loaded -- */
    // Public by the same argument as x-build: the repository is public and
    // none of this is about a person. The document count is what lets an
    // operator read "the restore brought everything back" from one curl.
    // the platform probes HEAD / (seen in the logs, 2026-08-20); answer it
    // as a GET would, without the body, rather than a misleading 404
    if (req.method === 'HEAD' && (path === '/' || path === '/healthz')) {
      res.writeHead(200, { 'content-type': path === '/' ? 'text/html; charset=utf-8'
        : 'application/json; charset=utf-8' });
      res.end();
      return;
    }
    if (req.method === 'GET' && path === '/healthz') {
      res.setHeader('cache-control', 'no-store');
      json(res, 200, {
        ok: true,
        build: cfg.buildSha,
        store: cfg.store,
        documents: [...store.all()].length,
        uptimeSeconds: Math.floor((nowMs - bootedAtMs) / 1000),
      });
      return;
    }

    /* -- creation (§9.7a: the mail is the save) -------------------------- */
    // Deleted from the production artifact, not flag-gated (stage 3,
    // defects 1/9 and decision 437): the DEV label is dropped bodily by
    // the build ('npm run build' passes --drop-labels=DEV), so no
    // misconfiguration can serve magic links — the code is not there.
    DEV: if (req.method === 'GET' && path === '/api/dev/outbox') {
      if (!mailer.dev) { json(res, 404, { error: 'not found' }); return; }
      const p = join(cfg.dataDir, 'outbox.jsonl');
      const mails = existsSync(p)
        ? readFileSync(p, 'utf8').split('\n').filter(Boolean).slice(-30)
            .map((l) => { try { return JSON.parse(l) as unknown; } catch { return null; } })
            .filter((m) => m !== null).reverse()
        : [];
      json(res, 200, { mails });
      return;
    }

    /* the address, asked before the email (Q460): is it free? A document
       holds it, or a pending creation has reserved it (Q462b) — the one
       small oracle on pending documents, the price of promising an
       address. No personal data: a slug is a public name by design. */
    if (req.method === 'GET' && seg[0] === 'api' && seg[1] === 'slug' && seg.length === 3) {
      if (tooMany('slug', 120)) return;
      const slug = decodeURIComponent(seg[2]!);
      if (!SLUG_OK.test(slug) || slug.length > LIMITS.slug) {
        json(res, 200, { available: false, legal: false });
        return;
      }
      res.setHeader('cache-control', 'no-store');
      json(res, 200, { available: await slugFree(slug), legal: true });
      return;
    }

    if (req.method === 'POST' && path === '/api/docs') {
      if (tooMany('docs')) return;
      const body = await readJson(req);
      const title = cap(expectString(body, 'title'), LIMITS.title, 'the title');
      const email = emailOk(expectString(body, 'email'));
      const isMember = body.isMember !== false;
      // the founder chooses the address before the email (Q460); absent
      // (older clients, the tests' shorthand) it is suggested from the title
      let slug: string;
      if (typeof body.slug === 'string') {
        slug = body.slug.trim().toLowerCase();
        if (!SLUG_OK.test(slug) || slug.length > LIMITS.slug) {
          json(res, 400, { error: 'the address must be lower case, digits and hyphens, three characters or more' });
          return;
        }
        if (!(await slugFree(slug))) {
          // 462b: told "taken", and offered the nearest free one
          json(res, 409, { error: 'that address is taken',
            suggestion: await uniqueSlugAsync(slug) });
          return;
        }
      } else {
        slug = await uniqueSlugAsync(slugify(title));
      }
      // the pre-save text stash (§9.7a v0.55): pasted text syncs against
      // this id while the founder is off following the mail — and since
      // Q462b it is also the reservation on the address: the slug is held
      // exactly as long as the stash lives, and take() releases it
      const pendingId = randomBytes(18).toString('base64url');
      const stashKey = sha256Hex(pendingId);
      await stash.open(stashKey, nowMs + 7 * 24 * 3600_000, slug);
      const token = await auth.mintToken(
        { kind: 'create', email, pending: { title, slug, email, isMember, stashKey } }, nowMs);
      const link = `${cfg.baseUrl}/auth/create?token=${token}`;
      await mailer.send({ to: email, ...MAILS.create(title, slug, link) });
      json(res, 200, { ok: true, slug, pendingId,
        ...(mailer.dev ? { devLink: link } : {}) });
      return;
    }

    /* text pasted before the save survives it (§9.7a v0.55) */
    if (req.method === 'POST' && path === '/api/docs/pending') {
      if (tooMany('pending', 120)) return;
      const body = await readJson(req);
      const pendingId = expectString(body, 'pendingId');
      const text = cap(expectString(body, 'text'), LIMITS.text, 'the text');
      if (!(await stash.update(sha256Hex(pendingId), text, nowMs))) {
        json(res, 404, { error: 'that draft has expired' });
        return;
      }
      json(res, 200, { ok: true });
      return;
    }

    /* magic links are GETs, and a GET must not consume a single-use
       token — mail scanners prefetch links and would burn them (stage 3,
       defect 6). The GET serves a page that POSTs the token on arrival
       (or on a click, without JavaScript); the POST is what consumes. */
    if (req.method === 'GET' &&
        (path === '/auth/create' || path === '/auth/login' || path === '/auth/apply')) {
      const token = url.searchParams.get('token') ?? '';
      if (token === '') { json(res, 400, { error: 'missing token' }); return; }
      // same-origin, overriding the global no-referrer (found on staging,
      // 2026-08-20): the fetch spec serializes a POST's Origin as *null*
      // when the submitting page's referrer policy is no-referrer, so the
      // interstitial's own form tripped the cross-site check — the two
      // stage-3 hardenings fighting each other. Same-origin keeps the
      // token-bearing Referer inside this origin and gives the POST a
      // real Origin to verify.
      res.setHeader('referrer-policy', 'same-origin');
      html(res, interstitial(path, token));
      return;
    }

    if (req.method === 'POST' && path === '/auth/create') {
      if (tooMany('auth', 60)) return;
      const rec = await auth.useToken(await readTokenBody(req), nowMs);
      if (!rec || rec.kind !== 'create' || !rec.pending) {
        json(res, 400, { error: 'that link has been used or has expired' });
        return;
      }
      const p = rec.pending;
      const slug = store.slugTaken(p.slug)
        ? uniqueSlug(p.title, (s) => store.slugTaken(s)) : p.slug;
      const id = `d-${randomBytes(5).toString('hex')}`;
      // on the chain (review #1, finding 9): the birth's persist must not
      // interleave with a first command's commit
      const doc = await commits.run(id, () => store.create(id, {
        title: p.title,
        slug,
        convenor: { id: 'founder', email: p.email, isMember: p.isMember },
      }, nowMs));
      // the pasted text is waiting in the saved document (§9.7a v0.55) —
      // waiting, not decided: confirming the starting text stays its own act
      if (p.stashKey !== undefined) {
        const text = await stash.take(p.stashKey, nowMs);
        if (text.length > 0) await store.setProvisional(doc, text);
      }
      await commit(doc, nowMs);
      // the operator hears about every birth (Ed, 2026-08-20) — fired and
      // forgotten: the save must never fail, or wait, on this mail
      if (cfg.notifyEmail !== null) {
        void mailer.send({ to: cfg.notifyEmail,
          ...MAILS.newDocument(p.title, `${cfg.baseUrl}/d/${slug}`, p.email) })
          .catch((e) => console.error('new-document notification failed:', e));
      }
      setCookie(res, id, auth.cookieFor(id, 'founder', nowMs), httpsOn);
      redirect(res, `/d/${slug}`);
      return;
    }

    /* -- login ----------------------------------------------------------- */
    if (req.method === 'POST' && seg[0] === 'api' && seg[1] === 'd' &&
        seg[3] === 'login' && seg.length === 4) {
      const doc = docOr404(store.bySlug(seg[2]!));
      if (!doc) return;
      if (tooMany('login')) return;
      const body = await readJson(req);
      const email = emailOk(expectString(body, 'email'));
      const memberId = memberIdByEmail(doc.cs, email);
      if (memberId === null) {
        // an unknown address is told nothing (the roster is not readable
        // from outside); the response is the same either way
        json(res, 200, { ok: true });
        return;
      }
      const token = await auth.mintToken(
        { kind: 'login', email, docId: doc.id, memberId }, nowMs);
      const link = `${cfg.baseUrl}/auth/login?token=${token}`;
      await mailer.send({ to: email, ...MAILS.login(doc.cs.titleOf, link) });
      json(res, 200, { ok: true, ...(mailer.dev ? { devLink: link } : {}) });
      return;
    }

    /* -- applicants (§9.7½): the email is the identity ------------------ */
    if (req.method === 'POST' && seg[0] === 'api' && seg[1] === 'd' &&
        seg[3] === 'apply' && seg.length === 4) {
      const doc = docOr404(store.bySlug(seg[2]!));
      if (!doc) return;
      if (tooMany('apply')) return;
      const body = await readJson(req);
      const email = emailOk(expectString(body, 'email'));
      // the same refusals the module makes at startApplication, made
      // read-only (stage 3, defect 8): an unauthenticated POST writes
      // nothing to the log — the write moved to POST /auth/apply, where
      // the address has proved it works
      const apps = doc.cs.settingState('applications').value as
        { joinPolicy?: 'invite' | 'proposed' | 'apply' | 'open' } | null;
      if ((apps?.joinPolicy ?? 'invite') === 'invite') {
        json(res, 400, { error: 'this document is invitation-only (§9.7½)' });
        return;
      }
      // the door must not be a membership oracle (review #1, finding 8):
      // the login route deliberately tells an unknown address nothing, so
      // this route must not tell a stranger who is a member. A member's
      // address gets a login mail and the same 200 as anybody; an
      // application already underway gets the same 200 and no new mail.
      const already = memberIdByEmail(doc.cs, email);
      if (already !== null) {
        const token = await auth.mintToken(
          { kind: 'login', email, docId: doc.id, memberId: already }, nowMs);
        const link = `${cfg.baseUrl}/auth/login?token=${token}`;
        await mailer.send({ to: email, ...MAILS.login(doc.cs.titleOf, link) });
        json(res, 200, { ok: true, ...(mailer.dev ? { devLink: link } : {}) });
        return;
      }
      // An application already underway re-sends the verification mail
      // (Q439(a), Ed 2026-08-20) carrying the seat that already exists.
      // Without it an applicant who lost their cookie was simply locked
      // out: the door says nothing (deliberately — it must not be an
      // oracle) and login says nothing either, since they are not a
      // member, so there was no door left to knock on. The mail is the
      // re-entry, and the response is the same plain 200 as every other
      // branch here, so nothing is disclosed by trying.
      const underway = [...doc.cs.applicantRecords().values()]
        .find((a) => a.email === email && a.status !== 'refused');
      if (underway !== undefined) {
        const token = await auth.mintToken(
          { kind: 'apply', email, docId: doc.id, applicantId: underway.id }, nowMs);
        const link = `${cfg.baseUrl}/auth/apply?token=${token}`;
        await mailer.send({ to: email, ...MAILS.applyVerify(doc.cs.titleOf, link) });
        json(res, 200, { ok: true, ...(mailer.dev ? { devLink: link } : {}) });
        return;
      }
      const token = await auth.mintToken({ kind: 'apply', email, docId: doc.id }, nowMs);
      const link = `${cfg.baseUrl}/auth/apply?token=${token}`;
      await mailer.send({ to: email,
        ...MAILS.applyVerify(doc.cs.titleOf, link) });
      json(res, 200, { ok: true, ...(mailer.dev ? { devLink: link } : {}) });
      return;
    }

    if (req.method === 'POST' && path === '/auth/apply') {
      if (tooMany('auth', 60)) return;
      const rec = await auth.useToken(await readTokenBody(req), nowMs);
      if (!rec || rec.kind !== 'apply' || rec.docId === undefined) {
        json(res, 400, { error: 'that link has been used or has expired' });
        return;
      }
      const doc = docOr404(store.byId(rec.docId));
      if (!doc) return;
      const t = tOf(doc.cs, nowMs);
      // the log's first applicant entry lands here, after the address has
      // proved it works (stage 3, defect 8); the module re-checks policy
      // and membership, so a world that changed since the mail refuses
      const applicantId = rec.applicantId ?? doc.cs.startApplication(t, rec.email);
      // a re-entry link (Q439(a)) lands on a seat that is already verified,
      // or has an application sitting with the room: there is nothing to
      // verify and nothing to write — the link's whole job is the cookie
      if (doc.cs.applicantRecords().get(applicantId)?.status === 'started') {
        doc.cs.verifyApplication(t, applicantId);
      }
      await commit(doc, nowMs);
      setCookie(res, doc.id, auth.cookieFor(doc.id, `app:${applicantId}`, nowMs), httpsOn);
      redirect(res, `/d/${doc.cs.slug}`);
      return;
    }

    if (req.method === 'POST' && path === '/auth/login') {
      if (tooMany('auth', 60)) return;
      const rec = await auth.useToken(await readTokenBody(req), nowMs);
      if (!rec || rec.kind !== 'login' || rec.docId === undefined ||
          rec.memberId === undefined) {
        json(res, 400, { error: 'that link has been used or has expired' });
        return;
      }
      const doc = docOr404(store.byId(rec.docId));
      if (!doc) return;
      const t = tOf(doc.cs, nowMs);
      const m = doc.cs.memberRecords().get(rec.memberId);
      // membership begins at first arrival (§9.6a); revival is logging in
      if (m && m.arrivedAtT === null) doc.cs.arrive(t, rec.memberId);
      else if (m && m.lapsed) doc.cs.memberReturn(t, rec.memberId);
      await commit(doc, nowMs);
      setCookie(res, doc.id, auth.cookieFor(doc.id, rec.memberId, nowMs), httpsOn);
      redirect(res, `/d/${doc.cs.slug}`);
      return;
    }

    /* -- the member surface (view is the only read, §3.5/NOTES) ---------- */
    if (seg[0] === 'api' && seg[1] === 'd' && seg.length === 4 &&
        (seg[3] === 'view' || seg[3] === 'cmd')) {
      const doc = docOr404(store.bySlug(seg[2]!));
      if (!doc) return;
      const session = cookieSession(req, doc.id);
      if (session === null) { json(res, 401, { error: 'log in first' }); return; }
      const { memberId, applicantId } = session;
      // a cookie is not a seat (review #1, finding 1): sessions are
      // stateless, so removal has to be checked here — otherwise a
      // removed or uninvited member's cookie is ninety days of full
      // member read under a constitution that says members only
      if (!seatAlive(doc.cs, memberId, applicantId)) {
        json(res, 401, { error: 'log in first' });
        return;
      }
      const isFounder = memberId === doc.cs.convenorRecord().id;
      if (req.method === 'GET' && seg[3] === 'view') {
        const seq = doc.cs.logEntries().length;
        // race cards ride the engine's own log, which judge-race moves
        // without touching the document log — freshness is both lengths
        const engineDoc = asEngineDoc(doc);
        const eseq = engineDoc.bridge === null ? 0 : engineDoc.bridge.engine.log.length;
        // the page polls (4s): when it says what it has seen and nothing
        // moved in either log, answer with the seqs alone and build no view
        if (url.searchParams.get('since') === seq + '.' + eseq) {
          json(res, 200, { seq, eseq });
          return;
        }
        // an applicant is served their own application and the document's
        // face — never the members' emails, the questions, or anybody's
        // answers (stage 3, defect 7)
        if (applicantId !== null) {
          const app = doc.cs.applicantRecords().get(applicantId) ?? null;
          // the text read follows the 🌍 setting (review #1, finding 12):
          // an applicant holds the link, so 'closed' — members only —
          // keeps the charter from them
          const chamber = doc.cs.settingState('chamber').value as
            { rung?: string } | null;
          const mayRead = chamber !== null && chamber.rung !== 'closed';
          json(res, 200, {
            me: memberId,
            isFounder: false,
            devMail: mailer.dev,
            applicant: app === null ? null : { id: app.id, status: app.status,
              name: app.name, picture: app.picture, words: app.words,
              motion: app.motion },
            title: doc.cs.titleOf,
            slug: doc.cs.slug,
            constitutedAtT: doc.cs.constitutedAtT,
            seq,
            eseq,
            serverNowMs: nowMs,
            textConfirmed: doc.cs.textConfirmed,
            text: mayRead ? raceView(doc, memberId, nowMs).text : null,
            raceCards: [],
            wallet: null,
          });
          return;
        }
        json(res, 200, {
          me: memberId,
          isFounder,
          devMail: mailer.dev,
          title: doc.cs.titleOf,
          slug: doc.cs.slug,
          constitutedAtT: doc.cs.constitutedAtT,
          seq,
          eseq,
          // the session-clock counts against the server's clock, not the
          // browser's (Q466); the page offsets by the time it received this
          serverNowMs: nowMs,
          textConfirmed: doc.cs.textConfirmed,
          quorumForm: doc.cs.quorumForm,
          electorateSize: doc.cs.motionElectorate().length,
          membershipReserved: doc.cs.membershipReserved(),
          crowned: doc.cs.crowned(),
          convenor: { id: doc.cs.convenorRecord().id,
            isMember: doc.cs.convenorRecord().isMember,
            email: doc.cs.convenorRecord().email,
            name: doc.cs.convenorRecord().name,
            picture: doc.cs.convenorRecord().picture },
          // the unconfirmed starting text (§9.7a v0.55): readable by any
          // member — the charter is what the founding questions are about
          provisionalText: doc.cs.textConfirmed ? null : doc.provisional,
          ...raceView(doc, memberId, nowMs),
          view: view(doc.cs, memberId),
        });
        return;
      }
      if (req.method === 'POST' && seg[3] === 'cmd') {
        const body = await readJson(req);
        const cmd = expectString(body, 'cmd');
        const args = (body.args ?? {}) as Record<string, unknown>;
        const t = tOf(doc.cs, nowMs);
        // an applicant's one act: submit — nothing else speaks for them
        if (applicantId !== null && cmd !== 'submit-application') {
          json(res, 403, { error: 'applicants may only submit their application' });
          return;
        }
        const me = doc.cs.memberRecords().get(memberId);
        if (me?.lapsed) doc.cs.memberReturn(t, memberId); // any act revives
        let result: unknown;
        try {
          result = runCommand(doc.cs, { memberId, isFounder, applicantId },
            t, cmd, args, asEngineDoc(doc).bridge);
        } catch (e) {
          // whatever the module emitted before the refusal — a revival, a
          // motion whose engine race then refused — is real, and must not
          // sit in memory waiting to ride an unrelated commit (review #1,
          // finding 6): memory and disk never diverge, even on a 400
          await commit(doc, nowMs);
          throw e;
        }
        // confirming the starting text supersedes the provisional draft
        if (doc.cs.textConfirmed && doc.provisional !== null) {
          await store.setProvisional(doc, null);
        }
        const seq = await commit(doc, nowMs);
        json(res, 200, { ok: true, seq, ...(result !== undefined ? { result } : {}) });
        return;
      }
    }

    /* the founder's draft text after the save, before the confirm (§9.7a) */
    if (req.method === 'POST' && seg[0] === 'api' && seg[1] === 'd' &&
        seg[3] === 'stash' && seg.length === 4) {
      const doc = docOr404(store.bySlug(seg[2]!));
      if (!doc) return;
      const session = cookieSession(req, doc.id);
      if (session === null) { json(res, 401, { error: 'log in first' }); return; }
      if (session.memberId !== doc.cs.convenorRecord().id) {
        json(res, 403, { error: 'only the founder holds the starting text' });
        return;
      }
      if (doc.cs.textConfirmed) {
        json(res, 400, { error: 'the starting text is decided — changes are proposed in the document' });
        return;
      }
      const body = await readJson(req);
      await store.setProvisional(doc,
        cap(expectString(body, 'text'), LIMITS.text, 'the text'));
      json(res, 200, { ok: true });
      return;
    }

    /* -- the surface ------------------------------------------------------ */
    // the page references its assets relatively (fixture mode serves them
    // from one directory), so they resolve to /x.js at the root and to
    // /d/x.js under a document — serve both from the design dir. Basename
    // only: no separators survive seg splitting, so no traversal.
    const last = seg.length > 0 ? seg[seg.length - 1]! : '';
    if (req.method === 'GET' && /\.(js|css|svg|png|woff2?)$/.test(last) &&
        (seg.length === 1 || (seg[0] === 'd' && seg.length === 2))) {
      serveFile(res, join(cfg.designDir, last));
      return;
    }
    if (req.method === 'GET' && seg[0] === 'd' && seg.length === 2) {
      if (docOr404(store.bySlug(seg[1]!)) === null) return;
      serveFile(res, join(cfg.designDir, 'session-view.html'));
      return;
    }
    if (req.method === 'GET' && seg[0] === 'design') {
      const rel = normalize(seg.slice(1).join('/'));
      // Assets only, and only the ones at the top of the tree: design/
      // also holds notes, the byte-frozen reference copies and the probe
      // tooling, none of which is this server's to serve. The filter was
      // by extension alone until staging showed the comment was untrue —
      // design/tools/session-probe.js and the whole of design/reference
      // answered 200 (Q478, fixed 2026-08-20). No separator survives, so
      // this is also a second lock on traversal.
      if (rel.includes('/') || rel.includes('\\') || rel.startsWith('..') ||
          rel.includes('..') || !/\.(js|css|svg|png|woff2?)$/.test(rel)) {
        json(res, 404, { error: 'not found' });
        return;
      }
      serveFile(res, join(cfg.designDir, rel));
      return;
    }
    if (req.method === 'GET' && path === '/') {
      // arriving at docs.vote presents a brand-new unsaved document (§9.7a)
      serveFile(res, join(cfg.designDir, 'session-view.html'));
      return;
    }

    json(res, 404, { error: 'not found' });
  }

  /** The actor's kind is parsed here, once: an `app:` seat is an applicant. */
  function cookieSession(req: IncomingMessage, docId: string):
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
      server.closeAllConnections();
      await closed;
      await persistence.close?.();
    })();
    return closing;
  };

  return { server, store, auth, mailer, tick, close };
}

/* -------------------------------------------------------------------------- */

/** The magic-link interstitial (stage 3, defect 6) — deliberately off the
 *  design system, like the mail it came from: it exists for milliseconds. */
function interstitial(action: string, token: string): string {
  const e = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  return '<!doctype html><meta charset="utf-8"><title>docs.vote</title>' +
    '<body style="font-family: system-ui, sans-serif; padding: 2rem">' +
    '<form method="post" action="' + e(action) + '">' +
    '<input type="hidden" name="token" value="' + e(token) + '">' +
    '<noscript><button type="submit">Continue</button></noscript></form>' +
    '<script>document.forms[0].submit()</script>';
}

/** The token from an interstitial form (urlencoded) or a JSON body. */
async function readTokenBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > 10_000) throw new Error('request too large');
    chunks.push(chunk as Buffer);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  const ct = req.headers['content-type'] ?? '';
  if (ct.includes('application/json')) {
    return String((JSON.parse(text) as { token?: unknown }).token ?? '');
  }
  return new URLSearchParams(text).get('token') ?? '';
}

function html(res: ServerResponse, body: string): void {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(body);
}

function memberIdByEmail(cs: ConstitutionSession, email: string): string | null {
  // case-blind (review #1, finding 18): older logs hold addresses as they
  // were typed, and an invitee who capitalizes differently at login must
  // not get the silent-nothing response forever
  const want = email.toLowerCase();
  for (const m of cs.memberRecords().values()) {
    if (!m.removed && m.email.toLowerCase() === want) return m.id;
  }
  return cs.convenorRecord().email.toLowerCase() === want
    ? cs.convenorRecord().id : null;
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  // a cross-origin form cannot send application/json without a preflight,
  // so this plus SameSite=Lax is the CSRF story until tokens are needed
  const ct = req.headers['content-type'] ?? '';
  if (!ct.includes('application/json')) {
    throw new Error('content-type must be application/json');
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > 1_000_000) throw new Error('request too large');
    chunks.push(chunk as Buffer);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  if (text.length === 0) return {};
  const parsed: unknown = JSON.parse(text);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('body must be a JSON object');
  }
  return parsed as Record<string, unknown>;
}

/** commands.ts's `str`, with the wire's stricter no-empty rule. */
function expectString(body: Record<string, unknown>, key: string): string {
  return str(body, key, false);
}

function ipOf(req: IncomingMessage, cfg: ServerConfig): string {
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

function json(res: ServerResponse, code: number, payload: unknown): void {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function redirect(res: ServerResponse, to: string): void {
  res.writeHead(302, { location: to });
  res.end();
}

function setCookie(res: ServerResponse, docId: string, value: string, secure: boolean): void {
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
};

function serveFile(res: ServerResponse, filePath: string): void {
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

/** A cookie names a seat; this says whether the seat still exists
 *  (review #1, finding 1). The convenor always does; a member must be
 *  unremoved; an applicant must still be on the applicant list. */
function seatAlive(cs: ConstitutionSession, memberId: string,
  applicantId: string | null): boolean {
  if (applicantId !== null) return cs.applicantRecords().has(applicantId);
  if (memberId === cs.convenorRecord().id) return true;
  const m = cs.memberRecords().get(memberId);
  return m !== undefined && !m.removed;
}
