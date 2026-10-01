/**
 * **A proposal is the minimum it changes** on the wire (SPEC §2.1 → why:
 * R-147; issue #144): a demo bot proposed deleting one paragraph as four lines
 * replaced by three — heading, speaker line and next paragraph restated — and
 * the race it opened covered all four. The host's doors normalise every text
 * patch to the lines it changes, so the same post is one deletion of the
 * paragraph alone, and a patch that changes nothing is refused unstaked.
 */
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { afterAll, describe, expect, it } from 'vitest';
import { createDraftServer } from '../src/server.js';
import type { DraftServer } from '../src/server.js';
import { FilePersistence } from '../src/persistence.js';
import { attestBody } from './attest-wire.js';
import { asEngineDoc } from '../src/engine-host.js';

const DESIGN_DIR = join(import.meta.dirname, '..', '..', '..', 'design');

interface Booted { base: string; draft: DraftServer; dataDir: string }
const booted: Booted[] = [];

async function boot(): Promise<Booted> {
  const dataDir = mkdtempSync(join(tmpdir(), 'draft-minimal-'));
  const cfg = {
    port: 0, dataDir, baseUrl: 'http://127.0.0.1', designDir: DESIGN_DIR,
    resendApiKey: null as string | null, mailFrom: 'test <t@example.org>', mailOff: false,
    secret: 'test-secret', store: 'file' as const, databaseUrl: null,
    trustProxy: false, buildSha: null, notifyEmail: null,
    engineTuning: { cooldownMs: 0 },
  };
  const draft = await createDraftServer(cfg, new FilePersistence(dataDir));
  await new Promise<void>((r) => draft.server.listen(0, '127.0.0.1', r));
  cfg.baseUrl = `http://127.0.0.1:${(draft.server.address() as AddressInfo).port}`;
  const b = { base: cfg.baseUrl, draft, dataDir };
  booted.push(b);
  return b;
}
afterAll(async () => { for (const b of booted) await b.draft.close(); });

const cookieOf = (res: Response): string => {
  const header = res.headers.get('set-cookie');
  expect(header).toBeTruthy();
  return header!.split(';')[0]!;
};
// a text proposal states the wording it replaces (Q1463 (1)) — `attestBody`
// fills it from the view the post is about, for hunks written out by hand
const post = async (base: string, path: string, body: unknown, cookie?: string) =>
  fetch(base + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(await attestBody(base, path, body, cookie)),
  });
/** Follow a magic link the way a browser does: the POST is what consumes. */
const consume = async (link: string): Promise<Response> => {
  const u = new URL(link);
  expect((await fetch(link)).status).toBe(200);
  return fetch(u.origin + u.pathname, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', origin: u.origin },
    body: new URLSearchParams({ token: u.searchParams.get('token') ?? '' }).toString(),
    redirect: 'manual',
  });
};
const lastLinkTo = async (b: Booted, to: string): Promise<string> => {
  await b.draft.outbox.drain();
  const mine = readFileSync(join(b.dataDir, 'outbox.jsonl'), 'utf8')
    .split('\n').filter((l) => l.length > 0)
    .map((l) => JSON.parse(l) as { to: string; link?: string })
    .filter((m) => m.to === to && m.link !== undefined);
  expect(mine.length, `no mail to ${to}`).toBeGreaterThan(0);
  return mine[mine.length - 1]!.link!;
};

const TEXT = ['# Orchard Charter', 'The orchard is shared at harvest.', '', '## Tools',
  'Tools are returned clean.', 'The press is booked a week ahead.'].join('\n');

/** A begun, perpetual document of three members, 🌍 and 👤 as the case needs. */
async function room(b: Booted, chamber: 'closed' | 'link', authorship: 'anonymous' | 'public') {
  const created = await (await post(b.base, '/api/docs', {
    title: 'Orchard Charter', email: 'ada@example.org',
  })).json() as { slug: string; devLink: string };
  const slug = created.slug;
  const ada = cookieOf(await consume(created.devLink));
  const cmd = async (cookie: string, name: string, args: unknown) => {
    const body = await (await post(b.base, `/api/d/${slug}/cmd`, { cmd: name, args }, cookie))
      .json() as { error?: string; result?: unknown };
    expect(body.error, `${name}: ${body.error}`).toBeUndefined();
    return body.result;
  };
  await cmd(ada, 'confirm-starting-text', { text: TEXT });
  await cmd(ada, 'invite', { email: 'bo@example.org' });
  const bo = cookieOf(await consume(await lastLinkTo(b, 'bo@example.org')));
  await cmd(bo, 'set-identity', { name: 'Bo Tanner', picture: 'e🦉' });
  await cmd(ada, 'invite', { email: 'cy@example.org' });
  const cy = cookieOf(await consume(await lastLinkTo(b, 'cy@example.org')));
  const values: Record<string, unknown> = {
    ending: { endsAtMs: null },
    rate: { grant: 4, cap: 8, dripMinutes: 240 },
    quorum: { form: 'count', n: 1 },
    chamber: { rung: chamber }, authorship: { rung: authorship }, judgments: { rung: 'after' },
    applications: { apply: false }, admission: { price: 'assembly' },
    machines: { enabled: false, budget: 0 },
    lapse: { afterMs: null },
  };
  for (const [setting, value] of Object.entries(values)) {
    await cmd(ada, 'reclaim', { setting });
    await cmd(ada, 'set-setting', { setting, value });
  }
  await cmd(ada, 'begin', {});
  const view = async (cookie: string) => (await (await fetch(
    `${b.base}/api/d/${slug}/view`, { headers: { cookie } })).json()) as {
    clauses: Array<{ incumbentId: string }>;
    raceCards: Array<{ kind: string; a: { id: string }; b: { id: string } }> };
  return { slug, ada, bo, cy, cmd, view };
}

describe('a proposal is the minimum it changes (issue #144)', () => {
  it("the demo's shape — four lines for three — is one deletion of the paragraph alone", async () => {
    const b = await boot();
    const { slug, bo, cmd } = await room(b, 'closed', 'public');
    const doc = b.draft.store.bySlug(slug)!;
    const engine = asEngineDoc(doc).bridge!.engine;
    // lines 3–6: '## Tools', 'Tools are returned clean.', 'The press is booked a week ahead.'
    // sent as four lines (the blank above the heading included) replaced by
    // three, the middle paragraph gone and the rest restated
    const proposed = await cmd(bo, 'propose-text', {
      baseVersion: 0,
      hunks: [{ start: 2, end: 6, lines: ['', '## Tools', 'The press is booked a week ahead.'] }],
      why: 'clean is the default',
    }) as { id: string };
    const c = engine.allCandidates().find((x) => x.id === proposed.id)!;
    expect(c.patch!.hunks).toEqual([{ start: 4, end: 5, lines: [] }]);
    // the log carries the trimmed patch and no attestation (R-136)
    const sub = engine.log.map((e) => e.event).find((e) => e.type === 'candidate-submitted')!;
    expect(JSON.stringify(sub)).not.toMatch(/"was"|"after"/);
  });

  it('a patch that changes nothing is refused, and costs no ✏️', async () => {
    const b = await boot();
    const { slug, bo } = await room(b, 'closed', 'public');
    const wallet = async () => ((await (await fetch(`${b.base}/api/d/${slug}/view`,
      { headers: { cookie: bo } })).json()) as { wallet: number }).wallet;
    const before = await wallet();
    const res = await post(b.base, `/api/d/${slug}/cmd`, { cmd: 'propose-text', args: {
      baseVersion: 0, hunks: [{ start: 3, end: 5, lines: ['## Tools', 'Tools are returned clean.'] }],
      why: 'no change' } }, bo);
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toMatch(/nothing has changed/);
    expect(await wallet()).toBe(before);
  });
});
