/**
 * **The error log** (Q1330; Ed, 2026-09-11: *refusals should print an error
 * on screen with a debug message, and create some kind of error log we can
 * debug*). Three things: a refused command lands one line in
 * `errors.jsonl` with the reason the wire got, the seat as its **id** and
 * never its address, the command and its arguments; a command the
 * whitelist refuses lands the same way; and the dev route serves the tail
 * newest first. The page half — the sentence under the control and the
 * line at the foot of the window — is `npm run journey`'s *refusal prints*.
 */
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { afterAll, describe, expect, it } from 'vitest';
import { ARGS_CAP, ERROR_LOG_FILE, capArgs, errorTail, logError } from '../src/error-log.js';
import { FilePersistence } from '../src/persistence.js';
import { createDraftServer } from '../src/server.js';
import type { DraftServer } from '../src/server.js';

const tmp = () => mkdtempSync(join(tmpdir(), 'draft-errors-'));

type Row = { at: number; kind: string; status: number; method: string; path: string;
  doc?: string; slug?: string; seat?: string; cmd?: string; args?: string; argsTruncated?: true; reason: string };
const rows = (dir: string): Row[] =>
  existsSync(join(dir, ERROR_LOG_FILE))
    ? readFileSync(join(dir, ERROR_LOG_FILE), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as Row)
    : [];

describe('the error log file', () => {
  it('caps the arguments and says so, and a write that cannot happen does not throw', () => {
    expect(capArgs({ a: 1 })).toEqual({ args: '{"a":1}' });
    const big = capArgs({ picture: 'x'.repeat(ARGS_CAP * 2) });
    expect(big.args).toHaveLength(ARGS_CAP);
    expect(big.argsTruncated).toBe(true);
    // a data dir that is a file: mkdir and append both fail, and neither throws out
    const dir = tmp();
    expect(() => logError(join(dir, 'not-a-dir', 'x\0y'), { kind: 'refused', status: 400,
      method: 'POST', path: '/x', reason: 'r' })).not.toThrow();
    expect(errorTail(dir)).toEqual([]);
  });
});

/* ---- over a real socket ------------------------------------------------- */

const booted: DraftServer[] = [];
afterAll(async () => { for (const d of booted) await d.close(); });

async function boot(): Promise<{ base: string; dataDir: string; draft: DraftServer }> {
  const dataDir = tmp();
  const cfg = {
    port: 0, dataDir, baseUrl: 'http://127.0.0.1',
    designDir: join(import.meta.dirname, '..', '..', '..', 'design'),
    resendApiKey: null, mailFrom: 'test <t@example.org>', mailOff: false,
    secret: 'test-secret', store: 'file' as const, databaseUrl: null,
    trustProxy: false, buildSha: null, notifyEmail: null,
  };
  const draft = await createDraftServer(cfg, new FilePersistence(dataDir));
  await new Promise<void>((r) => draft.server.listen(0, '127.0.0.1', r));
  cfg.baseUrl = `http://127.0.0.1:${(draft.server.address() as AddressInfo).port}`;
  booted.push(draft);
  return { base: cfg.baseUrl, dataDir, draft };
}

const post = (base: string, path: string, body: unknown, cookie?: string) =>
  fetch(base + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: base, ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });

/** Follow a magic link the way the interstitial does: GET, then POST the token back. */
async function follow(link: string): Promise<string> {
  const u = new URL(link);
  await fetch(u.origin + u.pathname + u.search);
  const r = await fetch(u.origin + u.pathname, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', origin: u.origin },
    body: new URLSearchParams({ token: u.searchParams.get('token') ?? '' }).toString(),
    redirect: 'manual',
  });
  expect(r.status).toBe(302);
  return (r.headers.get('set-cookie') ?? '').split(';')[0]!;
}

describe('a refused command lands in the error log (Q1330)', () => {
  it('one line per refusal: the reason the wire got, the seat id and never the address, the command and its arguments; the dev route serves the tail newest first', async () => {
    const { base, dataDir } = await boot();
    const EMAIL = 'ada.refused@example.org';
    const created = await (await post(base, '/api/docs', { title: 'Refusals', email: EMAIL }))
      .json() as { ok: boolean; slug: string; devLink: string };
    expect(created.ok).toBe(true);
    const ada = await follow(created.devLink);
    const me = ((await (await fetch(`${base}/api/d/${created.slug}/view`, { headers: { cookie: ada } }))
      .json()) as { me: string }).me;
    expect(me).toBeTruthy();
    expect(me).not.toContain('@');
    // nothing yet: the creation and the login refused nothing
    expect(rows(dataDir)).toEqual([]);

    // an answer on a setting that is not collecting — the moon room's own
    // refusal (Q1330's report): the module says no, the wire says 400
    const refused = await post(base, `/api/d/${created.slug}/cmd`,
      { cmd: 'answer', args: { setting: 'chamber', value: { rung: 'link' } } }, ada);
    expect(refused.status).toBe(400);
    const said = ((await refused.json()) as { error: string }).error;
    expect(said).toBeTruthy();
    let logged = rows(dataDir);
    expect(logged).toHaveLength(1);
    expect(logged[0]).toMatchObject({ kind: 'refused', status: 400, method: 'POST',
      path: `/api/d/${created.slug}/cmd`, slug: created.slug, seat: me, cmd: 'answer',
      args: '{"setting":"chamber","value":{"rung":"link"}}', reason: said });
    expect(typeof logged[0]!.at).toBe('number');
    expect(logged[0]!.doc).toMatch(/^d-/);

    // a command the whitelist does not know is refused and logged the same way
    const unknown = await post(base, `/api/d/${created.slug}/cmd`, { cmd: 'no-such-command', args: { x: 1 } }, ada);
    expect(unknown.status).toBe(400);
    logged = rows(dataDir);
    expect(logged).toHaveLength(2);
    expect(logged[1]).toMatchObject({ kind: 'refused', cmd: 'no-such-command', args: '{"x":1}',
      seat: me, reason: "unknown command 'no-such-command'" });

    // the seat is its id: the founder's address is in the people rows and nowhere in this file
    const file = readFileSync(join(dataDir, ERROR_LOG_FILE), 'utf8');
    expect(file).not.toContain(EMAIL);
    expect(file).not.toContain('example.org');

    // a request that the route refused before any command — a body that is
    // not JSON — is the catch's to log, with the path and the reason
    const bad = await fetch(`${base}/api/d/${created.slug}/cmd`,
      { method: 'POST', headers: { 'content-type': 'application/json', origin: base, cookie: ada }, body: '{not json' });
    expect(bad.status).toBe(400);
    logged = rows(dataDir);
    expect(logged).toHaveLength(3);
    expect(logged[2]).toMatchObject({ kind: 'refused', status: 400, method: 'POST', path: `/api/d/${created.slug}/cmd` });
    expect(logged[2]!.cmd).toBeUndefined();
    expect(logged[2]!.reason).toBeTruthy();

    // the dev route: the same rows, newest first
    const tail = (await (await fetch(`${base}/api/dev/errors`)).json()) as { errors: Row[] };
    expect(tail.errors.map((r) => r.cmd ?? r.path)).toEqual(
      [`/api/d/${created.slug}/cmd`, 'no-such-command', 'answer']);
    expect(errorTail(dataDir, 1)).toHaveLength(1);
  });
});
