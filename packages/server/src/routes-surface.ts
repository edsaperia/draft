/**
 * The files the host serves (refactor Q1352 (m), (n)): the page's own
 * assets, a document's page, the `design/` whitelist, the birth at `/` and
 * the approval-threshold explainer at `/pairwise`. Five rows, last in the
 * table — everything past them is the chain's 404.
 *
 * **A family of its own, unlike the stranger's door**, which looks like one
 * and is not: the door is a fallthrough inside the member view row
 * (`routes-member.ts`), while these five are branches with a boundary the
 * order allows.
 *
 * The order inside the table is load-bearing here and nowhere else in it:
 * the asset row matches `/d/<anything ending .js>` and stands before the
 * document-page row, so a document whose address ended in `.js` would be
 * looked for in the design directory. That was true of the chain and is
 * true of the table.
 *
 * Every path here reads `ctx.designDir`, which a surface upload moves
 * (Q1347), so they must read it through the context and never capture it.
 */
import { join, normalize } from 'node:path';
import { json, serveFile } from './routes.js';
import type { Route } from './routes.js';

/* -- the surface ------------------------------------------------------ */
export const surfaceTable: Route[] = [
  {
    // the page references its assets relatively (fixture mode serves them
    // from one directory), so they resolve to /x.js at the root and to
    // /d/x.js under a document — serve both from the design dir. Basename
    // only: no separators survive seg splitting, so no traversal.
    name: 'GET a page asset',
    method: 'GET',
    match: ({ seg }) => {
      const last = seg.length > 0 ? seg[seg.length - 1]! : '';
      return /\.(js|css|svg|png|woff2?)$/.test(last) &&
        (seg.length === 1 || (seg[0] === 'd' && seg.length === 2));
    },
    handler: (ctx, { res, seg }) => {
      serveFile(res, join(ctx.designDir, seg[seg.length - 1]!));
      return true;
    },
  },
  {
    name: 'GET /d/:slug — a document’s page',
    method: 'GET',
    match: ({ seg }) => seg[0] === 'd' && seg.length === 2,
    handler: (ctx, r) => {
      if (r.docOr404(ctx.store.bySlug(r.seg[1]!)) === null) return true;
      serveFile(r.res, join(ctx.designDir, 'session-view.html'));
      return true;
    },
  },
  {
    name: 'GET /design/:file — the asset whitelist',
    method: 'GET',
    match: ({ seg }) => seg[0] === 'design',
    handler: (ctx, { res, seg }) => {
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
        return true;
      }
      serveFile(res, join(ctx.designDir, rel));
      return true;
    },
  },
  {
    name: 'GET / — the birth',
    method: 'GET',
    match: '/',
    handler: (ctx, { res }) => {
      // arriving at docs.vote presents a brand-new unsaved document (§9.7a)
      serveFile(res, join(ctx.designDir, 'session-view.html'));
      return true;
    },
  },
  {
    // The explainer for the approval threshold (entry 163): what one
    // confidence means in votes, why it is a confidence and not a share.
    // The first page this host serves that is not a document — 🌡️'s
    // `methodNote` links here, and the page's own numbers come from
    // `votesNeeded` in the bundle it loads. Exact path only: no trailing
    // slash and no /pairwise.html alias, the asset row above deliberately
    // not matching .html.
    name: 'GET /pairwise — the threshold explainer',
    method: 'GET',
    match: '/pairwise',
    handler: (ctx, { res }) => {
      serveFile(res, join(ctx.designDir, 'pairwise.html'));
      return true;
    },
  },
];
