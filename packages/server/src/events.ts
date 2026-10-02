/**
 * **Push instead of polling** (design/spec-pass/plan-scaling.md Stage 4;
 * issue #162; Ed 2026-10-02 ~10:26 UTC, (b) on #161: built on the spike's
 * local numbers). `GET /api/d/:slug/events` is a long-lived
 * `text/event-stream`, and this file is everything behind it but the route.
 *
 * **What a stream carries** (Invariant 3, blindness): the document's
 * `seq.eseq` and nothing else — never a view, never content. Three events:
 *
 *  - `hello`, once, on opening: `{ seq, eseq, build }`. `build` is the
 *    `x-build` header the same response already carries, which a page's
 *    `EventSource` cannot read, so a page reconnecting after a deploy learns
 *    the new build without asking for a view (the reload's own rule,
 *    Q1347/Q1438, then decides what to do with it).
 *  - `doc`: `{ seq, eseq }`, whenever either length has moved.
 *  - `nudge`: no payload — *something you can already see moved without a
 *    log moving; ask*. Sent on the three things the poll's short answer
 *    carries besides the seqs: the announced pause or its lift (Q1345), the
 *    stalled flag (Q1346), a surface upload moving the build (Q1347) — and,
 *    **to members only**, a change in where somebody is reading (Q1570,
 *    E43), whose audience is the membership: a stranger's or an applicant's
 *    stream is never nudged by it, so the timing of their events says
 *    nothing their view does not.
 *
 * A heartbeat comment every `HEARTBEAT_MS` keeps proxies from timing the
 * line out, and doubles as **an open member's presence report** (below).
 *
 * **How a change is found: a scan, not a hook.** Every document with an open
 * stream is visited every `SCAN_MS` and its two lengths compared with what
 * was last sent — the same two numbers the poll compares (`since`). A hook at
 * each mutation site would have to be found at every one (a command, the
 * minute's tick, the outbox's give-up news, the demo's bots, an admin
 * resume…) and kept found; the scan cannot miss one, costs two array lengths
 * per streamed document per pass, and runs only while a stream is open.
 * `SCAN_MS` sits well inside the walked acceptance, *a vote on one seat
 * reaches another seat's page in under a second*.
 *
 * **The spike's two findings** (#161, plan-scaling.md *Stage notes*):
 *  1. **every stream ends at the start of `close()`** (`closeAll`) — an open
 *     stream otherwise holds `server.close()` until its race gives up, which
 *     measured 3.0–4.4 s of a deploy's drain;
 *  2. **the herd is the views, not the streams** — so every stream's
 *     `retry:` is `RETRY_BASE_MS` plus up to `RETRY_JITTER_MS` at random,
 *     chosen per stream: after a deploy the reconnects, and the build each
 *     `hello` carries, arrive spread over the jitter, and so do the reloads
 *     and views that follow them.
 *
 * **Capped per seat and per IP** (`PER_SEAT`, `PER_IP`), answered 429 past
 * either: a page whose stream is refused polls at the old 4 s, which is the
 * page exactly as it was before push.
 */
import type { ServerResponse } from 'node:http';
import type { LoadedDoc } from './store.js';
import { touchPlace, presenceGen } from './presence.js';

/** How often a streamed document's lengths are compared. */
export const SCAN_MS = 200;
/** A comment line this often: inside every proxy's idle timeout we know of. */
export const HEARTBEAT_MS = 25_000;
/** `retry:` floor, and the most added to it at random per stream. */
export const RETRY_BASE_MS = 1_000;
export const RETRY_JITTER_MS = 10_000;
/** Open streams one seat may hold on one document (tabs, a phone beside a laptop). */
export const PER_SEAT = 6;
/** Open streams one address may hold — a venue's Wi-Fi is one address for a room. */
export const PER_IP = 200;

export type Audience = 'member' | 'applicant' | 'stranger';

interface Stream {
  readonly doc: LoadedDoc;
  readonly res: ServerResponse;
  readonly audience: Audience;
  /** the member or applicant id; null for a stranger */
  readonly seat: string | null;
  readonly ip: string;
  /** what this stream was last told */
  seq: number; eseq: number;
  presence: number; host: string;
  lastWriteMs: number;
}

export interface HubDeps {
  /** the document's two lengths, as the view computes them */
  lengths(doc: LoadedDoc): { seq: number; eseq: number };
  /** everything host-wide the short answer carries: the pause and the build */
  hostKey(nowMs: number): string;
  /** the build `hello` names (`x-build`), or null where none is set */
  build(): string | null;
  /** whether a member's seat is still alive — a removed member's stream ends */
  alive(doc: LoadedDoc, seat: string | null, audience: Audience): boolean;
}

export class EventHub {
  private readonly streams = new Set<Stream>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private closing = false;
  /** every stream ever opened since boot, for `/healthz` */
  opened = 0;
  refused = 0;

  constructor(private readonly deps: HubDeps,
    private readonly opts: { scanMs?: number; heartbeatMs?: number; perSeat?: number; perIp?: number;
      retryBaseMs?: number; retryJitterMs?: number } = {}) {}

  get size(): number { return this.streams.size; }

  /** `/healthz`'s numbers: open now, opened and refused since boot. */
  stats(): { open: number; opened: number; refused: number } {
    return { open: this.streams.size, opened: this.opened, refused: this.refused };
  }

  /**
   * Open a stream on `res`, or refuse it (429, false) past a cap or while the
   * host is closing. The caller has already decided the reader may see this
   * document at all — the view's own guards.
   */
  open(doc: LoadedDoc, res: ServerResponse, audience: Audience, seat: string | null, ip: string,
    nowMs: number): boolean {
    const perSeat = this.opts.perSeat ?? PER_SEAT;
    const perIp = this.opts.perIp ?? PER_IP;
    let bySeat = 0; let byIp = 0;
    for (const s of this.streams) {
      if (s.ip === ip) byIp += 1;
      if (seat !== null && s.doc === doc && s.seat === seat) bySeat += 1;
    }
    if (this.closing || byIp >= perIp || (seat !== null && bySeat >= perSeat)) {
      this.refused += 1;
      res.writeHead(this.closing ? 503 : 429, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: this.closing ? 'closing' : 'too many streams' }));
      return false;
    }
    const { seq, eseq } = this.deps.lengths(doc);
    const retry = (this.opts.retryBaseMs ?? RETRY_BASE_MS)
      + Math.floor(Math.random() * (this.opts.retryJitterMs ?? RETRY_JITTER_MS));
    res.socket?.setNoDelay(true);
    res.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-store, no-transform',
      // a hint to any nginx-shaped proxy in front not to buffer
      'x-accel-buffering': 'no',
    });
    const s: Stream = { doc, res, audience, seat, ip, seq, eseq,
      presence: presenceGen(doc), host: this.deps.hostKey(nowMs), lastWriteMs: nowMs };
    this.streams.add(s);
    this.opened += 1;
    res.write(`retry: ${retry}\nevent: hello\ndata: ${JSON.stringify({ seq, eseq, build: this.deps.build() })}\n\n`);
    res.on('close', () => {
      this.streams.delete(s);
      if (this.streams.size === 0) this.stop();
    });
    this.start();
    return true;
  }

  /** One pass: every streamed document's lengths, the host's key, presence. */
  scan(nowMs: number = Date.now()): void {
    const heartbeatMs = this.opts.heartbeatMs ?? HEARTBEAT_MS;
    const host = this.deps.hostKey(nowMs);
    const lengths = new Map<LoadedDoc, { seq: number; eseq: number; presence: number }>();
    for (const s of [...this.streams]) {
      if (!this.deps.alive(s.doc, s.seat, s.audience)) { s.res.end(); this.streams.delete(s); continue; }
      let l = lengths.get(s.doc);
      if (l === undefined) { l = { ...this.deps.lengths(s.doc), presence: presenceGen(s.doc) }; lengths.set(s.doc, l); }
      if (l.seq !== s.seq || l.eseq !== s.eseq) {
        s.seq = l.seq; s.eseq = l.eseq;
        s.presence = l.presence; s.host = host;
        this.write(s, `event: doc\ndata: ${JSON.stringify({ seq: l.seq, eseq: l.eseq })}\n\n`, nowMs);
        continue;
      }
      // presence is the membership's (E43): only a member's stream hears it move
      const presenceMoved = s.audience === 'member' && l.presence !== s.presence;
      if (host !== s.host || presenceMoved) {
        s.host = host; s.presence = l.presence;
        this.write(s, 'event: nudge\ndata: {}\n\n', nowMs);
        continue;
      }
      if (nowMs - s.lastWriteMs >= heartbeatMs) {
        this.write(s, `: hb\n\n`, nowMs);
        // **an open member page is a page still reading where it last said**
        // (E43): the poll that kept a place inside the TTL is a 30 s backstop
        // now, so the heartbeat keeps it — a page that closes stops being
        // touched and its place goes at the TTL, as it did when it stopped
        // polling
        if (s.audience === 'member' && s.seat !== null) touchPlace(s.doc, s.seat, nowMs);
      }
    }
  }

  /** The spike's finding 1: end every stream at once, before the drain. */
  closeAll(): void {
    this.closing = true;
    this.stop();
    for (const s of this.streams) s.res.end();
    this.streams.clear();
  }

  private write(s: Stream, text: string, nowMs: number): void {
    s.lastWriteMs = nowMs;
    s.res.write(text);
  }

  private start(): void {
    if (this.timer !== null || this.closing) return;
    this.timer = setInterval(() => this.scan(), this.opts.scanMs ?? SCAN_MS);
    this.timer.unref?.();
  }

  private stop(): void {
    if (this.timer === null) return;
    clearInterval(this.timer);
    this.timer = null;
  }
}
