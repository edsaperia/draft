/**
 * **The SSE spike** (issue #159; `design/spec-pass/plan-scaling.md` Stage 4,
 * *a spike first*). Scaling Stage 4 replaces the page's 4 s poll with a
 * Server-Sent Events stream, and before it is built the plan asks whether
 * Render's proxy carries a long-lived streaming response, and at what cost.
 * These rows answer that and nothing more:
 *
 *  - `GET /api/spike/sse` — a `text/event-stream` that sends a counter every
 *    `?every=` ms (default 5 000) and a comment heartbeat every `?hb=` ms
 *    (default 15 000), with a `retry:` of `?retry=` ms plus up to `?jitter=`
 *    ms at random, so a deploy's reconnect herd can be spread and measured;
 *  - `POST /api/spike/poke?id=<stream>&t=<client ms>` — writes one `poke`
 *    event onto that stream at once, echoing `t`, so write-to-receive latency
 *    is measured on the client's one clock;
 *  - `GET /api/spike/stats` — open streams, RSS, heap, file descriptors and
 *    event-loop lag, the process-side half of the cost.
 *
 * **Off unless `DRAFT_SPIKE_SSE=1`**: unset, every row answers 404 like an
 * unknown path. **No document, no seat, nothing from `view()`** — a counter,
 * the server's clock and the process's own numbers — so plan-scaling's
 * Invariant 3 (blindness) cannot be touched. Capped at `SPIKE_MAX_STREAMS`
 * open at once, so the flag on cannot spend the process's descriptors.
 *
 * **Removed by Stage 4's build**, or by a follow-up if Stage 4 changes shape.
 */
import { readdirSync } from 'node:fs';
import { monitorEventLoopDelay } from 'node:perf_hooks';
import type { IntervalHistogram } from 'node:perf_hooks';
import type { ServerResponse } from 'node:http';
import { json } from './routes.js';
import type { Req, Route, RouteContext } from './routes.js';

/** The most streams open at once; the 1 001st is answered 503. */
export const SPIKE_MAX_STREAMS = 1000;

const LAG_RESOLUTION_MS = 10;

interface Stream { res: ServerResponse; openedMs: number; n: number }
const streams = new Map<number, Stream>();
let nextId = 1;
let opened = 0;
let lag: IntervalHistogram | null = null;

/** A query number, clamped; anything unparseable is the default. */
function num(r: Req, key: string, dflt: number, lo: number, hi: number): number {
  const raw = r.url.searchParams.get(key);
  const v = raw === null ? NaN : Number(raw);
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : dflt;
}

/** Every row declines to exist unless the flag is on. */
function off(ctx: RouteContext, r: Req): boolean {
  if (ctx.cfg.spikeSse === true) return false;
  json(r.res, 404, { error: 'not found' });
  return true;
}

function fds(): number | null {
  try { return readdirSync('/proc/self/fd').length; } catch { return null; }
}

/** The process's side of the cost, at this moment. */
export function spikeStats(): Record<string, unknown> {
  const mem = process.memoryUsage();
  const mb = (b: number): number => Math.round(b / 1048576 * 10) / 10;
  const ms = (ns: number): number => Math.max(0, Math.round((ns / 1e6 - LAG_RESOLUTION_MS) * 100) / 100);
  const out = {
    streams: streams.size, opened, max: SPIKE_MAX_STREAMS,
    rssMb: mb(mem.rss), heapUsedMb: mb(mem.heapUsed), externalMb: mb(mem.external),
    fds: fds(),
    // the histogram times its own 10 ms timer, so the interval is taken off:
    // what is left is how late the loop was
    lagMs: lag === null ? null : {
      mean: ms(lag.mean), p99: ms(lag.percentile(99)), max: ms(lag.max),
    },
  };
  lag?.reset();
  return out;
}

export const spikeTable: Route[] = [
  {
    name: 'GET /api/spike/sse',
    method: 'GET',
    match: '/api/spike/sse',
    handler: (ctx, r) => {
      if (off(ctx, r)) return true;
      const { req, res } = r;
      if (streams.size >= SPIKE_MAX_STREAMS) {
        json(res, 503, { error: 'too many streams' });
        return true;
      }
      if (lag === null) { lag = monitorEventLoopDelay({ resolution: LAG_RESOLUTION_MS }); lag.enable(); }
      const every = num(r, 'every', 5_000, 250, 600_000);
      const hb = num(r, 'hb', 15_000, 1_000, 600_000);
      const retry = num(r, 'retry', 3_000, 0, 600_000)
        + Math.floor(Math.random() * num(r, 'jitter', 0, 0, 600_000));
      const id = nextId++;
      opened += 1;
      req.socket.setNoDelay(true);
      req.socket.setKeepAlive(true, 30_000);
      res.writeHead(200, {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-store, no-transform',
        // a hint to any nginx-shaped proxy in front not to buffer
        'x-accel-buffering': 'no',
      });
      const s: Stream = { res, openedMs: Date.now(), n: 0 };
      streams.set(id, s);
      // the first event names the stream, so a poke can find it
      res.write(`retry: ${retry}\nevent: hello\ndata: ${JSON.stringify({ id, retry, t: s.openedMs })}\n\n`);
      const tickTimer = setInterval(() => {
        s.n += 1;
        res.write(`id: ${s.n}\ndata: ${JSON.stringify({ n: s.n, t: Date.now() })}\n\n`);
      }, every);
      const hbTimer = setInterval(() => { res.write(`: hb ${Date.now()}\n\n`); }, hb);
      const done = (): void => {
        clearInterval(tickTimer); clearInterval(hbTimer);
        streams.delete(id);
      };
      res.on('close', done);
      return true;
    },
  },
  {
    name: 'POST /api/spike/poke',
    method: 'POST',
    match: '/api/spike/poke',
    handler: (ctx, r) => {
      if (off(ctx, r)) return true;
      const s = streams.get(Number(r.url.searchParams.get('id')));
      if (s === undefined) { json(r.res, 404, { error: 'no such stream' }); return true; }
      const t = Number(r.url.searchParams.get('t'));
      s.res.write(`event: poke\ndata: ${JSON.stringify({ t: Number.isFinite(t) ? t : null, at: Date.now() })}\n\n`);
      json(r.res, 200, { ok: true });
      return true;
    },
  },
  {
    name: 'GET /api/spike/stats',
    method: 'GET',
    match: '/api/spike/stats',
    handler: (ctx, r) => {
      if (off(ctx, r)) return true;
      json(r.res, 200, spikeStats());
      return true;
    },
  },
];
