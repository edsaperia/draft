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
import { ARGS_CAP, PAGE_CAPS, capArgs, logError,
  newRaceCounts, noteRace, pageErrorOf, raceRefusal } from '../src/error-log.js';
import { ERROR_LOG_FILE, FilePersistence } from '../src/persistence.js';
import { createDraftServer } from '../src/server.js';
import type { DraftServer } from '../src/server.js';

const tmp = () => mkdtempSync(join(tmpdir(), 'draft-errors-'));

type Row = { at: number; kind: string; status?: number; method?: string; path: string;
  doc?: string | null; slug?: string | null; seat?: string | null; cmd?: string;
  args?: string; argsTruncated?: true;
  source?: string; line?: number; col?: number; build?: string | null; reason: string };
const rows = (dir: string): Row[] =>
  existsSync(join(dir, ERROR_LOG_FILE))
    ? readFileSync(join(dir, ERROR_LOG_FILE), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as Row)
    : [];

describe('the error log', () => {
  it('caps the arguments and says so, and a write that cannot happen does not throw', async () => {
    expect(capArgs({ a: 1 })).toEqual({ args: '{"a":1}' });
    const big = capArgs({ picture: 'x'.repeat(ARGS_CAP * 2) });
    expect(big.args).toHaveLength(ARGS_CAP);
    expect(big.argsTruncated).toBe(true);
    // **a store that refuses must not take the request with it** — every
    // caller is inside a request's catch, so `logError` neither throws nor
    // returns a promise anybody waits on, and a Postgres insert that
    // rejects (plan stage 5a) is one console line. A rejection nobody
    // caught would fail this run by itself, which is the assertion.
    const row = { kind: 'refused' as const, status: 400, method: 'POST', path: '/x', reason: 'r' };
    // a store that throws where it stands — a data dir that is a file
    expect(() => logError({ appendError: () => { throw new Error('ENOTDIR'); } }, row)).not.toThrow();
    // …and one that rejects, which is what a Postgres insert does
    expect(() => logError({ appendError: () => Promise.reject(new Error('pg is down')) }, row))
      .not.toThrow();
    await new Promise((r) => setTimeout(r, 20));
    // and a store that works writes exactly one line, read back through the seam
    const p = new FilePersistence(tmp());
    logError(p, row, 99);
    await new Promise((r) => setTimeout(r, 20));
    expect(await p.readErrors()).toEqual([{ at: 99, ...row }]);
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
    expect(await new FilePersistence(dataDir).readErrors(1)).toHaveLength(1);
  });

  /**
   * **The whitelist is the table's own keys** (issue #5). `HANDLERS[cmd]`
   * reached Object.prototype, so a seated member posting `constructor` got
   * `Object`, whose call on the session hands back the live session — and
   * the route serialised it into the reply, log and all, every other
   * member's blind answers included (SPEC §3.5). An inherited name is now
   * refused exactly as a misspelt one is: the same status, the same
   * sentence, no hint that the name means anything.
   */
  it('an inherited key is not a command', async () => {
    const { base, dataDir, draft } = await boot();
    const created = await (await post(base, '/api/docs', { title: 'Keys', email: 'ada.keys@example.org' }))
      .json() as { slug: string; devLink: string };
    const ada = await follow(created.devLink);
    // a plain member, not the founder: the hole was open to any seat
    expect((await post(base, `/api/d/${created.slug}/cmd`,
      { cmd: 'invite', args: { email: 'bo.keys@example.org' } }, ada)).status).toBe(200);
    await draft.outbox.drain();
    const invite = readFileSync(join(dataDir, 'outbox.jsonl'), 'utf8').split('\n').filter(Boolean)
      .map((l) => JSON.parse(l) as { to: string; link?: string })
      .filter((m) => m.to === 'bo.keys@example.org').pop();
    const bo = await follow(invite!.link!);

    for (const cmd of ['constructor', 'toString', '__proto__', 'hasOwnProperty', 'valueOf']) {
      const r = await post(base, `/api/d/${created.slug}/cmd`, { cmd, args: {} }, bo);
      expect(r.status, cmd).toBe(400);
      expect(await r.json(), cmd).toEqual({ error: `unknown command '${cmd}'` });
    }

    // and a real command from the same seat still works
    const named = await post(base, `/api/d/${created.slug}/cmd`,
      { cmd: 'set-identity', args: { name: 'Bo' } }, bo);
    expect(named.status).toBe(200);
    expect(await named.json()).toMatchObject({ ok: true });
  });
});

/**
 * **The refusals nobody did anything wrong to meet** (Q1493 (a); Ed,
 * 2026-09-21: *The page handles both*). Sixteen of the nh2026 convention's
 * forty refusals were a race with the 4 s poll — a judgment on a pair that
 * closed since the card was drawn, a proposal pressed in the second after
 * somebody else's adoption. The page answers both itself, so they are
 * counted on `/healthz` and kept out of a log whose whole use is that an
 * operator reads every line of it.
 */
describe('a race with the poll is tallied, not logged (Q1493 (a))', () => {
  it('names the two kinds by the command and the sentence together, and nothing else', () => {
    expect(raceRefusal('judge-race', 'candidate c1 is not in a live race')).toBe('judged-closed');
    expect(raceRefusal('judge-race', 'candidate is not live')).toBe('judged-closed');
    expect(raceRefusal('judge-race', 'stale card: incumbent text has changed')).toBe('judged-closed');
    expect(raceRefusal('propose-text', 'patch targets version 40; current is 41')).toBe('stale-version');
    expect(raceRefusal('rebase-text', 'patch targets version 3; current is 4')).toBe('stale-version');
    // the sentence alone is not enough: the same words from another door are
    // a different fact, and the version guard's *sibling* refusal is a claim
    // about the wording rather than a race (R-136)
    expect(raceRefusal('answer', 'candidate c1 is not in a live race')).toBeNull();
    expect(raceRefusal('judge-race', 'you may not judge yet')).toBeNull();
    expect(raceRefusal('propose-text', 'the text at lines 3–4 is not what this proposal replaces')).toBeNull();
    expect(raceRefusal('propose-text', 'insufficient ✏️ for the stake (§7)')).toBeNull();
    expect(raceRefusal(null, 'patch targets version 1; current is 2')).toBeNull();
    const c = newRaceCounts();
    noteRace(c, 'judged-closed', 111);
    noteRace(c, 'stale-version', 222);
    noteRace(c, 'stale-version', 333);
    expect(c).toEqual({ total: 3, 'judged-closed': 1, 'stale-version': 2,
      last: { at: 333, kind: 'stale-version' } });
  });

  it('the wire still refuses, /healthz counts it by kind, and the error log stays empty', async () => {
    const { base, dataDir } = await boot();
    const created = await (await post(base, '/api/docs',
      { title: 'Races', email: 'ada.races@example.org' })).json() as { slug: string; devLink: string };
    const ada = await follow(created.devLink);
    const cmd = async (name: string, args: unknown): Promise<Response> =>
      post(base, `/api/d/${created.slug}/cmd`, { cmd: name, args }, ada);
    expect((await cmd('set-convenor-membership', { isMember: true })).status).toBe(200);
    expect((await cmd('confirm-starting-text', { text: 'One line stands here.' })).status).toBe(200);
    const values: Record<string, unknown> = {
      ending: { endsAtMs: null }, rate: { grant: 4, cap: 8, dripMinutes: 240 },
      quorum: { form: 'count', n: 1 }, chamber: { rung: 'link' },
      authorship: { rung: 'sealed' }, judgments: { rung: 'after' },
      applications: { apply: false }, admission: { price: 'assembly' },
      machines: { enabled: false, budget: 0 }, lapse: { afterMs: null },
    };
    for (const [setting, value] of Object.entries(values)) {
      await cmd('reclaim', { setting });
      expect((await cmd('set-setting', { setting, value })).status, setting).toBe(200);
    }
    expect((await cmd('begin', {})).status).toBe(200);

    // a proposal against a version the document has moved past — the whole of
    // what the convention's members met in the second after an adoption
    const stale = await cmd('propose-text', { baseVersion: 99, why: 'again',
      hunks: [{ start: 0, end: 1, lines: ['One line stands here, and is plainer.'],
        was: ['One line stands here.'] }] });
    expect(stale.status).toBe(400);
    expect(((await stale.json()) as { error: string }).error).toMatch(/^patch targets version 99; current is \d+$/);
    // …and one that is not a race with the poll is logged exactly as before
    const other = await cmd('answer', { setting: 'chamber', value: { rung: 'link' } });
    expect(other.status).toBe(400);

    const logged = rows(dataDir);
    expect(logged.map((r) => r.cmd)).toEqual(['answer']);
    const health = (await (await fetch(`${base}/healthz`)).json()) as
      { races: { total: number; 'judged-closed': number; 'stale-version': number;
        last: null | { kind: string } } };
    expect(health.races.total).toBe(1);
    expect(health.races['stale-version']).toBe(1);
    expect(health.races['judged-closed']).toBe(0);
    expect(health.races.last?.kind).toBe('stale-version');
  });
});

/**
 * **The page reports its own uncaught errors** (plan stage 5b, after the
 * nh2026 convention). A production route, so what it accepts *is* the
 * privacy story, and this is where the limits are proved: only the listed
 * fields are read, the seat and the build are the host's, no text a member
 * typed can ride in, a path arrives without its query, and the rate limit
 * holds. The page half — the two handlers and the brake — is
 * `npm run journey`'s *page error* step.
 */
describe('the page reports its own errors (stage 5b)', () => {
  it('reads the listed fields and nothing else, and caps what it reads', () => {
    const at = { seat: 'm-4', doc: 'd-1', slug: 'moon', build: 'abc1234' };
    expect(pageErrorOf({ message: "TypeError: undefined is not an object (evaluating 'x.y')",
      source: 'http://127.0.0.1:8140/session.js?v=3', line: 4212.7, col: 17,
      path: '/d/moon?token=SECRET#x', slug: 'moon' }, at)).toEqual({
      kind: 'page', path: '/d/moon', doc: 'd-1', slug: 'moon', seat: 'm-4', build: 'abc1234',
      source: '/session.js', line: 4212, col: 17,
      reason: "TypeError: undefined is not an object (evaluating 'x.y')",
    });

    // **the whole of what is kept is what is listed**: a body may say
    // anything and none of it becomes a line
    const rich = pageErrorOf({ message: 'boom', stack: 'at draft (/session.js:1)\nat b',
      text: 'the clause a member was typing', seat: 'm-99', build: 'forged',
      args: { picture: 'x'.repeat(50_000) }, cmd: 'propose-text', status: 500 }, at)!;
    expect(Object.keys(rich).sort()).toEqual(
      ['build', 'doc', 'kind', 'path', 'reason', 'seat', 'slug']);
    expect(rich.seat).toBe('m-4');
    expect(rich.build).toBe('abc1234');
    expect(JSON.stringify(rich)).not.toContain('typing');

    // a long message is capped, and its whitespace collapsed first, so a
    // pasted paragraph cannot ride in on a newline
    const long = pageErrorOf({ message: 'x'.repeat(PAGE_CAPS.message * 3) }, at)!;
    expect(long.reason).toHaveLength(PAGE_CAPS.message);
    expect(pageErrorOf({ message: '  a\n\n  b\tc  ' }, at)!.reason).toBe('a b c');
    // a source is a path, capped; a line that is not a number is no line
    expect(pageErrorOf({ message: 'b', source: 'x'.repeat(PAGE_CAPS.source * 3) }, at)!.source)
      .toHaveLength(PAGE_CAPS.source);
    const loose = pageErrorOf({ message: 'b', source: 42, line: 'twelve', col: -1 }, at)!;
    expect(loose.source).toBeUndefined();
    expect(loose.line).toBeUndefined();
    expect(loose.col).toBeUndefined();
    // a path that is not one, or is not there at all, is the root
    expect(pageErrorOf({ message: 'b' }, at)!.path).toBe('/');
    expect(pageErrorOf({ message: 'b', path: 'https://elsewhere.example/x' }, at)!.path).toBe('/');
    // and a report with nothing to say is not a line
    expect(pageErrorOf({ message: '   ' }, at)).toBeNull();
    expect(pageErrorOf({}, at)).toBeNull();
  });

  it('over the wire: the seat is the cookie’s, the query is gone, and the rate limit holds', async () => {
    const { base, dataDir } = await boot();
    const EMAIL = 'ada.page@example.org';
    const created = await (await post(base, '/api/docs', { title: 'Pages', email: EMAIL }))
      .json() as { slug: string; devLink: string };
    const ada = await follow(created.devLink);
    const me = ((await (await fetch(`${base}/api/d/${created.slug}/view`, { headers: { cookie: ada } }))
      .json()) as { me: string }).me;

    const send = (body: unknown, cookie?: string) => post(base, '/api/page-error', body, cookie);

    // a seated page: the seat is the cookie's, never the body's
    const one = await send({ message: 'TypeError: x is not a function',
      source: `${base}/session.js`, line: 4212, col: 17,
      path: `/d/${created.slug}?token=SECRETTOKEN`, slug: created.slug,
      seat: 'm-somebody-else' }, ada);
    expect(one.status).toBe(204);
    let logged = rows(dataDir);
    expect(logged).toHaveLength(1);
    expect(logged[0]).toMatchObject({ kind: 'page', seat: me, slug: created.slug,
      path: `/d/${created.slug}`, source: '/session.js', line: 4212,
      reason: 'TypeError: x is not a function' });
    expect(logged[0]!.doc).toMatch(/^d-/);
    // the token that travelled in the query is nowhere in the file
    expect(readFileSync(join(dataDir, ERROR_LOG_FILE), 'utf8')).not.toContain('SECRETTOKEN');

    // **the birth has no document and still reports**: no slug, no seat
    const birth = await send({ message: 'rejection: boom', path: '/' });
    expect(birth.status).toBe(204);
    logged = rows(dataDir);
    expect(logged).toHaveLength(2);
    expect(logged[1]).toMatchObject({ kind: 'page', path: '/', doc: null, slug: null, seat: null });

    // a body with no message is a 400 and no line — and it still spends a
    // slot, or an empty report would be a free way to flood the route
    expect((await send({ path: '/d/x', slug: created.slug }, ada)).status).toBe(400);
    expect(rows(dataDir)).toHaveLength(2);

    // **five a minute per seat.** Two of this seat's are spent; the next
    // three land, and the sixth is refused with nothing written.
    for (let i = 0; i < 3; i++) {
      expect((await send({ message: `boom ${i}`, slug: created.slug }, ada)).status).toBe(204);
    }
    const over = await send({ message: 'boom over', slug: created.slug }, ada);
    expect(over.status).toBe(429);
    expect(rows(dataDir).filter((r) => r.kind === 'page')).toHaveLength(5);
    expect(readFileSync(join(dataDir, ERROR_LOG_FILE), 'utf8')).not.toContain('boom over');
  });
});
