/**
 * **The host under measurement** (plan-scaling.md Stage 0): `main.ts`'s boot
 * — configuration from the environment, `createDraftServer`, the listener,
 * the minute's clock — run as a child of `scale-measure.ts`, with a channel
 * back to it for the numbers only a process can read about itself: its
 * memory before and after a collection, the length of one `tick()` pass,
 * its CPU time and its event-loop delay.
 *
 * **Why a wrapper and not a hook in the server** (the brief's rule: no
 * product code in Stage 0). Every one of these numbers is readable from
 * outside the server's own code, so none of them needs a route; `/healthz`
 * reporting them is issue #70's, and is a product change for a later stage.
 * The server this runs is the dev path (tsx over the sources, no
 * `RESEND_API_KEY`), which is `npm run server` exactly; the production
 * artifact is the same code bundled by esbuild, and its replay is the same
 * functions.
 *
 * Run by `scale-measure.ts` as
 *   node --expose-gc --max-old-space-size=<mb> --import tsx scale-host.ts
 * with DRAFT_DATA_DIR, PORT and DRAFT_BASE_URL set, never 8140.
 */
import { monitorEventLoopDelay } from 'node:perf_hooks';
import { getHeapStatistics } from 'node:v8';
import { configFromEnv } from '../../server/src/config.js';
import { createDraftServer } from '../../server/src/server.js';

type Msg = { op: 'mem' | 'gc' | 'tick' | 'cpu-start' | 'cpu-stop' | 'exit'; id: number };

const startedAt = performance.now(); // ms since this process began (loader included)
/**
 * **The server's own request line, read rather than printed.** `server.ts`
 * writes `METHOD path status Nms` per response, timed inside the process;
 * those durations are the view and command latencies without the client's
 * side of loopback (on Windows a fetch round trip jitters 0–16 ms by
 * itself), so they are what the measurement reports. Printing them would be
 * most of the CPU under load, so nothing is printed.
 */
const served: Record<string, number[]> = {};
let recording = false;
console.log = (...args: unknown[]): void => {
  if (!recording) return;
  const m = /^(GET|POST) \/api\/d\/[^/]+\/(view|cmd) (\d+) (\d+)ms$/.exec(String(args[0]));
  if (m === null) return;
  const key = m[3]!.startsWith('5') ? 'error' : `${m[1]} ${m[2]}`;
  (served[key] ??= []).push(Number(m[4]));
};
const cfg = configFromEnv();
const t0 = performance.now();
const draft = await createDraftServer(cfg);
const createMs = performance.now() - t0;
await new Promise<void>((r) => draft.server.listen(cfg.port, '127.0.0.1', () => r()));
const listenAt = performance.now();

const ticks: number[] = [];
const clock = setInterval(() => {
  const s = performance.now();
  void draft.tick().then(() => ticks.push(performance.now() - s),
    (e: unknown) => console.error('tick failed:', e));
}, 60_000);

const mem = (): Record<string, number> => {
  const m = process.memoryUsage();
  const h = getHeapStatistics();
  return { rss: m.rss, heapUsed: m.heapUsed, heapTotal: m.heapTotal, external: m.external,
    arrayBuffers: m.arrayBuffers, liveHeap: h.used_heap_size };
};

const loop = monitorEventLoopDelay({ resolution: 10 });
let cpu0 = process.cpuUsage();
let wall0 = performance.now();

const stats = (xs: number[]): { n: number; p50: number; p95: number; max: number } => {
  const s = [...xs].sort((x, y) => x - y);
  const at = (p: number): number => s[Math.min(s.length - 1, Math.floor(p * s.length))] ?? NaN;
  return { n: s.length, p50: at(0.5), p95: at(0.95), max: s[s.length - 1] ?? NaN };
};

const send = (id: number, body: unknown): void => { process.send?.({ id, body }); };
send(0, { ready: true, startedAtMs: startedAt, createMs, listenAtMs: listenAt,
  docs: [...draft.store.all()].length, quarantined: draft.store.quarantined().length,
  skipped: draft.store.skippedPreShape().length });

process.on('message', (raw: unknown) => {
  const m = raw as Msg;
  void (async () => {
    switch (m.op) {
      case 'mem': send(m.id, mem()); break;
      case 'gc': {
        (globalThis as { gc?: () => void }).gc?.();
        send(m.id, mem());
        break;
      }
      case 'tick': {
        const s = performance.now();
        await draft.tick();
        send(m.id, { ms: performance.now() - s });
        break;
      }
      case 'cpu-start':
        cpu0 = process.cpuUsage(); wall0 = performance.now(); loop.reset(); loop.enable();
        for (const k of Object.keys(served)) delete served[k];
        recording = true;
        send(m.id, {});
        break;
      case 'cpu-stop': {
        const d = process.cpuUsage(cpu0);
        const wall = performance.now() - wall0;
        loop.disable();
        recording = false;
        send(m.id, { busy: (d.user + d.system) / 1000 / wall, wallMs: wall,
          loopP50: loop.percentile(50) / 1e6, loopP99: loop.percentile(99) / 1e6,
          loopMax: loop.max / 1e6, ticks: ticks.splice(0),
          served: Object.fromEntries(Object.entries(served).map(([k, xs]) => [k, stats(xs)])) });
        break;
      }
      case 'exit':
        clearInterval(clock);
        send(m.id, {});
        process.exit(0);
    }
  })();
});
