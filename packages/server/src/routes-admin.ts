/**
 * The operator's routes (refactor Q1352 (m)): the health check, the
 * announced pause, the surface reload and the bot outbox — everything the
 * host itself answers about the host, rather than about a document.
 *
 * **Two halves, in the chain's own order.** `healthRoutes` ran first of all,
 * and the dev mail routes sat between it and the three key-gated ones; the
 * paths are disjoint, so nothing would break if they were one family, but
 * the chain's order is load-bearing by rule (Q1352 (m)) and keeping it costs
 * one extra export.
 */
import { join } from 'node:path';
import { CATALOGUE } from '../../constitution/src/index.js';
import { DEFAULT_TUNING } from '../../constitution/src/adapter.js';
import { SURFACE_MAX_BYTES, installSurface, readTarGz } from './surface.js';
import { botOutboxPath, outboxTail } from './mailer.js';
import { PauseState } from './write-path.js';
import { json, readJson } from './routes.js';
import type { RouteContext, Req } from './routes.js';

/* -- health (stage 7): which bytes, which store, how much is loaded -- */
// Public by the same argument as x-build: the repository is public and
// none of this is about a person. The document count is what lets an
// operator read "the restore brought everything back" from one curl.
export async function healthRoutes(ctx: RouteContext, r: Req): Promise<boolean> {
  const { req, res, path, nowMs } = r;
  // the platform probes HEAD / (seen in the logs, 2026-08-20); answer it
  // as a GET would, without the body, rather than a misleading 404
  if (req.method === 'HEAD' && (path === '/' || path === '/healthz')) {
    res.writeHead(200, { 'content-type': path === '/' ? 'text/html; charset=utf-8'
      : 'application/json; charset=utf-8' });
    res.end();
    return true;
  }
  if (req.method === 'GET' && path === '/healthz') {
    res.setHeader('cache-control', 'no-store');
    // the outbox's two numbers (finding 15): `pending` is mail on its way
    // and normally 0; `failed` is mail that gave up and is the number an
    // operator is meant to notice. `mail: off` says the kill-switch is on.
    //
    // **The health check must not fail because the store did.** These two
    // numbers come out of Postgres, and a pg error carries a `code`, so an
    // uncaught one is answered 500 — which takes a perfectly healthy
    // process out of service and restarts it over a database blip the
    // restart cannot fix. A store that will not answer reports itself as
    // `null` instead, which is the honest thing and still says something.
    const mail = await ctx.outbox.counts().catch((e: unknown) => {
      console.error('outbox counts failed:', e);
      return null;
    });
    // **The catalogue this process was booted with** (Q911, Ed 2026-08-26).
    // A running server holds two copies of the work at different ages: the
    // page is served from disk and is therefore always current, while the
    // mechanism — this module, the engine, the catalogue — is loaded at
    // boot and can be days old. So a stale server serves today's page over
    // a week-old engine, and its failures read as confident product bugs;
    // that is exactly what cost an hour on 2026-08-26, against a process
    // old enough to still know the `signing` setting v0.70 retired.
    //
    // Nothing served off disk can reveal this — only the running process
    // can say what the running process knows. The ids rather than a hash,
    // so a walk can name what differs instead of reporting inequality.
    // Public by Ed's call: the catalogue already ships in the browser
    // bundle, so this discloses nothing the page does not.
    json(res, 200, {
      ok: true,
      build: ctx.buildSha,
      // the commit whose page files a surface upload put in place (Q1347), or null
      surface: ctx.surfaceSha,
      catalogue: CATALOGUE.map((e) => e.id).sort(),
      store: ctx.cfg.store,
      documents: [...ctx.store.all()].length,
      // documents the boot skipped as the pre-people shape (decision 1253):
      // a count, never an id, on the same public-endpoint argument as the
      // errors below; production holds none after the wipe, so a non-zero
      // here is a data dir that has not had its own
      documentsSkipped: ctx.store.skippedPreShape().length,
      // a document whose replay threw at boot (Q1322): it answers 404
      // until its log is repaired, and the count here is the only place
      // an operator sees it without the boot log
      documentsQuarantined: ctx.store.quarantined().length,
      // a document whose last save the store rejected for good (Q1346):
      // it serves, it refuses every write, and it flies a red flag
      documentsStalled: [...ctx.store.all()].filter((d) => d.stalled).length,
      // the announced pause (Q1345), or null
      paused: ctx.pause.payload(nowMs),
      uptimeSeconds: Math.floor((nowMs - ctx.bootedAtMs) / 1000),
      mail: ctx.cfg.mailOff ? 'off' : 'on',
      // dev-mail mode, so the birth page — which has no view to read it
      // from — asks for the stagehand's controls only where they exist (Q1349)
      devMail: ctx.mailer.dev,
      outbox: mail,
      // the throws nobody handled since boot (entry 77) — see `errors`
      // in server.ts. `total` is the one number to watch between sessions.
      errors: ctx.errors,
      // the adoption metronome this process is pacing at (§4.2, entry
      // 77): stated because it is an operator knob a restart changes and
      // nothing else on the surface reports it.
      cooldownMs: ctx.cfg.engineTuning?.cooldownMs ?? DEFAULT_TUNING.cooldownMs,
    });
    return true;
  }
  return false;
}

/* -- the bot outbox (Q1310) ------------------------------------------
   Ships in the production artifact, and is deliberately **not** under
   the DEV label: bot rooms run on docs.vote (Ed, 2026-09-10, *we can
   have bot users in prod — we're still in alpha*). What it serves is
   mail to `bots.docs.vote` only — the mailer files nothing else there —
   so a key in the wrong hands acts as the bots in bot rooms and nothing
   more. Without a key configured the route is an unknown path: 404,
   the same body as any other. The limiter counts wrong keys only, so a
   poller every few seconds is never throttled and a guesser is. */
export async function operatorRoutes(ctx: RouteContext, r: Req): Promise<boolean> {
  const { req, res, url, path, nowMs } = r;
  // **The announced pause** (Q1345): two POSTs for the bearer of
  // DRAFT_BOT_KEY — the operator's key already on the host — gated exactly
  // as the bot outbox is: an unknown path without the key, 401 with a
  // wrong one. `pause` takes an optional `expectedMs` for the bar; both
  // answer with the pause as every view will carry it.
  if (req.method === 'POST' && (path === '/api/admin/pause' || path === '/api/admin/resume')) {
    if (r.bearerRefused()) return true;
    if (path === '/api/admin/pause') {
      const body = await readJson(req).catch(() => ({} as Record<string, unknown>));
      const asked = Number(body.expectedMs);
      const expectedMs = Number.isFinite(asked) && asked > 0 ? Math.min(asked, PauseState.MAX_MS) : PauseState.EXPECTED_MS;
      ctx.pause.begin(nowMs, expectedMs);
      console.log(`paused for maintenance (Q1345): expected ${Math.round(expectedMs / 1000)}s, lifts by itself after ${PauseState.MAX_MS / 1000}s`);
    } else {
      ctx.pause.lift();
      console.log('pause lifted (Q1345)');
    }
    json(res, 200, { ok: true, paused: ctx.pause.payload(nowMs) });
    return true;
  }

  // **The surface reload** (Q1347): the served page files of one commit,
  // as a gzipped ustar tar of `design/<file>` entries in the body and the
  // commit in `?sha=`, under the same key as the pause. Unpacked into a
  // fresh directory beside the data and served from there from this
  // moment; `x-build` states the new commit, so every open page reloads
  // itself and CI's verification sees the commit it pushed. No restart,
  // no document leaves memory, no pause.
  if (req.method === 'POST' && path === '/api/admin/surface') {
    if (r.bearerRefused()) return true;
    const sha = (url.searchParams.get('sha') ?? '').trim();
    if (!/^[0-9a-f]{7,40}$/.test(sha)) { json(res, 400, { error: 'sha must be a commit hash' }); return true; }
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of req) {
      size += (chunk as Buffer).length;
      if (size > SURFACE_MAX_BYTES) { json(res, 413, { error: 'surface too large' }); return true; }
      chunks.push(chunk as Buffer);
    }
    let files;
    try { files = readTarGz(Buffer.concat(chunks)); }
    catch (e) { json(res, 400, { error: e instanceof Error ? e.message : String(e) }); return true; }
    const dir = join(ctx.cfg.dataDir, `surface-${sha}`);
    const names = installSurface(files, dir);
    ctx.designDir = dir;
    ctx.buildSha = sha;
    ctx.surfaceSha = sha;
    console.log(`surface reloaded (Q1347): ${names.length} files of ${sha} served from ${dir}`);
    json(res, 200, { ok: true, sha, files: names });
    return true;
  }

  if (req.method === 'GET' && path === '/api/bots/outbox') {
    if (r.bearerRefused()) return true;
    json(res, 200, { mails: outboxTail(botOutboxPath(ctx.cfg.dataDir)) });
    return true;
  }
  return false;
}
