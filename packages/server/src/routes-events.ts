/**
 * **The push stream's row** (design/spec-pass/plan-scaling.md Stage 4; issue
 * #162): `GET /api/d/:slug/events`, served by `EventHub` (`events.ts`), which
 * says what a stream carries and why.
 *
 * **The same guards as the view, and no new reader.** A living seat — a
 * member's or an applicant's — streams as itself; anybody else is the
 * stranger's door, under the door's own per-IP budget, exactly where the
 * view row answers the door (Q456). What a stream tells any of them is the
 * document's `seq.eseq`, which every view answer, the door's short one
 * included, already carries (Invariant 3).
 *
 * **Off with `DRAFT_PUSH=off`**: the row answers 404 like an unknown path,
 * and every page polls at 4 s exactly as it did before push — the switch
 * the walks use to run with push blocked, and an operator's off switch.
 */
import { asEngineDoc } from './engine-host.js';
import { cookieSession, ipOf, json } from './routes.js';
import type { Route } from './routes.js';
import { seatAlive } from './routes-member.js';

export const eventsTable: Route[] = [
  {
    name: 'GET /api/d/:slug/events',
    method: 'GET',
    match: ({ seg }) => seg[0] === 'api' && seg[1] === 'd' && seg.length === 4 && seg[3] === 'events',
    handler: (ctx, r) => {
      const { req, res, seg, nowMs } = r;
      if (ctx.cfg.push === false) { json(res, 404, { error: 'not found' }); return true; }
      const doc = r.docOr404(ctx.store.bySlug(seg[2]!));
      if (!doc) return true;
      const session = cookieSession(ctx.auth, req, doc.id);
      const seated = session !== null && seatAlive(doc.cs, session.memberId, session.applicantId);
      // the door's budget, as the door's view spends it: one stream is one ask
      if (!seated && r.tooMany('stranger', 6000)) return true;
      const audience = !seated ? 'stranger' : session.applicantId !== null ? 'applicant' : 'member';
      ctx.events.open(doc, res, audience, seated ? session.memberId : null, ipOf(req, ctx.cfg), nowMs);
      return true;
    },
  },
];

/** The hub's view of a document: its two lengths, as the view computes them. */
export function lengthsOf(doc: Parameters<typeof asEngineDoc>[0]): { seq: number; eseq: number } {
  const engineDoc = asEngineDoc(doc);
  return {
    seq: doc.cs.logEntries().length,
    eseq: engineDoc.bridge === null ? 0 : engineDoc.bridge.engine.log.length,
  };
}
