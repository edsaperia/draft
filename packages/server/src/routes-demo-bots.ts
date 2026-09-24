/**
 * **The demo panel's bot controls** (design/DEMO.md Stage 4; Q1535): the
 * routes `design/demo-bots.js` calls — the readout, ▶️ / ⏸️ / ⏹️ and the
 * choices behind them, and the heartbeat that keeps a run alive while the
 * panel's tab is open. Ed-only: every row asks `demoRefused` (`demo-access.ts`), so
 * with no `DRAFT_DEMO_KEY` on the host each is a 404 byte-identical to an
 * unknown path's, and without a valid `draft_demo` cookie a 401 counted
 * against the address's guess lock, exactly as the panel's own rows answer. No row takes a document id or a
 * slug from the request: the bots act in the one document their target names.
 *
 * Stage 2's `routes-demo.ts` holds the panel's other rows (the readout,
 * Reset, the seat switch); these are kept apart so the two stages meet at
 * the route table and nowhere else. Its `GET /api/demo/panel` may fold this
 * readout in as `bots` — `ctx.demoBots.stats()` is the whole of it.
 *
 * **One dev-only row**, pushed inside a `DEV:` label so the build drops it:
 * `POST /api/dev/demo-target` points the bots at an ordinary document by
 * slug, which is how the walk and the smoke run exercise them before — or
 * beside — the demo document itself.
 */
import { demoRefused } from './demo-access.js';
import { documentTarget } from './demo-target.js';
import type { DemoPace } from './demo-bots.js';
import { json, readJson } from './routes.js';
import type { Req, Route, RouteContext } from './routes.js';

/**
 * The gate every row asks — **the same function the panel's rows ask**
 * (`demoRefused`, demo-access.ts): no key a 404, the guess lock a 429, no
 * cookie a counted wrong try and a 401, a cross-site POST a 403 (a POST from
 * another site must not drive Ed's bots on his cookie). True when answered.
 */
const refused = (ctx: RouteContext, r: Req): boolean => demoRefused(ctx, r);

const PACES = new Set(['calm', 'lively', 'frantic']);

export const demoBotsTable: Route[] = [
  {
    name: 'GET /api/demo/bots — the bots readout',
    method: 'GET',
    match: '/api/demo/bots',
    handler: (ctx, r) => {
      if (refused(ctx, r)) return true;
      json(r.res, 200, ctx.demoBots.stats());
      return true;
    },
  },
  {
    name: 'POST /api/demo/bots — ▶️ ⏸️ ⏹️ and the choices',
    method: 'POST',
    match: '/api/demo/bots',
    handler: async (ctx, r) => {
      if (refused(ctx, r)) return true;
      const body = await readJson(r.req);
      const action = typeof body.action === 'string' ? body.action : '';
      const count = typeof body.count === 'number' && Number.isFinite(body.count) ? body.count : undefined;
      const pace = typeof body.pace === 'string' && PACES.has(body.pace) ? body.pace as DemoPace : undefined;
      const model = typeof body.model === 'string' ? body.model : undefined;
      const bots = ctx.demoBots;
      // **a walk's short clocks** (DEMO.md Stage 4): a dev host may be told a
      // shorter heartbeat lapse, run clock and cap in the start's own body, so
      // one walk can meet all three pauses. The label drops the read from the
      // production artifact, which keeps Q1535's two minutes, ten minutes and $3.
      DEV: {
        if (ctx.mailer.dev) {
          const n = (k: string): number | undefined =>
            typeof body[k] === 'number' && Number.isFinite(body[k]) ? body[k] as number : undefined;
          bots.tune({ lapseMs: n('devLapseMs'), runMs: n('devRunMs'), capUsd: n('devCapUsd') });
        }
      }
      let out: { ok: true } | { ok: false; error: string };
      if (action === 'start') out = bots.start({ count, pace, model });
      else if (action === 'resume') out = bots.resume();
      else if (action === 'pause') { bots.pause('hand'); out = { ok: true }; }
      else if (action === 'stop') { bots.stop('hand'); out = { ok: true }; }
      else if (action === 'choose') { bots.choose({ count, pace, model }); out = { ok: true }; }
      else { json(r.res, 400, { error: "action must be 'start', 'resume', 'pause', 'stop' or 'choose'" }); return true; }
      json(r.res, out.ok ? 200 : 409, { ...out, bots: bots.stats() });
      return true;
    },
  },
  {
    name: 'POST /api/demo/heartbeat — the panel is still open',
    method: 'POST',
    match: '/api/demo/heartbeat',
    handler: (ctx, r) => {
      if (refused(ctx, r)) return true;
      ctx.demoBots.beat();
      json(r.res, 200, { ok: true, state: ctx.demoBots.stats().state });
      return true;
    },
  },
];

DEV: {
  demoBotsTable.push({
    name: 'POST /api/dev/demo-target — point the bots at a document (dev)',
    method: 'POST',
    match: '/api/dev/demo-target',
    handler: async (ctx, r) => {
      if (r.devOff()) return true;
      if (refused(ctx, r)) return true;
      const body = await readJson(r.req);
      const doc = typeof body.slug === 'string' ? ctx.store.bySlug(body.slug) : null;
      if (doc === null) { json(r.res, 404, { error: 'no such document' }); return true; }
      ctx.demoBots.setTarget(documentTarget(doc, Date.now()));
      json(r.res, 200, { ok: true, seats: ctx.demoBots.stats().seats });
      return true;
    },
  });
}
