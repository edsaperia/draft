#!/usr/bin/env node
/**
 * **The SSE spike's measuring client** (issue #159; plan-scaling.md Stage 4).
 * An instrument, not a guard: it measures and prints, and asserts nothing.
 *
 * **It measured the spike's `/api/spike/*` rows, removed unshipped** after
 * Ed's (b) of 2026-10-02 (git history at `7c3f8f93` holds them); Stage 4's
 * build points it at `/api/d/:slug/events` with `--doc=<slug>` to measure
 * the real stream's opening, cost and herd (no poke there; `push-walk`
 * measures the latency on the page).
 *
 *   node scripts/spike-sse.mjs <base> [--n=100] [--every=5000] [--hb=15000]
 *     [--duration=120] [--pokes=20] [--retry=3000] [--jitter=0]
 *     [--stats=5000] [--json=<file>] [--doc=<slug>]
 *
 * Against a server with `DRAFT_SPIKE_SSE=1`, it opens `--n` streams on
 * `/api/spike/sse` and holds them for `--duration` seconds, answering the
 * spike's four questions:
 *
 *  1. **does a stream stay open**, and for how long — every close is
 *     recorded with the stream's age, so a proxy's idle or absolute cut shows
 *     as a cluster of equal ages;
 *  2. **does it buffer** — `--pokes` times per stream a `POST /api/spike/poke`
 *     is answered by an event on that stream, timed on this client's one
 *     clock (write-to-receive, round trip included); and the counter's
 *     arrival gaps against `--every`, where buffering shows as bursts;
 *  3. **what it costs** — `/api/spike/stats` sampled every `--stats` ms:
 *     open streams, RSS, heap, file descriptors, event-loop lag;
 *  4. **how a herd comes back** — a stream that ends is reopened after the
 *     server's `retry:` (base + random `--jitter`), as `EventSource` would,
 *     and each reopen's delay from the cut is recorded. Restart or redeploy
 *     the server mid-run to measure it.
 */
const args = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--'))
  .map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? '1']; }));
const base = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'http://localhost:8140';
const N = Number(args.n ?? 100);
const EVERY = Number(args.every ?? 5000);
const HB = Number(args.hb ?? 15000);
const DURATION_S = Number(args.duration ?? 120);
const POKES = Number(args.pokes ?? 20);
const RETRY = Number(args.retry ?? 3000);
const JITTER = Number(args.jitter ?? 0);
const STATS_MS = Number(args.stats ?? 5000);
// **the real stream** (Scaling Stage 4): `--doc=<slug>` reads
// `/api/d/<slug>/events` at the door, which carries no counter and takes no
// poke — so it measures the opening, the cost and the herd, and push-walk
// measures the latency on the page
const DOC = args.doc ?? null;

const t0 = Date.now();
const rel = () => (Date.now() - t0) / 1000;
const pokeLat = [];
const gaps = [];
const opens = [];      // ms to first byte (the hello event)
const closes = [];     // { at, age, why }
const reopens = [];    // { at, delay } — delay from the cut to the new hello
const statsLog = [];
let stopping = false;

const pct = (xs, p) => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p / 100 * s.length))];
};
const summary = (xs) => xs.length === 0 ? 'none'
  : `n=${xs.length} p50=${pct(xs, 50)} p95=${pct(xs, 95)} max=${Math.max(...xs)}`;

async function stream(k) {
  let cutAt = null;
  let retry = RETRY;
  while (!stopping) {
    const ac = new AbortController();
    const startedMs = Date.now();
    let openedMs = null;
    let lastN = null;
    let why = 'ended';
    try {
      const url = DOC !== null ? `${base}/api/d/${DOC}/events`
        : `${base}/api/spike/sse?every=${EVERY}&hb=${HB}&retry=${RETRY}&jitter=${JITTER}`;
      const res = await fetch(url, { signal: ac.signal, headers: { accept: 'text/event-stream' } });
      if (res.status !== 200) { why = `status ${res.status}`; throw new Error(why); }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      let lastArrive = null;
      let pokesLeft = POKES;
      let id = null;
      const pokeOnce = async () => {
        if (stopping || id === null || pokesLeft <= 0 || DOC !== null) return;
        pokesLeft -= 1;
        await fetch(`${base}/api/spike/poke?id=${id}&t=${Date.now()}`, { method: 'POST' }).catch(() => {});
      };
      // pokes spread over the run, so latency is sampled under load and idle alike
      const pokeTimer = setInterval(() => void pokeOnce(),
        Math.max(500, DURATION_S * 1000 / Math.max(1, POKES)) + Math.random() * 500);
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i;
          while ((i = buf.indexOf('\n\n')) >= 0) {
            const block = buf.slice(0, i); buf = buf.slice(i + 2);
            if (block.startsWith(':')) continue;
            let event = 'message'; let data = '';
            for (const line of block.split('\n')) {
              if (line.startsWith('event: ')) event = line.slice(7);
              else if (line.startsWith('data: ')) data = line.slice(6);
              else if (line.startsWith('retry: ')) retry = Number(line.slice(7));
            }
            const now = Date.now();
            const d = JSON.parse(data);
            if (event === 'hello') {
              openedMs = now; id = d.id ?? null;
              opens.push(now - startedMs);
              if (cutAt !== null) { reopens.push({ at: rel(), delay: now - cutAt }); cutAt = null; }
            } else if (event === 'poke') {
              if (typeof d.t === 'number') pokeLat.push(now - d.t);
            } else {
              if (lastArrive !== null && lastN !== null && d.n === lastN + 1) gaps.push(now - lastArrive);
              lastArrive = now; lastN = d.n;
            }
          }
        }
      } finally { clearInterval(pokeTimer); }
    } catch (e) {
      if (why === 'ended') why = e?.cause?.code ?? e?.name ?? String(e);
    }
    if (stopping) return;
    // a cut is timed from the first failure, not from each retry that met a
    // host still coming up
    if (cutAt === null) cutAt = Date.now();
    closes.push({ at: rel(), age: openedMs === null ? null : (Date.now() - openedMs) / 1000, why, k });
    // EventSource's own rule: wait the server's retry, then reopen
    await new Promise((r) => setTimeout(r, retry));
  }
}

async function sample() {
  try {
    const s = DOC === null ? await (await fetch(`${base}/api/spike/stats`)).json()
      : { streams: (await (await fetch(`${base}/healthz`)).json()).streams?.open };
    statsLog.push({ at: rel(), ...s });
    process.stdout.write(`[${rel().toFixed(0)}s] streams=${s.streams} rss=${s.rssMb}MB heap=${s.heapUsedMb}MB `
      + `fds=${s.fds} lag p99=${s.lagMs?.p99}ms max=${s.lagMs?.max}ms closes=${closes.length} reopens=${reopens.length}\n`);
  } catch (e) {
    statsLog.push({ at: rel(), error: String(e?.cause?.code ?? e) });
    process.stdout.write(`[${rel().toFixed(0)}s] stats unreachable (${e?.cause?.code ?? e})\n`);
  }
}

console.log(`spike-sse: ${N} streams on ${base}, every=${EVERY}ms hb=${HB}ms for ${DURATION_S}s, `
  + `retry=${RETRY}+${JITTER}ms`);
await sample();
const all = [];
for (let k = 0; k < N; k++) {
  all.push(stream(k));
  // open at ~50/s, not all in one tick: the opening herd is question 4's, not this one
  if (k % 50 === 49) await new Promise((r) => setTimeout(r, 1000));
}
const statsTimer = setInterval(() => void sample(), STATS_MS);
await new Promise((r) => setTimeout(r, DURATION_S * 1000));
stopping = true;
clearInterval(statsTimer);
await sample();

const ages = closes.filter((c) => c.age !== null).map((c) => Math.round(c.age));
const result = {
  base, n: N, every: EVERY, hb: HB, durationS: DURATION_S, retry: RETRY, jitter: JITTER,
  openMs: { p50: pct(opens, 50), p95: pct(opens, 95), max: opens.length ? Math.max(...opens) : null },
  pokeMs: { n: pokeLat.length, p50: pct(pokeLat, 50), p95: pct(pokeLat, 95), p99: pct(pokeLat, 99),
    max: pokeLat.length ? Math.max(...pokeLat) : null },
  gapMs: { n: gaps.length, p5: pct(gaps, 5), p50: pct(gaps, 50), p95: pct(gaps, 95) },
  closes: closes.length, closeAgesS: summary(ages),
  closeReasons: Object.fromEntries([...new Set(closes.map((c) => c.why))]
    .map((w) => [w, closes.filter((c) => c.why === w).length])),
  reopens: reopens.length,
  reopenDelayMs: summary(reopens.map((r) => r.delay)),
  // the herd: reopens per second after the first cut
  herd: (() => {
    if (reopens.length === 0) return null;
    const first = Math.min(...reopens.map((r) => r.at));
    const h = {};
    for (const r of reopens) { const s = Math.floor(r.at - first); h[s] = (h[s] ?? 0) + 1; }
    return h;
  })(),
  stats: statsLog,
};
console.log('\n' + JSON.stringify({ ...result, stats: `${statsLog.length} samples` }, null, 2));
if (args.json) {
  const { writeFileSync } = await import('node:fs');
  writeFileSync(args.json, JSON.stringify(result, null, 2));
}
process.exit(0);
