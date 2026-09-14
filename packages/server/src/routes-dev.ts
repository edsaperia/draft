/**
 * The dev-only routes (refactor Q1352 (m)): the outbox tail, the error
 * log's tail, the forced give-up, the phase ladder and the seat switch.
 *
 * **Every branch here is a `DEV:`-labelled statement**, exactly as it was in
 * `server.ts`'s chain. The build drops labelled statements wherever they
 * stand (`--drop-labels=DEV`, decision 437), so moving them to their own
 * file changes nothing about the drop: what ships is two functions that
 * return false, and `scripts/build-server.mjs` greps the artifact for
 * `/api/dev/`, `dev-ladder`, `ladder.invalid` and `Bellamy` to prove it.
 * The ladder's `import()` stays **dynamic and inside the label**, which is
 * what stops esbuild resolving the module at all — a static import would
 * survive the drop and ship the whole ladder, its cast and its charter.
 *
 * **Two halves, in the chain's own order.** The mail pair ran before the
 * operator's key-gated routes and the ladder four after them; the paths are
 * disjoint, so the split is bookkeeping rather than behaviour, but the
 * chain's order is load-bearing by rule and this is what preserves it.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { join } from 'node:path';
import { errorTail } from './error-log.js';
import { outboxTail } from './mailer.js';
import { cookieSession, json, readJson, setCookie } from './routes.js';
import type { RouteContext, Req } from './routes.js';

/**
 * The dev routes' own Origin check. The blanket one in `server.ts` covers
 * /auth only, and these mint cookies and write to a document, so they want
 * the same guard — a cross-site form must not be able to reseat somebody
 * or run a ladder in their session.
 */
function devCrossSite(req: IncomingMessage, res: ServerResponse, expected: string): boolean {
  const origin = req.headers.origin;
  if (origin !== undefined && origin !== expected) {
    json(res, 403, { error: 'cross-site request refused' });
    return true;
  }
  return false;
}

/* -- creation (§9.7a: the mail is the save) -------------------------- */
// Deleted from the production artifact, not flag-gated (stage 3,
// defects 1/9 and decision 437): the DEV label is dropped bodily by
// the build ('npm run build' passes --drop-labels=DEV), so no
// misconfiguration can serve magic links — the code is not there.
export async function devMailRoutes(ctx: RouteContext, r: Req): Promise<boolean> {
  const { req, res, path } = r;
  DEV: if (req.method === 'GET' && path === '/api/dev/outbox') {
    if (r.devOff()) return true;
    json(res, 200, { mails: outboxTail(join(ctx.cfg.dataDir, 'outbox.jsonl')) });
    return true;
  }

  /* **The error log's tail** (Q1330), the way the outbox's is served:
     newest first, dev only, dropped bodily from the production artifact
     with the rest of this label — on docs.vote the file is read on the
     host (`draft-tools errors <dataDir>`, docs/OPERATING.md §11). */
  DEV: if (req.method === 'GET' && path === '/api/dev/errors') {
    if (r.devOff()) return true;
    res.setHeader('cache-control', 'no-store');
    json(res, 200, { errors: errorTail(ctx.cfg.dataDir) });
    return true;
  }
  return false;
}

/* **The forced give-up** (SURFACE E34). A real give-up is six attempts
   over roughly three hours, and the reserved-address seam is deliberately
   a *retire* rather than a give-up (`outbox.ts` argues it at length), so
   without this nothing can reach E34 in a walk. It drives the outbox's
   own `give` — the failed mark, the revoked token, the give-up door —
   rather than mocking any of it, and wears all three of this block's
   guards. */
export async function devLadderRoutes(ctx: RouteContext, r: Req): Promise<boolean> {
  const { req, res, url, path, nowMs, baseOrigin } = r;
  DEV: if (req.method === 'POST' && path === '/api/dev/outbox/give-up') {
    if (r.devOff()) return true;
    if (devCrossSite(req, res, baseOrigin)) return true;
    const body = await readJson(req) as { slug?: unknown; to?: unknown };
    const doc = r.docOr404(typeof body.slug === 'string' ? ctx.store.bySlug(body.slug) : null);
    if (!doc) return true;
    const to = typeof body.to === 'string' ? body.to : '';
    if (to === '') { json(res, 400, { error: 'an address to give up on' }); return true; }
    const gone = await ctx.outbox.giveUpNow(doc.id, to);
    if (gone === 0) { json(res, 404, { error: 'no mail to that address on this document' }); return true; }
    json(res, 200, { ok: true, gaveUp: gone });
    return true;
  }

  /* -- the phase ladder (Q674–Q678) ------------------------------------
     One press, one rung: birth → constitution → ready → session →
     closing → closed, on a real document with a real log and a real
     engine. Dropped from the production artifact the same way the
     outbox is — and the import is **dynamic and inside the label**,
     which is what keeps the ladder, its cast and its charter from being
     resolved into the bundle at all. A static import would survive the
     drop, because esbuild cannot prove a module's top-level
     initialisers pure and keeps them even with no live reference. */
  /* The bar's readout, and how it knows to exist at all. A GET must not
     climb: the bar asks on every page load, and a probe that advanced a
     rung would make merely opening the page press the button. */
  DEV: if (req.method === 'GET' && path === '/api/dev/ladder') {
    if (r.devOff()) return true;
    const { phaseOf, RUNGS, seedOfSlug, seatsOf, manifestOf } =
      await import('./dev-ladder.js');
    const slug = url.searchParams.get('slug');
    const doc = slug === null ? null : ctx.store.bySlug(slug);
    const phase = phaseOf(doc, nowMs);
    const manifestSafely = (d: typeof doc, t: number): { what: string; seat?: string }[] => {
      try {
        return manifestOf(d, t).lines;
      } catch (e) {
        return [{ what: `the manifest could not be read: ${(e as Error).message}` }];
      }
    };
    json(res, 200, {
      phase,
      next: RUNGS[Math.min(RUNGS.indexOf(phase) + 1, RUNGS.length - 1)],
      rungs: RUNGS,
      seed: doc === null ? null : seedOfSlug(doc.cs.slug),
      seats: doc === null ? [] : seatsOf(doc.cs),
      me: doc === null ? null : (cookieSession(ctx.auth, req, doc.id)?.memberId ?? null),
      /* What is *in* the document, for `npm run ladder --to=` to print
         beside its own assertions (Q1140). It rides this GET because the
         walk drives the **bar** and so never sees `runLadder`'s own
         return — and because reading it back here is what makes it the
         document's account of itself rather than the rung's (Q1141).

         **It must never take the bar down.** The bar asks this on every
         page load and draws nothing at all if the answer is an error, so
         a manifest that throws would remove the ⏭ from the page and
         report itself as *the server is not in dev mail mode* — which is
         exactly what a first cut of `manifestOf` did. It is an extra;
         a failure to describe the document is not a failure to serve it. */
      manifest: manifestSafely(doc, nowMs),
    });
    return true;
  }

  DEV: if (req.method === 'POST' && path === '/api/dev/ladder') {
    if (r.devOff()) return true;
    if (devCrossSite(req, res, baseOrigin)) return true;
    const body = await readJson(req) as { to?: unknown; seed?: unknown; slug?: unknown };
    const { runLadder } = await import('./dev-ladder.js');
    const doc = typeof body.slug === 'string' ? ctx.store.bySlug(body.slug) : null;
    const result = await runLadder(
      { store: ctx.store, commit: (d, t) => ctx.writes.commit(d, t) }, doc, {
      ...(typeof body.to === 'string' ? { to: body.to as never } : {}),
      ...(typeof body.seed === 'number' ? { seed: body.seed } : {}),
    });
    // the press seats you as the founder, since the founder is who the
    // ladder's own rungs are written from
    setCookie(res, result.docId, ctx.auth.cookieFor(result.docId, 'founder', nowMs), ctx.httpsOn);
    json(res, 200, result);
    return true;
  }

  /* Sit in any seat. `cookieFor` checks nothing at all, so this mirrors
     /auth/login's own arrival and revival — a cookie for somebody who
     has not arrived renders a seat whose every command then throws. The
     seat list is served from here rather than from the view payload:
     `devMail` already rides the view unconditionally, the stranger's
     path included, and a roster there would be an oracle to anybody
     holding the slug. */
  DEV: if (req.method === 'POST' && path === '/api/dev/seat') {
    if (r.devOff()) return true;
    if (devCrossSite(req, res, baseOrigin)) return true;
    const body = await readJson(req) as { slug?: unknown; member?: unknown };
    const doc = r.docOr404(typeof body.slug === 'string' ? ctx.store.bySlug(body.slug) : null);
    if (!doc) return true;
    const member = typeof body.member === 'string' ? body.member : '';
    const rec = doc.cs.memberRecords().get(member);
    const isFounder = member === doc.cs.convenorRecord().id;
    if (!rec && !isFounder) { json(res, 404, { error: 'no such seat' }); return true; }
    const t = ctx.writes.tOf(doc);
    if (rec && rec.arrivedAtT === null) doc.cs.arrive(t, member);
    else if (rec && rec.lapsed) doc.cs.memberReturn(t, member);
    await ctx.writes.commit(doc, nowMs);
    setCookie(res, doc.id, ctx.auth.cookieFor(doc.id, member, nowMs), ctx.httpsOn);
    json(res, 200, { ok: true, member });
    return true;
  }
  return false;
}
