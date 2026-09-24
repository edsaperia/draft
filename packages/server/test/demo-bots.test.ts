/**
 * **The demo's bots** (design/DEMO.md Stage 4 criteria 1–3; Q1535), on the stub
 * model — no test here, or anywhere, calls the Claude API.
 *
 * Driven against an ordinary dev-server document the phase ladder builds to
 * its *session* rung (a real, busy document with a room of members), which is
 * what the bots meet before the demo document itself is on this branch: the
 * target is the one seam between them (`demo-target.ts`).
 */
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { afterAll, describe, expect, it } from 'vitest';
import { authorVisible } from '../../engine-core/src/participant-api.js';
import { view } from '../../constitution/src/index.js';
import { FilePersistence } from '../src/persistence.js';
import { createDraftServer } from '../src/server.js';
import type { DraftServer, DraftServerOptions } from '../src/server.js';
import { StubDemoModel } from '../src/demo-model-stub.js';
import type { DemoModel, DemoModelInfo } from '../src/demo-model.js';
import { documentTarget } from '../src/demo-target.js';
import type { DemoTarget } from '../src/demo-target.js';
import { judgeInput } from '../src/demo-bots.js';
import { mintDemoCookie, DEMO_COOKIE, forgetGuesses } from '../src/demo-access.js';
import { asEngineDoc } from '../src/engine-host.js';
import { raceView } from '../src/views.js';
import type { LoadedDoc } from '../src/store.js';

const booted: DraftServer[] = [];
afterAll(async () => { for (const d of booted) await d.close(); });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(what: string, f: () => boolean, ms = 10_000): Promise<void> {
  const end = Date.now() + ms;
  while (!f()) {
    if (Date.now() > end) throw new Error(`timed out waiting for ${what}`);
    await sleep(25);
  }
}

/** Every input a model was shown, for the blindness assertion. */
const shown: Array<{ kind: string; input: unknown }> = [];
const recording = (info: DemoModelInfo): DemoModel => {
  const stub = new StubDemoModel(info);
  return {
    info,
    judge: (p, c) => { shown.push({ kind: 'judge', input: c }); return stub.judge(p, c); },
    propose: (p, d) => { shown.push({ kind: 'propose', input: d }); return stub.propose(p, d); },
    answerMotion: (p, m) => { shown.push({ kind: 'motion', input: m }); return stub.answerMotion(p, m); },
  };
};

async function boot(opts: DraftServerOptions & { demoKey?: string | null } = {}):
  Promise<{ base: string; draft: DraftServer }> {
  const dataDir = mkdtempSync(join(tmpdir(), 'draft-demobots-'));
  const cfg = {
    port: 0, dataDir, baseUrl: 'http://127.0.0.1',
    designDir: join(import.meta.dirname, '..', '..', '..', 'design'),
    resendApiKey: null, mailFrom: 'test <t@example.org>', mailOff: false,
    botKey: null, adminKey: 'admin-key', demoKey: opts.demoKey === undefined ? 'walk' : opts.demoKey,
    secret: 'test-secret', store: 'file' as const, databaseUrl: null,
    trustProxy: false, buildSha: null, notifyEmail: null,
    engineTuning: { cooldownMs: 0 },
  };
  const draft = await createDraftServer(cfg, new FilePersistence(dataDir), {
    demoModel: opts.demoModel ?? recording,
    demoBots: { paceMs: [40, 120], watchMs: 25, lapseMs: 60_000, runMs: 600_000, capUsd: 100, ...opts.demoBots },
    ...(opts.demoTarget ? { demoTarget: opts.demoTarget } : {}),
  });
  await new Promise<void>((r) => draft.server.listen(0, '127.0.0.1', r));
  cfg.baseUrl = `http://127.0.0.1:${(draft.server.address() as AddressInfo).port}`;
  booted.push(draft);
  return { base: cfg.baseUrl, draft };
}

const post = (base: string, path: string, body: unknown, headers: Record<string, string> = {}) =>
  fetch(base + path, { method: 'POST',
    headers: { 'content-type': 'application/json', origin: base, ...headers }, body: JSON.stringify(body) });

/** A busy document: the phase ladder to its session rung. */
async function ladder(base: string, draft: DraftServer, seed: number): Promise<LoadedDoc> {
  const r = await post(base, '/api/dev/ladder', { to: 'session', seed });
  expect(r.status, await r.clone().text()).toBe(200);
  const { slug } = await r.json() as { slug: string };
  return draft.store.bySlug(slug)!;
}

const engineLen = (doc: LoadedDoc): number => asEngineDoc(doc).bridge?.engine.log.length ?? 0;

describe('the bots act through applyCommand alone (criterion 1)', () => {
  it('demo-bots.ts imports applyCommand and mutates nothing itself', () => {
    const src = readFileSync(join(import.meta.dirname, '..', 'src', 'demo-bots.ts'), 'utf8')
      // comments may name what the code must not do
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(src).toMatch(/import \{ applyCommand \} from '\.\/apply-command\.js'/);
    // the only thing read off a session directly is the document's slug, for
    // the error log's path; every other read is view() and raceView()
    const csCalls = [...src.matchAll(/\.cs\.(\w+)/g)].map((m) => m[1]);
    expect(new Set(csCalls)).toEqual(new Set(['slug']));
    expect(src).not.toMatch(/bridge|runCommand|engine-host|\.persist\(|writes\.commit|\bstore\.\w+\(/);
    // the one import that may reach the document's module is `view`, a read
    expect(src).toMatch(/import \{ view \} from '\.\.\/\.\.\/constitution\/src\/index\.js'/);
  });
});

describe('a run on the stub model', () => {
  it('judges, proposes (a swap among them), OKs, and grows the log', async () => {
    const { base, draft } = await boot();
    const doc = await ladder(base, draft, 7);
    draft.demoBots.setTarget(documentTarget(doc));
    const before = engineLen(doc) + doc.cs.logEntries().length;
    expect(draft.demoBots.start({ count: 4, pace: 'frantic' })).toEqual({ ok: true });
    const beat = setInterval(() => draft.demoBots.beat(), 200);
    try {
      await until('a judgment, a proposal and a swap', () => {
        const a = draft.demoBots.stats().acts;
        return a.judgments >= 1 && a.proposals >= 2 && a.swaps >= 1;
      }, 20_000);
    } finally { clearInterval(beat); }
    draft.demoBots.pause('hand');
    const s = draft.demoBots.stats();
    expect(s.state).toBe('paused');
    expect(s.pausedBy).toBe('hand');
    expect(engineLen(doc) + doc.cs.logEntries().length).toBeGreaterThan(before);
    // **a swap is one candidate of two hunks**, proposed by a bot
    const bots = new Set(draft.demoBots.stats().seats > 0 ? documentTarget(doc).botSeats().map((b) => b.id) : []);
    const engine = asEngineDoc(doc).bridge!.engine;
    const swaps = engine.allCandidates().filter((c) => bots.has(c.author) && (c.patch?.hunks.length ?? 0) === 2);
    expect(swaps.length).toBeGreaterThanOrEqual(1);
    // the spend meter priced the stub's usage
    expect(s.calls).toBeGreaterThan(0);
    expect(s.runUsd).toBeGreaterThan(0);
  }, 60_000);

  it('a model is shown what the member is served and nothing more (criterion 2)', async () => {
    // the structural half, over every input the recording model was shown
    expect(shown.length).toBeGreaterThan(0);
    for (const { kind, input } of shown) {
      if (kind === 'judge') {
        const j = input as Record<string, unknown>;
        expect(Object.keys(j).sort()).toEqual(['a', 'b', 'subtype']);
        for (const side of ['a', 'b']) {
          for (const k of Object.keys(j[side] as object)) {
            expect(['changes', 'rationale', 'current', 'proposer']).toContain(k);
          }
        }
      } else if (kind === 'propose') {
        const p = input as Record<string, unknown>;
        expect(Object.keys(p).sort()).toEqual(['blocks', 'lines', 'live', 'wallet']);
        for (const l of p.live as object[]) expect(Object.keys(l).sort()).toEqual(['end', 'lines', 'start']);
      }
    }
    // no standing crosses: none of the engine's numbers appears as a field
    const text = JSON.stringify(shown);
    for (const k of ['"closeness"', '"judges"', '"floor"', '"standing"', '"p":', '"approvals"', '"author"']) {
      expect(text).not.toContain(k);
    }
  });

  it('a proposer is named to the model exactly where the card names them (§3.5a)', async () => {
    const { base, draft } = await boot();
    const doc = await ladder(base, draft, 11);
    const engine = asEngineDoc(doc).bridge!.engine;
    let checked = 0;
    for (const seat of documentTarget(doc).botSeats().slice(0, 6)) {
      const rv = raceView(doc, seat.id, Date.now());
      const m = view(doc.cs, seat.id);
      for (const card of rv.raceCards as Array<{ a: { id: string; incumbent?: boolean; setting?: unknown }; b: { id: string; incumbent?: boolean; setting?: unknown } }>) {
        if (card.a.setting !== undefined || card.b.setting !== undefined) continue;
        const input = judgeInput(card as never, m);
        for (const side of ['a', 'b'] as const) {
          const o = card[side];
          if (o.incumbent) { expect(input[side].proposer).toBeUndefined(); continue; }
          const c = engine.getCandidate(o.id);
          const visible = authorVisible(c, engine.constitution, { closed: engine.closed });
          if (!visible) expect(input[side].proposer).toBeUndefined();
          checked += 1;
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
  }, 60_000);
});

describe('pauses and stops (criterion 3)', () => {
  it('pauses on the heartbeat lapse, the run clock and the spend cap; ▶️ resumes', async () => {
    const { base, draft } = await boot({ demoBots: { lapseMs: 400 } });
    const doc = await ladder(base, draft, 3);
    const bots = draft.demoBots;
    bots.setTarget(documentTarget(doc));
    expect(bots.start({ count: 3, pace: 'frantic' })).toEqual({ ok: true });
    // no beat: paused by the heartbeat within lapse + one watchdog tick
    const t0 = Date.now();
    await until('the heartbeat pause', () => bots.stats().pausedBy === 'heartbeat', 3_000);
    expect(Date.now() - t0).toBeLessThan(400 + 400);
    // …and nothing moves while paused
    await sleep(150); // an act already in flight may land
    const frozen = engineLen(doc) + doc.cs.logEntries().length;
    await sleep(500);
    expect(engineLen(doc) + doc.cs.logEntries().length).toBe(frozen);
    // the run clock
    bots.tune({ lapseMs: 60_000, runMs: 300 });
    expect(bots.resume()).toEqual({ ok: true });
    expect(bots.stats().state).toBe('running');
    await until('the run-clock pause', () => bots.stats().pausedBy === 'run-clock', 3_000);
    // the spend cap: a fresh run total on ▶️, paused once it reaches the cap
    bots.tune({ runMs: 600_000, capUsd: 0.02 });
    expect(bots.resume()).toEqual({ ok: true });
    expect(bots.stats().runUsd).toBe(0);
    const beat = setInterval(() => bots.beat(), 100);
    try {
      await until('the spend pause', () => bots.stats().pausedBy === 'spend', 20_000);
    } finally { clearInterval(beat); }
    expect(bots.stats().runUsd).toBeGreaterThanOrEqual(0.02);
    // ⏸️ by hand, and ⏹️
    bots.tune({ capUsd: 100 });
    bots.resume();
    bots.pause('hand');
    expect(bots.stats().pausedBy).toBe('hand');
    bots.stop('reset');
    expect(bots.stats()).toMatchObject({ state: 'stopped', stoppedBy: 'reset' });
    expect(bots.resume()).toMatchObject({ ok: false });
  }, 60_000);

  it('stops when the document is reset under it (a new generation)', async () => {
    const { base, draft } = await boot();
    const doc = await ladder(base, draft, 5);
    let generation = 1;
    const base_ = documentTarget(doc);
    const target: DemoTarget = { doc: () => doc, generation: () => generation, botSeats: () => base_.botSeats() };
    draft.demoBots.setTarget(target);
    draft.demoBots.start({ count: 2, pace: 'frantic' });
    generation = 2;
    await until('the stop', () => draft.demoBots.stats().stoppedBy === 'target-gone', 3_000);
  }, 60_000);

  it('stops at the announced pause (the first 503)', async () => {
    const { base, draft } = await boot();
    const doc = await ladder(base, draft, 9);
    draft.demoBots.setTarget(documentTarget(doc));
    draft.demoBots.start({ count: 3, pace: 'frantic' });
    const beat = setInterval(() => draft.demoBots.beat(), 100);
    try {
      const r = await post(base, '/api/admin/pause', { expectedMs: 60_000 }, { authorization: 'Bearer admin-key' });
      expect(r.status).toBe(200);
      await until('the host-paused stop', () => draft.demoBots.stats().stoppedBy === 'host-paused', 10_000);
    } finally {
      clearInterval(beat);
      await post(base, '/api/admin/resume', {}, { authorization: 'Bearer admin-key' });
    }
  }, 60_000);
});

describe('the panel routes are Ed’s alone', () => {
  it('404 with no demo key on the host, byte-identical to an unknown path', async () => {
    const { base } = await boot({ demoKey: null });
    for (const [method, path] of [['GET', '/api/demo/bots'], ['POST', '/api/demo/bots'], ['POST', '/api/demo/heartbeat']] as const) {
      const r = await fetch(base + path, { method, headers: { 'content-type': 'application/json', origin: base },
        ...(method === 'POST' ? { body: '{}' } : {}) });
      expect(r.status).toBe(404);
      expect(await r.text()).toBe(await (await fetch(base + '/api/nothing-here')).text());
    }
  });

  it('401 without the cookie, 200 with it, 403 from another site', async () => {
    forgetGuesses(); // the guess lock is per process; this test counts three wrong tries of its own
    const { base, draft } = await boot();
    expect((await fetch(base + '/api/demo/bots')).status).toBe(401);
    expect((await post(base, '/api/demo/heartbeat', {})).status).toBe(401);
    const wrong = `${DEMO_COOKIE}=${mintDemoCookie('another-key', Date.now())}`;
    expect((await fetch(base + '/api/demo/bots', { headers: { cookie: wrong } })).status).toBe(401);
    const cookie = `${DEMO_COOKIE}=${mintDemoCookie('walk', Date.now())}`;
    const r = await fetch(base + '/api/demo/bots', { headers: { cookie } });
    expect(r.status).toBe(200);
    const s = await r.json() as { state: string; models: Array<{ id: string }>; claudeKey: boolean };
    expect(s.state).toBe('idle');
    expect(s.models.map((m) => m.id)).toEqual(['claude-haiku-4-5', 'claude-sonnet-5', 'claude-opus-5-5']);
    expect((await post(base, '/api/demo/heartbeat', {}, { cookie, origin: 'https://evil.example' })).status).toBe(403);
    // ▶️ with no document to act in is a refusal the panel can print
    const start = await post(base, '/api/demo/bots', { action: 'start' }, { cookie });
    expect(start.status).toBe(409);
    // the dev target route, then ▶️ through the panel's own route
    const doc = await ladder(base, draft, 13);
    expect((await post(base, '/api/dev/demo-target', { slug: doc.cs.slug }, { cookie })).status).toBe(200);
    const go = await post(base, '/api/demo/bots', { action: 'start', count: 2, pace: 'calm' }, { cookie });
    expect(go.status).toBe(200);
    expect((await post(base, '/api/demo/heartbeat', {}, { cookie })).status).toBe(200);
    expect((await post(base, '/api/demo/bots', { action: 'pause' }, { cookie })).status).toBe(200);
    expect(draft.demoBots.stats()).toMatchObject({ state: 'paused', pausedBy: 'hand', count: 2, pace: 'calm' });
  }, 60_000);
});
