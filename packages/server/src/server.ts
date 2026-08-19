/**
 * The thin server (Q368): node:http, no framework. Documents are
 * ConstitutionSessions persisted as their own hash-chained logs; identity
 * is an emailed magic link; the cookie is the only actor any command ever
 * gets; view() is the only read a member is ever served. Mail rides the
 * event log — invitations, lapse warnings and the lapse package are sent
 * by watching what the fold emitted, so a host renders notifications and
 * never invents them.
 */
import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { randomBytes } from 'node:crypto';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { ConstitutionSession, sha256Hex, view } from '../../constitution/src/index.js';
import type { LogEntry, TextValue } from '../../constitution/src/index.js';
import { Auth } from './auth.js';
import type { ServerConfig } from './config.js';
import { DocStore, uniqueSlug } from './store.js';
import type { LoadedDoc } from './store.js';
import { Stash } from './stash.js';
import { MAILS, makeMailer } from './mailer.js';
import { asEngineDoc, driveBridge, resumeBridge } from './engine-host.js';
import { ParticipantApi } from '../../engine-core/src/participant-api.js';
import type { Mail, Mailer } from './mailer.js';
import { runCommand } from './commands.js';

const COOKIE = 'draft_session';

export interface DraftServer {
  server: Server;
  store: DocStore;
  auth: Auth;
  mailer: Mailer;
  /** Drive the clocks (§9.5/§9.5a): call periodically; safe to call any time. */
  tick(nowMs?: number): void;
}

export function createDraftServer(cfg: ServerConfig): DraftServer {
  const store = new DocStore(cfg.dataDir);
  store.loadAll();
  const docsDir = join(cfg.dataDir, 'docs');
  for (const doc of store.all()) resumeBridge(docsDir, doc);
  const auth = new Auth(cfg.secret, cfg.dataDir);
  const mailer = makeMailer(cfg);
  const stash = new Stash(cfg.dataDir);

  const titleOf = (cs: ConstitutionSession): string =>
    (cs.settingState('title').value as TextValue | null)?.text ?? 'Untitled';

  const currentSlug = (cs: ConstitutionSession): string =>
    cs.slugs[cs.slugs.length - 1]!;

  /** Non-decreasing time per document (the module requires it). */
  const tOf = (cs: ConstitutionSession, nowMs: number): number => {
    const log = cs.logEntries();
    const last = log.length > 0 ? log[log.length - 1]!.event.t : 0;
    return Math.max(nowMs, last);
  };

  /** Mail follows the fold: relay what freshly-persisted events imply. */
  const relay = (doc: LoadedDoc, fresh: readonly LogEntry[], nowMs: number): void => {
    const cs = doc.cs;
    const title = titleOf(cs);
    const loginLink = (memberId: string, email: string): string => {
      const token = auth.mintToken(
        { kind: 'login', email, docId: doc.id, memberId }, nowMs);
      return `${cfg.baseUrl}/auth/login?token=${token}`;
    };
    const queue: Mail[] = [];
    for (const { event } of fresh) {
      if (event.type === 'member-invited') {
        queue.push({ to: event.email,
          ...MAILS.invite(title, loginLink(event.member, event.email)) });
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
    for (const mail of queue) void mailer.send(mail).catch((e) => {
      console.error(`mail to ${mail.to} failed:`, e);
    });
  };

  const commit = (doc: LoadedDoc, nowMs: number): number => {
    // the engine rides every commit (Q391): born at constitute, synced with
    // roster truth and ground shifts, closed when the ending passes
    driveBridge(docsDir, doc, tOf(doc.cs, nowMs));
    const fresh = store.persist(doc);
    if (fresh.length > 0) relay(doc, fresh, nowMs);
    return doc.cs.logEntries().length;
  };

  /** The member's race cards and wallet (Q391) — empty until races run. */
  const raceView = (doc: LoadedDoc, memberId: string, nowMs: number):
    { raceCards: unknown[]; wallet: number | null } => {
    const ed = asEngineDoc(doc);
    if (ed.bridge === null || ed.bridge.engine.closed) {
      return { raceCards: [], wallet: null };
    }
    try {
      const t = tOf(doc.cs, nowMs);
      const api = new ParticipantApi(ed.bridge.engine, memberId);
      return {
        raceCards: api.nextCards(3, t),
        wallet: ed.bridge.engine.balance(memberId, t),
      };
    } catch {
      return { raceCards: [], wallet: null }; // a clerk, or a seat out of E
    }
  };

  const tick = (nowMs: number = Date.now()): void => {
    for (const doc of store.all()) {
      if (doc.cs.constitutedAtT === null) continue;
      doc.cs.tick(tOf(doc.cs, nowMs));
      commit(doc, nowMs);
    }
  };

  const server = createServer((req, res) => {
    void route(req, res).catch((e: unknown) => {
      const message = e instanceof Error ? e.message : String(e);
      if (!res.headersSent) json(res, 400, { error: message });
    });
  });

  async function route(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const nowMs = Date.now();
    const url = new URL(req.url ?? '/', cfg.baseUrl);
    const path = url.pathname;
    const seg = path.split('/').filter((s) => s.length > 0);

    /* -- creation (§9.7a: the mail is the save) -------------------------- */
    if (req.method === 'POST' && path === '/api/docs') {
      const body = await readJson(req);
      const title = expectString(body, 'title');
      const email = expectString(body, 'email');
      const isMember = body.isMember !== false;
      const slug = uniqueSlug(title, (s) => store.slugTaken(s));
      // the pre-save text stash (§9.7a v0.55): pasted text syncs against
      // this id while the founder is off following the mail
      const pendingId = randomBytes(18).toString('base64url');
      const stashKey = sha256Hex(pendingId);
      stash.open(stashKey, nowMs + 7 * 24 * 3600_000);
      const token = auth.mintToken(
        { kind: 'create', email, pending: { title, slug, email, isMember, stashKey } }, nowMs);
      const link = `${cfg.baseUrl}/auth/create?token=${token}`;
      await mailer.send({ to: email, ...MAILS.create(title, link) });
      json(res, 200, { ok: true, slug, pendingId,
        ...(mailer.dev ? { devLink: link } : {}) });
      return;
    }

    /* text pasted before the save survives it (§9.7a v0.55) */
    if (req.method === 'POST' && path === '/api/docs/pending') {
      const body = await readJson(req);
      const pendingId = expectString(body, 'pendingId');
      const text = expectString(body, 'text');
      if (!stash.update(sha256Hex(pendingId), text, nowMs)) {
        json(res, 404, { error: 'that draft has expired' });
        return;
      }
      json(res, 200, { ok: true });
      return;
    }

    if (req.method === 'GET' && path === '/auth/create') {
      const rec = auth.useToken(url.searchParams.get('token') ?? '', nowMs);
      if (!rec || rec.kind !== 'create' || !rec.pending) {
        json(res, 400, { error: 'that link has been used or has expired' });
        return;
      }
      const p = rec.pending;
      const slug = store.slugTaken(p.slug)
        ? uniqueSlug(p.title, (s) => store.slugTaken(s)) : p.slug;
      const id = `d-${randomBytes(5).toString('hex')}`;
      const doc = store.create(id, {
        title: p.title,
        slug,
        convenor: { id: 'founder', email: p.email, isMember: p.isMember },
      }, nowMs);
      // the pasted text is waiting in the saved document (§9.7a v0.55) —
      // waiting, not decided: confirming the starting text stays its own act
      if (p.stashKey !== undefined) {
        const text = stash.take(p.stashKey, nowMs);
        if (text.length > 0) store.setProvisional(doc, text);
      }
      commit(doc, nowMs);
      setCookie(res, auth.cookieFor(id, 'founder', nowMs));
      redirect(res, `/d/${slug}`);
      return;
    }

    /* -- login ----------------------------------------------------------- */
    if (req.method === 'POST' && seg[0] === 'api' && seg[1] === 'd' &&
        seg[3] === 'login' && seg.length === 4) {
      const doc = store.bySlug(seg[2]!);
      if (!doc) { json(res, 404, { error: 'no such document' }); return; }
      const body = await readJson(req);
      const email = expectString(body, 'email');
      const memberId = memberIdByEmail(doc.cs, email);
      if (memberId === null) {
        // an unknown address is told nothing (the roster is not readable
        // from outside); the response is the same either way
        json(res, 200, { ok: true });
        return;
      }
      const token = auth.mintToken(
        { kind: 'login', email, docId: doc.id, memberId }, nowMs);
      const link = `${cfg.baseUrl}/auth/login?token=${token}`;
      await mailer.send({ to: email, ...MAILS.login(titleOf(doc.cs), link) });
      json(res, 200, { ok: true, ...(mailer.dev ? { devLink: link } : {}) });
      return;
    }

    if (req.method === 'GET' && path === '/auth/login') {
      const rec = auth.useToken(url.searchParams.get('token') ?? '', nowMs);
      if (!rec || rec.kind !== 'login' || rec.docId === undefined ||
          rec.memberId === undefined) {
        json(res, 400, { error: 'that link has been used or has expired' });
        return;
      }
      const doc = store.byId(rec.docId);
      if (!doc) { json(res, 404, { error: 'no such document' }); return; }
      const t = tOf(doc.cs, nowMs);
      const m = doc.cs.memberRecords().get(rec.memberId);
      // membership begins at first arrival (§9.6a); revival is logging in
      if (m && m.arrivedAtT === null) doc.cs.arrive(t, rec.memberId);
      else if (m && m.lapsed) doc.cs.memberReturn(t, rec.memberId);
      commit(doc, nowMs);
      setCookie(res, auth.cookieFor(doc.id, rec.memberId, nowMs));
      redirect(res, `/d/${currentSlug(doc.cs)}`);
      return;
    }

    /* -- the member surface (view is the only read, §3.5/NOTES) ---------- */
    if (seg[0] === 'api' && seg[1] === 'd' && seg.length === 4 &&
        (seg[3] === 'view' || seg[3] === 'cmd')) {
      const doc = store.bySlug(seg[2]!);
      if (!doc) { json(res, 404, { error: 'no such document' }); return; }
      const session = cookieSession(req, doc.id);
      if (session === null) { json(res, 401, { error: 'log in first' }); return; }
      const { memberId } = session;
      const isFounder = memberId === doc.cs.convenorRecord().id;
      if (req.method === 'GET' && seg[3] === 'view') {
        json(res, 200, {
          me: memberId,
          isFounder,
          title: titleOf(doc.cs),
          slug: currentSlug(doc.cs),
          constitutedAtT: doc.cs.constitutedAtT,
          seq: doc.cs.logEntries().length,
          textConfirmed: doc.cs.textConfirmed,
          text: doc.cs.text,
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
        const me = doc.cs.memberRecords().get(memberId);
        if (me?.lapsed) doc.cs.memberReturn(t, memberId); // any act revives
        const result = runCommand(doc.cs, { memberId, isFounder }, t, cmd, args,
          asEngineDoc(doc).bridge);
        // confirming the starting text supersedes the provisional draft
        if (doc.cs.textConfirmed && doc.provisional !== null) {
          store.setProvisional(doc, null);
        }
        const seq = commit(doc, nowMs);
        json(res, 200, { ok: true, seq, ...(result !== undefined ? { result } : {}) });
        return;
      }
    }

    /* the founder's draft text after the save, before the confirm (§9.7a) */
    if (req.method === 'POST' && seg[0] === 'api' && seg[1] === 'd' &&
        seg[3] === 'stash' && seg.length === 4) {
      const doc = store.bySlug(seg[2]!);
      if (!doc) { json(res, 404, { error: 'no such document' }); return; }
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
      store.setProvisional(doc, expectString(body, 'text'));
      json(res, 200, { ok: true });
      return;
    }

    /* -- the surface ------------------------------------------------------ */
    if (req.method === 'GET' && seg[0] === 'd' && seg.length === 2) {
      if (store.bySlug(seg[1]!) === null) {
        json(res, 404, { error: 'no such document' });
        return;
      }
      serveFile(res, join(cfg.designDir, 'setup.html'));
      return;
    }
    if (req.method === 'GET' && seg[0] === 'design') {
      const rel = normalize(seg.slice(1).join('/'));
      if (rel.startsWith('..') || rel.includes('..')) {
        json(res, 404, { error: 'not found' });
        return;
      }
      serveFile(res, join(cfg.designDir, rel));
      return;
    }
    if (req.method === 'GET' && path === '/') {
      // arriving at docs.vote presents a brand-new unsaved document (§9.7a)
      serveFile(res, join(cfg.designDir, 'setup.html'));
      return;
    }

    json(res, 404, { error: 'not found' });
  }

  function cookieSession(req: IncomingMessage, docId: string):
    { memberId: string } | null {
    const header = req.headers.cookie ?? '';
    const pair = header.split(';').map((s) => s.trim())
      .find((s) => s.startsWith(`${COOKIE}=`));
    if (!pair) return null;
    const parsed = auth.verifyCookie(pair.slice(COOKIE.length + 1), Date.now());
    if (parsed === null || parsed.docId !== docId) return null;
    return { memberId: parsed.memberId };
  }

  return { server, store, auth, mailer, tick };
}

/* -------------------------------------------------------------------------- */

function memberIdByEmail(cs: ConstitutionSession, email: string): string | null {
  for (const m of cs.memberRecords().values()) {
    if (!m.removed && m.email === email) return m.id;
  }
  return cs.convenorRecord().email === email ? cs.convenorRecord().id : null;
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
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

function expectString(body: Record<string, unknown>, key: string): string {
  const v = body[key];
  if (typeof v !== 'string' || v.length === 0) {
    throw new Error(`'${key}' must be a non-empty string`);
  }
  return v;
}

function json(res: ServerResponse, code: number, payload: unknown): void {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function redirect(res: ServerResponse, to: string): void {
  res.writeHead(302, { location: to });
  res.end();
}

function setCookie(res: ServerResponse, value: string): void {
  res.setHeader('set-cookie',
    `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${90 * 24 * 3600}`);
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
  res.writeHead(200, {
    'content-type': MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream',
  });
  createReadStream(filePath).pipe(res);
}
