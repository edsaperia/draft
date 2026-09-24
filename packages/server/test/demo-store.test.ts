/**
 * **The demo document on a real server** (design/DEMO.md Stage 1; Q1535):
 * built from Ed's preset at boot, readable at `/d/demo` by a stranger, its
 * address refused to the birth, its decided changes on the spectator feed —
 * and **nothing of it reaching the store** (D1, D3): a spy over the
 * persistence records every write, and none may name a demo id, over the
 * build, the commands a member sends, the minute's tick and a rebuild.
 *
 * And the two boot-time refusals: a restart is a new generation at a new id,
 * and a persisted document already wearing the address is never shadowed.
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { afterAll, describe, expect, it } from 'vitest';
import { createDraftServer } from '../src/server.js';
import type { DraftServer } from '../src/server.js';
import { FilePersistence } from '../src/persistence.js';
import type { Persistence } from '../src/persistence.js';
import { asEngineDoc } from '../src/engine-host.js';
import { cookieName } from '../src/routes.js';

const DESIGN_DIR = join(import.meta.dirname, '..', '..', '..', 'design');

/** The writes a demo document must never make (Stage 1 criterion 2). */
const WRITES = ['createDoc', 'appendDocLog', 'appendEngineLog', 'writeBridgeState',
  'writeProvisional', 'putTokens', 'putOutbox', 'putStash'];

/** A persistence that records every write and the document it names. */
function spied(inner: Persistence): { p: Persistence; calls: { name: string; id: unknown }[] } {
  const calls: { name: string; id: unknown }[] = [];
  const p = new Proxy(inner, {
    get(target, name, recv) {
      const v = Reflect.get(target, name, recv) as unknown;
      if (typeof v !== 'function') return v;
      return (...args: unknown[]) => {
        if (WRITES.includes(String(name))) {
          const first = args[0];
          // the token and outbox writes carry the document inside their rows
          const id = Array.isArray(first) ? JSON.stringify(first) : first;
          calls.push({ name: String(name), id });
        }
        return (v as (...a: unknown[]) => unknown).apply(target, args);
      };
    },
  });
  return { p, calls };
}

interface Booted { base: string; draft: DraftServer; dataDir: string; calls: { name: string; id: unknown }[] }
const booted: Booted[] = [];

async function boot(opts: { demo?: boolean; dataDir?: string } = {}): Promise<Booted> {
  const dataDir = opts.dataDir ?? mkdtempSync(join(tmpdir(), 'draft-demo-'));
  const cfg = {
    port: 0, dataDir, baseUrl: 'http://127.0.0.1', designDir: DESIGN_DIR,
    resendApiKey: null as string | null, mailFrom: 'test <t@example.org>', mailOff: false,
    secret: 'test-secret', store: 'file' as const, databaseUrl: null,
    trustProxy: false, buildSha: null, notifyEmail: null,
    engineTuning: { cooldownMs: 0 },
    demo: opts.demo ?? true,
  };
  const { p, calls } = spied(new FilePersistence(dataDir));
  const draft = await createDraftServer(cfg, p);
  await new Promise<void>((r) => draft.server.listen(0, '127.0.0.1', r));
  cfg.baseUrl = `http://127.0.0.1:${(draft.server.address() as AddressInfo).port}`;
  const b = { base: cfg.baseUrl, draft, dataDir, calls };
  booted.push(b);
  return b;
}
afterAll(async () => { for (const b of booted) await b.draft.close(); });

const demoCalls = (b: Booted) => b.calls.filter((c) => String(c.id).includes('d-demo-'));
const health = async (b: Booted) => (await fetch(b.base + '/healthz')).json() as Promise<{
  documents: number; documentsQuarantined: number;
  demo: { state: string; generation: number; builtAt: number | null };
}>;

describe('the demo document (DEMO.md Stage 1)', () => {
  it('serves /d/demo to a stranger: the title, the decided changes applied, every seeded proposal a live race', async () => {
    const b = await boot();
    expect((await health(b)).demo.state).toBe('built');
    expect((await fetch(b.base + '/d/demo')).status).toBe(200);
    const v = await (await fetch(b.base + '/api/d/demo/view')).json() as {
      title: string; canRead: boolean; text: string; stranger: boolean };
    expect(v.stranger).toBe(true);
    expect(v.canRead).toBe(true);
    expect(v.title).toBe('PizzaCon 2027');
    expect(v.text).toContain('Tuesday 12 to Thursday 14 October 2027');
    expect(v.text).not.toContain('Monday 11');
    const doc = b.draft.store.bySlug('demo')!;
    expect(doc.ephemeral).toBe(true);
    const engine = asEngineDoc(doc).bridge!.engine;
    const live = engine.allCandidates().filter((c) => c.state === 'live' && c.patch);
    expect(live).toHaveLength(22);
    // criterion 7: every multi-site entry is one candidate of that many hunks
    expect(live.filter((c) => c.patch!.hunks.length === 2)).toHaveLength(3);
    expect(engine.allCandidates().filter((c) => c.state === 'adopted' && c.patch)).toHaveLength(4);
  });

  it('holds its address: the birth is told it is taken', async () => {
    const b = await boot();
    const r = await (await fetch(b.base + '/api/slug/demo')).json() as { available: boolean };
    expect(r.available).toBe(false);
  });

  it('puts its decided changes on the spectator feed, as for any document', async () => {
    const b = await boot();
    const f = await (await fetch(b.base + '/api/d/demo/feed')).json() as {
      entries: Array<{ kind: string }> };
    expect(f.entries.filter((e) => e.kind === 'adopted').length).toBe(4);
  });

  it('writes nothing to the store: the build, a member\'s commands, the tick and a rebuild', async () => {
    const b = await boot();
    const doc = b.draft.store.bySlug('demo')!;
    const member = [...doc.cs.memberRecords().values()].find((m) => m.id !== doc.cs.convenorRecord().id)!;
    const cookie = `${cookieName(doc.id)}=${b.draft.auth.cookieFor(doc.id, member.id, Date.now())}`;
    // a member reads (presence is a write, §9.5a) and judges a live race
    const view = await (await fetch(b.base + '/api/d/demo/view', { headers: { cookie } })).json() as {
      seq: number };
    expect(view.seq).toBeGreaterThan(0);
    const engine = asEngineDoc(doc).bridge!.engine;
    const race = engine.races().find((r) => r.members.length > 0)!;
    const res = await fetch(b.base + '/api/d/demo/cmd', {
      method: 'POST', headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ cmd: 'judge-race', args: { a: race.members[0], b: race.incumbentId, outcome: 'b' } }),
    });
    expect(res.status).toBe(200);
    await b.draft.tick();
    const first = doc.id;
    const r = await b.draft.demo.rebuild();
    expect(r.ok).toBe(true);
    // the old generation is gone from memory, the new one serves the address
    expect(b.draft.store.byId(first)).toBeNull();
    expect(b.draft.store.bySlug('demo')!.id).not.toBe(first);
    await b.draft.tick();
    expect(demoCalls(b)).toEqual([]);
    // …and the spy sees what a real document writes, so the silence is the demo's
    await b.draft.store.create('d-realone', {
      title: 'A real document', slug: 'real-one',
      convenor: { id: 'founder', email: 'real@example.org', isMember: true },
    }, Date.now());
    expect(b.calls.map((c) => c.name)).toContain('createDoc');
    expect(b.calls.some((c) => String(c.id).includes('d-realone'))).toBe(true);
  });

  it('a restart is a new generation at a new id, and nothing quarantined', async () => {
    const a = await boot();
    const firstId = a.draft.store.bySlug('demo')!.id;
    await a.draft.close();
    const b = await boot({ dataDir: a.dataDir });
    const h = await health(b);
    expect(h.demo.state).toBe('built');
    expect(b.draft.store.bySlug('demo')!.id).not.toBe(firstId);
    expect(h.documentsQuarantined).toBe(0);
    expect(h.documents).toBe(1);
  });

  it('never shadows a real document that holds the address', async () => {
    const a = await boot({ demo: false });
    expect((await health(a)).demo.state).toBe('off');
    await a.draft.store.create('d-realdemo', {
      title: 'A real document', slug: 'demo',
      convenor: { id: 'founder', email: 'real@example.org', isMember: true },
    }, Date.now());
    await a.draft.close();
    const b = await boot({ dataDir: a.dataDir });
    expect((await health(b)).demo.state).toBe('slug-held');
    const doc = b.draft.store.bySlug('demo')!;
    expect(doc.id).toBe('d-realdemo');
    expect(doc.ephemeral).toBeUndefined();
  });
});
