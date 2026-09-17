/**
 * `assert-server.mjs` — which server a walk attaches to, and whether it is
 * allowed to (entry 105, 2026-08-27; issue #17's F5, 2026-09-17).
 *
 * The five attaching walks used to pick their server by a literal port, so a
 * run under plan-queue — where the slot carries `PORT=816n` and
 * `DRAFT_BASE_URL=http://127.0.0.1:816n` — walked 8199 and drove whatever
 * happened to answer there. The ladder is the fix, and its whole content is
 * an order of precedence, so that order is what is pinned here.
 *
 * It lives in `@draft/server` because `scripts/` is outside every workspace's
 * vitest and this is the package whose `config.ts` owns both variables it
 * reads (`DRAFT_BASE_URL` for the server's own origin, `PORT` for its port,
 * defaulting to the same 8140 the walks now fall back to). The helper is a
 * `.mjs` under `scripts/`, imported through a computed URL so tsc resolves
 * nothing outside this package's `include`.
 *
 * The sha rung of `assertServerBuild` is deliberately not tested here: its
 * refusal calls `process.exit(2)`, and what the check is worth is the message
 * a person reads, which the journey walk exercises against a server booted
 * with a wrong `DRAFT_BUILD_SHA`.
 *
 * The **devMail** rung is tested, and the same `process.exit(2)` is why it is
 * tested in a child process: what is being asserted is the exit status and
 * the fact that nothing else was asked of the server first, neither of which
 * survives being caught. Two hosts stand for the two cases — one configured
 * the way docs.vote is, with a Resend key, and one the way the `walks` job's
 * server is, without — because the field is the mailer's own branch and a
 * stub would only pin the stub.
 */
import type { AddressInfo } from 'node:net';
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, it, expect, beforeAll } from 'vitest';
import { FilePersistence } from '../src/persistence.js';
import { createDraftServer } from '../src/server.js';
import type { DraftServer } from '../src/server.js';

type WalkBase = (
  argv: string[],
  env: Record<string, string | undefined>,
  fallback: string,
) => string;

const FALLBACK = 'http://127.0.0.1:8140';
const HELPER = new URL('../../../scripts/lib/assert-server.mjs', import.meta.url).href;
let walkBase: WalkBase;

beforeAll(async () => {
  const mod = await import(/* @vite-ignore */ HELPER);
  walkBase = mod.walkBase as WalkBase;
});

describe('walkBase — which server the walk attaches to', () => {
  it('a person naming a URL outranks the environment', () => {
    expect(walkBase(
      ['node', 'scripts/journey-walk.mjs', 'http://127.0.0.1:8170'],
      { DRAFT_BASE_URL: 'http://127.0.0.1:8161', PORT: '8161' },
      FALLBACK,
    )).toBe('http://127.0.0.1:8170');
  });

  it('DRAFT_BASE_URL outranks PORT — it is the origin the server itself uses', () => {
    expect(walkBase(
      ['node', 'scripts/journey-walk.mjs'],
      { DRAFT_BASE_URL: 'https://docs.vote', PORT: '8161' },
      FALLBACK,
    )).toBe('https://docs.vote');
  });

  it('PORT alone gives the loopback at that port', () => {
    expect(walkBase(['node', 'w.mjs'], { PORT: '8163' }, FALLBACK))
      .toBe('http://127.0.0.1:8163');
  });

  it('nothing named gives the fallback, which is the server’s own default', () => {
    expect(walkBase(['node', 'w.mjs'], {}, FALLBACK)).toBe(FALLBACK);
    // flags are not URLs, and neither is the script path
    expect(walkBase(['node', 'w.mjs', '--hat=clerk', '--to=live'], {}, FALLBACK)).toBe(FALLBACK);
  });

  it('one trailing slash is stripped, whichever rung answered', () => {
    expect(walkBase(['node', 'w.mjs', 'http://127.0.0.1:8170/'], {}, FALLBACK))
      .toBe('http://127.0.0.1:8170');
    expect(walkBase(['node', 'w.mjs'], { DRAFT_BASE_URL: 'https://docs.vote/' }, FALLBACK))
      .toBe('https://docs.vote');
  });
});

/* ---- the devMail rung (issue #17, F5) ------------------------------------
   `walkBase` will hand a walk `https://docs.vote` the moment a shell holds
   that DRAFT_BASE_URL — that is the rung above working exactly as designed,
   a person's environment outranking every default. What stops the walk
   there is this rung, and nothing else did: until 2026-09-17
   `assertServerBuild('https://docs.vote', 'probe')` answered APPROVED, and
   the live host was spared only because HEAD was not the deployed commit. */

const booted: DraftServer[] = [];
afterAll(async () => { for (const d of booted) await d.close(); });

/** A host, and the requests it is asked for, from the moment it is up. */
async function host(resendApiKey: string | null):
  Promise<{ base: string; seen: string[] }> {
  const dataDir = mkdtempSync(join(tmpdir(), 'draft-devmail-'));
  const cfg = {
    port: 0, dataDir, baseUrl: 'http://127.0.0.1',
    designDir: join(import.meta.dirname, '..', '..', '..', 'design'),
    resendApiKey, mailFrom: 'test <t@example.org>', mailOff: false, botKey: null,
    secret: 'test-secret', store: 'file' as const, databaseUrl: null,
    trustProxy: false, buildSha: null, notifyEmail: null,
  };
  const draft = await createDraftServer(cfg, new FilePersistence(dataDir));
  const seen: string[] = [];
  draft.server.on('request', (req) => { seen.push(`${req.method} ${req.url}`); });
  await new Promise<void>((r) => draft.server.listen(0, '127.0.0.1', r));
  booted.push(draft);
  return { base: `http://127.0.0.1:${(draft.server.address() as AddressInfo).port}`, seen };
}

/**
 * `assertServerBuild` in a child, because its refusal is `process.exit(2)`.
 * **Asynchronously**, and that is not a style choice: the host it is about to
 * ask is listening in *this* process, so a `spawnSync` deadlocks — the child
 * waits on a reply from an event loop the sync call is holding still.
 */
function assertIn(base: string): Promise<{ code: number; err: string }> {
  const child = spawn(process.execPath, ['--input-type=module', '-e',
    `const m = await import(${JSON.stringify(HELPER)});\n`
    + `await m.assertServerBuild(${JSON.stringify(base)}, 'the test');`,
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  let err = '';
  child.stdout.setEncoding('utf8').on('data', (c: string) => { err += c; });
  child.stderr.setEncoding('utf8').on('data', (c: string) => { err += c; });
  return new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', (code) => resolve({ code: code ?? -1, err }));
  });
}

describe('assertServerBuild refuses a host that is not a dev server', () => {
  it('a host with a Resend key — what docs.vote is — reports devMail false and is refused', async () => {
    const { base, seen } = await host('not-a-real-key');
    const health = await (await fetch(`${base}/healthz`)).json() as { devMail: unknown };
    expect(health.devMail).toBe(false);

    const { code, err } = await assertIn(base);
    expect(code).toBe(2);
    expect(err).toContain('not a dev server');
    expect(err).toContain('devMail false');
    // and it says what would have happened, which is the point of refusing
    expect(err).toMatch(/found a real document/);

    // **Before any write** (the issue's definition of done): the whole
    // conversation with the host is the one GET this check makes. The
    // `/healthz` above is the test's own, so exactly two are expected and
    // neither of them is a POST.
    expect(seen).toEqual(['GET /healthz', 'GET /healthz']);
  });

  it('a host without one — what the walks job boots — reports devMail true and is approved', async () => {
    const { base } = await host(null);
    const health = await (await fetch(`${base}/healthz`)).json() as { devMail: unknown };
    expect(health.devMail).toBe(true);

    const { code, err } = await assertIn(base);
    expect(code, `the walks' own kind of server must pass: ${err}`).toBe(0);
  });
});
