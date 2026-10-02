/**
 * **The SSE spike's rows** (issue #159): off unless `DRAFT_SPIKE_SSE=1`, and
 * on, a stream that names itself, carries a poke at once, and frees its slot
 * when the reader goes. What the rows measure is the spike's report
 * (plan-scaling.md *Stage notes*); this holds only that they exist when and
 * only when the flag says, and carry nothing but a counter and a clock.
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { afterAll, describe, expect, it } from 'vitest';
import { createDraftServer } from '../src/server.js';
import type { DraftServer } from '../src/server.js';
import { FilePersistence } from '../src/persistence.js';
import { configFromEnv } from '../src/config.js';

const DESIGN_DIR = join(import.meta.dirname, '..', '..', '..', 'design');
const booted: DraftServer[] = [];

async function boot(spikeSse: boolean): Promise<string> {
  const dataDir = mkdtempSync(join(tmpdir(), 'draft-spike-'));
  const cfg = {
    port: 0, dataDir, baseUrl: 'http://127.0.0.1', designDir: DESIGN_DIR,
    resendApiKey: null as string | null, mailFrom: 'test <t@example.org>', mailOff: false,
    secret: 'test-secret', store: 'file' as const, databaseUrl: null,
    trustProxy: false, buildSha: null, notifyEmail: null,
    engineTuning: { cooldownMs: 0 }, spikeSse,
  };
  const draft = await createDraftServer(cfg, new FilePersistence(dataDir));
  await new Promise<void>((r) => draft.server.listen(0, '127.0.0.1', r));
  cfg.baseUrl = `http://127.0.0.1:${(draft.server.address() as AddressInfo).port}`;
  booted.push(draft);
  return cfg.baseUrl;
}
afterAll(async () => { for (const d of booted) await d.close(); });

/** Read events off a stream until `want` of them have arrived. */
async function events(body: ReadableStream<Uint8Array>, want: number,
  onEvent?: (e: { event: string; data: string }) => Promise<void>):
  Promise<Array<{ event: string; data: string }>> {
  const reader = body.getReader();
  const dec = new TextDecoder();
  const out: Array<{ event: string; data: string }> = [];
  let buf = '';
  while (out.length < want) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const block = buf.slice(0, i); buf = buf.slice(i + 2);
      if (block.startsWith(':')) continue;
      const e = { event: 'message', data: '' };
      for (const line of block.split('\n')) {
        if (line.startsWith('event: ')) e.event = line.slice(7);
        if (line.startsWith('data: ')) e.data = line.slice(6);
      }
      out.push(e);
      if (onEvent) await onEvent(e);
    }
  }
  await reader.cancel();
  return out;
}

describe('the SSE spike (issue #159)', () => {
  it('is off unless DRAFT_SPIKE_SSE is exactly 1', async () => {
    expect(configFromEnv({ DRAFT_SECRET: 's' }).spikeSse).toBe(false);
    expect(configFromEnv({ DRAFT_SECRET: 's', DRAFT_SPIKE_SSE: 'true' }).spikeSse).toBe(false);
    expect(configFromEnv({ DRAFT_SECRET: 's', DRAFT_SPIKE_SSE: '1' }).spikeSse).toBe(true);
    const base = await boot(false);
    expect((await fetch(`${base}/api/spike/sse`)).status).toBe(404);
    expect((await fetch(`${base}/api/spike/stats`)).status).toBe(404);
    expect((await fetch(`${base}/api/spike/poke?id=1`, { method: 'POST' })).status).toBe(404);
  });

  it('streams a counter, carries a poke at once, and frees the slot on close', async () => {
    const base = await boot(true);
    const res = await fetch(`${base}/api/spike/sse?every=250`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    const got = await events(res.body!, 3, async (e) => {
      if (e.event !== 'hello') return;
      const { id } = JSON.parse(e.data) as { id: number };
      expect((await fetch(`${base}/api/spike/poke?id=${id}&t=42`, { method: 'POST' })).status).toBe(200);
    });
    expect(got[0]!.event).toBe('hello');
    const poke = got.find((e) => e.event === 'poke');
    expect(poke && (JSON.parse(poke.data) as { t: number }).t).toBe(42);
    // nothing but a counter and a clock: no document, no seat
    for (const e of got) {
      expect(Object.keys(JSON.parse(e.data) as object).every((k) =>
        ['id', 'retry', 't', 'n', 'at'].includes(k))).toBe(true);
    }
    // the reader went; the stream's slot goes with it
    let stats = { streams: -1, opened: 0 };
    for (let i = 0; i < 50 && stats.streams !== 0; i++) {
      await new Promise((r) => setTimeout(r, 20));
      stats = await (await fetch(`${base}/api/spike/stats`)).json() as typeof stats;
    }
    expect(stats.streams).toBe(0);
    expect(stats.opened).toBeGreaterThanOrEqual(1);
  });
});
