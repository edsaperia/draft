/**
 * **Ed's demo controls** (design/DEMO.md Stage 2; Q1535): the key, the
 * panel's readout, Reset and the seat switch — rows that **ship**, the one
 * sanctioned exception to decision 437 (DEMO.md §0.2), and narrow in the
 * ways that argument needs, each enforced here and never by the page:
 *
 *  - **only one document**: every row acts on `demoDoc(ctx)` and takes no
 *    document id or slug from the request;
 *  - **only with the key**: `DRAFT_DEMO_KEY` unset, every `/api/demo/*` row
 *    answers an unknown path's 404 and `?demokey=` is ignored; set, a row
 *    without a valid `draft_demo` cookie meets the limiter and a 401;
 *  - **nothing it reaches is real**: the demo document is ephemeral and
 *    mails nobody (D1, D3), so the worst a leaked key does is reset the demo
 *    and sit in its seats.
 *
 * Spliced into the route table before the static rows, so `/d/demo?demokey=`
 * is claimed ahead of the page; without the query the row declines and the
 * page serves as ever.
 *
 * **One row is public** (Stage 3): `POST /api/demo/join`, the stranger's
 * 👋 *Try it*, which needs no key — anybody who opens the demo may join it —
 * and is narrow in the same first way: it acts on the demo document alone,
 * takes no id or slug, and answers an unknown path's 404 wherever there is no
 * demo document.
 */
import { DEMO_COOKIE, DEMO_COOKIE_MS, demoCrossSite, demoDoc, demoKeyMatches, demoLocked, demoRefused,
  guessFailed, guessLocked, mintDemoCookie } from './demo-access.js';
import { cookieSession, ipOf, json, readJson, redirect, setCookie } from './routes.js';
import type { Req, Route, RouteContext } from './routes.js';

/**
 * **The one gate** (`demoRefused`, demo-access.ts): the rows here and the
 * bots' rows (`routes-demo-bots.ts`) ask the same function, so there is one
 * cookie format, one guess lock and one place the door can be wrong.
 */
const refused = demoRefused;
const locked = demoLocked;
const crossSite = demoCrossSite;

/** What the panel draws: the generation, the seats, and whose seat this browser sits in. */
function panelOf(ctx: RouteContext, r: Req): Record<string, unknown> {
  const doc = demoDoc(ctx);
  const me = doc === null ? null : cookieSession(ctx.auth, r.req, doc.id)?.memberId ?? null;
  return {
    ...ctx.demo.status(),
    seats: ctx.demo.seats(),
    me,
    // the QR modal's one address (Stage 3): the host's own, so production
    // encodes exactly https://docs.vote/d/demo?try=1 whatever the tab's origin
    joinUrl: `${ctx.cfg.baseUrl.replace(/\/+$/, '')}/d/demo?try=1`,
    visitors: ctx.demo.visitorCount(),
    errors: ctx.demo.lastErrors,
    // the bots' readout (Stages 4–5): the same object `GET /api/demo/bots` serves
    bots: ctx.demoBots.stats(),
  };
}

/**
 * **The join's brake, per address** (DEMO.md §9, 1535 (c)): not a member cap
 * — Ed ruled there is none — but a brake on a script. A room of phones on one
 * venue Wi-Fi shares one address, so it is generous: 120 joins in ten
 * minutes, four times the plan's first figure, since a rejoin spends one too.
 */
export const JOIN_PER_IP = 120;

export const demoTable: Route[] = [
  {
    name: 'POST /api/demo/join — a visitor\'s one-tap seat (DEMO.md Stage 3)',
    method: 'POST',
    match: '/api/demo/join',
    handler: async (ctx, r) => {
      const doc = demoDoc(ctx);
      // no demo document on this host: an unknown path, as every demo row
      if (doc === null) { json(r.res, 404, { error: 'not found' }); return true; }
      if (crossSite(r)) return true;
      if (r.tooMany('demo-join', JOIN_PER_IP)) return true;
      await readJson(r.req);
      if (doc.cs.closed) { json(r.res, 409, { error: 'the demo document has closed' }); return true; }
      // **one seat per device** (Q1535): the member cookie this browser holds
      // for this generation, if any, is its seat — an applicant's never is
      const session = cookieSession(ctx.auth, r.req, doc.id);
      const seated = session !== null && session.applicantId === null ? session.memberId : null;
      const out = await ctx.demo.join(r.nowMs, seated);
      if (!out.rejoined) {
        setCookie(r.res, doc.id, ctx.auth.cookieFor(doc.id, out.member, r.nowMs), ctx.httpsOn);
      }
      json(r.res, 200, out);
      return true;
    },
  },
  {
    name: 'GET /d/demo?demokey= — Ed sets his browser once',
    method: 'GET',
    match: ({ path, url }) => path === '/d/demo' && url.searchParams.has('demokey'),
    handler: (ctx, r) => {
      const key = ctx.cfg.demoKey;
      if (!key) return false; // no key configured: the page, as ever
      const ip = ipOf(r.req, ctx.cfg);
      // a locked-out address is refused before its key is even compared
      if (guessLocked(ip, r.nowMs)) { locked(r); return true; }
      const given = r.url.searchParams.get('demokey') ?? '';
      if (!demoKeyMatches(given, key)) {
        // a wrong key sets nothing and says nothing but the redirect — until
        // the fifth in a minute, which locks the address (Ed, 2026-09-24)
        guessFailed(ip, r.nowMs);
        if (guessLocked(ip, r.nowMs)) { locked(r); return true; }
        redirect(r.res, '/d/demo');
        return true;
      }
      r.res.setHeader('set-cookie',
        `${DEMO_COOKIE}=${mintDemoCookie(key, r.nowMs)}; Path=/; HttpOnly; SameSite=Strict` +
        `${ctx.httpsOn ? '; Secure' : ''}; Max-Age=${Math.floor(DEMO_COOKIE_MS / 1000)}`);
      redirect(r.res, '/d/demo');
      return true;
    },
  },
  {
    name: 'GET /api/demo/panel',
    method: 'GET',
    match: '/api/demo/panel',
    handler: (ctx, r) => {
      if (refused(ctx, r)) return true;
      json(r.res, 200, panelOf(ctx, r));
      return true;
    },
  },
  {
    name: 'POST /api/demo/reset — a new generation from the preset, read afresh',
    method: 'POST',
    match: '/api/demo/reset',
    handler: async (ctx, r) => {
      if (refused(ctx, r)) return true;
      if (crossSite(r)) return true;
      await readJson(r.req);
      // the bots stop first (DEMO.md Stage 4): a reset is the end of their
      // room, and a stopped run is not resumed onto the new generation
      ctx.demoBots.stop('reset');
      const out = await ctx.demo.rebuild(r.nowMs);
      if (!out.ok) { json(r.res, 422, { error: 'the preset did not build', errors: out.errors }); return true; }
      json(r.res, 200, panelOf(ctx, r));
      return true;
    },
  },
  {
    name: 'POST /api/demo/seat — Ed sits in the Founder\'s seat or a member\'s',
    method: 'POST',
    match: '/api/demo/seat',
    handler: async (ctx, r) => {
      if (refused(ctx, r)) return true;
      if (crossSite(r)) return true;
      const body = await readJson(r.req) as { member?: unknown };
      const doc = demoDoc(ctx);
      if (doc === null) { json(r.res, 404, { error: 'the demo document is not built' }); return true; }
      const member = typeof body.member === 'string' ? body.member : '';
      // a seat of this generation: the Founder's, or a member who has not left
      const seat = ctx.demo.seats().find((s) => s.id === member);
      const rec = doc.cs.memberRecords().get(member);
      const isFounder = member === doc.cs.convenorRecord().id;
      if (seat === undefined && !(rec && !rec.removed && rec.arrivedAtT !== null) && !isFounder) {
        json(r.res, 404, { error: 'no such seat' });
        return true;
      }
      if (rec && rec.removed) { json(r.res, 404, { error: 'no such seat' }); return true; }
      setCookie(r.res, doc.id, ctx.auth.cookieFor(doc.id, member, r.nowMs), ctx.httpsOn);
      json(r.res, 200, { ok: true, member });
      return true;
    },
  },
];
