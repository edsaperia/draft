/**
 * **The 🪶 documents menu** (issue #227, Q1603, Ed 2026-10-22): the 🪶 at the
 * top left lists the documents this browser is signed into, and mails a
 * login link for each document an address is a member of. Two rows.
 *
 * **The list is the server's, because the cookies are.** Each document keeps
 * its own HttpOnly cookie (`cookieName`), `Path=/`, so a request to any path
 * carries every one of them and the page can read none. `GET /api/mine`
 * verifies each, opens only the documents a cookie names, and answers only
 * what a row draws: the address, the title, *Closed*, and the face this
 * browser wears there. A cookie whose seat is gone — resigned, removed,
 * lapsed, an applicant's, a document that no longer exists — names nothing.
 *
 * **The mail finds an address without loading every document** (the issue's
 * *What to watch*): `documentsWithEmail` reads the stored `people` rows, an
 * index on `lower(email)` in Postgres, and only the documents it names are
 * opened, to ask the roster what the login door asks (`memberIdByEmail`).
 * It answers before it looks, so a known address and an unknown one get the
 * same words in the same time; and it shares the login door's two buckets,
 * since it is the same mail.
 */
import { magicLink } from './auth.js';
import { emailOk } from './commands.js';
import { MAILS } from './mailer.js';
import { memberIdByEmail } from './routes-auth.js';
import { cookieName, expectString, json, rateLimited, readJson } from './routes.js';
import type { Route, RouteContext } from './routes.js';
import type { LoadedDoc } from './store.js';

/** One row of the menu: everything it draws, and nothing it does not. */
export interface MineRow {
  slug: string;
  title: string;
  closed: boolean;
  /** this browser's face in the document, as `avHtml` reads a person */
  name: string | null;
  picture: string | null;
  /** when this browser last signed in there — the order, newest first */
  signedMs: number;
}

/** The cookie name's own document id, or null for anything else. */
const PREFIX = 'draft_session_';

/** The seat a verified cookie names, while it is still a membership. */
function rowOf(doc: LoadedDoc, memberId: string, signedMs: number): MineRow | null {
  const cs = doc.cs;
  const convenor = cs.convenorRecord();
  const m = cs.memberRecords().get(memberId);
  // a clerk is a seat with no member row; everybody else is their row, and
  // a row that has left — resigned, removed, lapsed — is not listed
  if (!m && memberId !== convenor.id) return null;
  if (m && (m.removed || m.lapsed || m.arrivedAtT === null)) return null;
  const who = m ?? convenor;
  const erased = m ? m.erased : false;
  return {
    slug: cs.slug,
    title: cs.titleOf,
    closed: cs.closed,
    name: erased ? null : who.name ?? null,
    picture: erased ? null : who.picture ?? null,
    signedMs,
  };
}

/** Every document this request's cookies sign into, newest sign-in first. */
async function mine(ctx: RouteContext, cookieHeader: string, nowMs: number): Promise<MineRow[]> {
  const seen = new Map<string, MineRow>();
  for (const pair of cookieHeader.split(';').map((s) => s.trim())) {
    const at = pair.indexOf('=');
    if (at < 0) continue;
    const name = pair.slice(0, at);
    if (!name.startsWith(PREFIX) && name !== 'draft_session') continue;
    const parsed = ctx.auth.verifyCookie(pair.slice(at + 1), nowMs);
    if (parsed === null) continue;
    // a cookie speaks for the document its name says, and no other — the
    // legacy name for its own document alone, as `cookieSession` reads it
    if (name !== 'draft_session' && cookieName(parsed.docId) !== name) continue;
    if (seen.has(parsed.docId) || parsed.memberId.startsWith('app:')) continue;
    const doc = await ctx.store.open(parsed.docId);
    if (doc === null) continue;
    const row = rowOf(doc, parsed.memberId, parsed.signedMs);
    if (row !== null) seen.set(parsed.docId, row);
  }
  return [...seen.values()].sort((a, b) => b.signedMs - a.signedMs);
}

/**
 * The mail itself, after the answer has gone: every document holding the
 * address, minus the ephemeral demo (DEMO.md D3) and anybody who has left,
 * one login link each, in one mail. Nothing at all where nothing matched.
 */
async function mailLinks(ctx: RouteContext, email: string, nowMs: number): Promise<void> {
  const { cfg, store, auth, writes } = ctx;
  const found: Array<{ title: string; slug: string; link: string; token: string }> = [];
  for (const id of await ctx.persistence.documentsWithEmail(email)) {
    const doc = await store.open(id);
    if (doc === null || doc.ephemeral === true) continue;
    const memberId = memberIdByEmail(doc.cs, email);
    if (memberId === null) continue;
    const token = auth.mintDeferred({ kind: 'login', email, docId: doc.id, memberId }, nowMs);
    found.push({ title: doc.cs.titleOf, slug: doc.cs.slug,
      link: magicLink(cfg.baseUrl, 'login', token, doc.cs.slug), token });
  }
  if (found.length === 0) return;
  await auth.flush(nowMs);
  const mail = { to: email, ...MAILS.links(found) };
  // the mail belongs to no one document, so it is sent as the creation mail
  // is, and queued on a refusal rather than thrown: nobody is waiting on it
  try {
    await writes.sendNow(mail, null);
  } catch {
    await ctx.outbox.enqueue([{ ...mail, documentId: null }], nowMs);
    ctx.outbox.kick(nowMs);
  }
}

export const mineTable: Route[] = [
  {
    name: 'GET /api/mine — the documents this browser is signed into',
    method: 'GET',
    match: '/api/mine',
    handler: async (ctx, r) => {
      json(r.res, 200, { docs: await mine(ctx, r.req.headers.cookie ?? '', r.nowMs) });
      return true;
    },
  },
  {
    name: 'POST /api/mine/links — email me a link to each',
    method: 'POST',
    match: '/api/mine/links',
    handler: async (ctx, r) => {
      const { req, res, nowMs } = r;
      // the login door's own two buckets (Q1341, issue #69): this is the same
      // mail, so it spends from the same allowance — per IP, and per address
      // before anything is looked up, so the refusal says nothing either
      if (r.tooMany('login', 200)) return true;
      const body = await readJson(req);
      const email = emailOk(expectString(body, 'email'));
      if (rateLimited(`login-email:${email}`, nowMs, 10)) {
        json(res, 429, { error: 'too many requests — try again shortly' });
        return true;
      }
      // **the same answer, before the lookup** (Q1603): whether the address
      // is on anything is told to its inbox and to nobody else, so the
      // response neither says nor takes longer for it
      json(res, 200, { ok: true });
      mailLinks(ctx, email, nowMs).catch((e: unknown) => {
        console.error('documents mail failed:', e);
      });
      return true;
    },
  },
];
