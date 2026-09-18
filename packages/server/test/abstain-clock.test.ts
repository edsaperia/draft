/**
 * **💤's countdown on the wire** (Q1460, Ed 2026-09-18, in the residency
 * room: *a small indicator … giving a countdown for when not voting will
 * count as a lapse*). The page draws `💤 abstain in hh:mm` beside the
 * Indifferent row; this is the one number it draws it from, and this file is
 * that number's contract.
 *
 * **What it is.** Since Q1439 (SPEC §8.2, §9.5a → R-127) 💤's period has two
 * jobs, and this is the second: silence on **one proposal** for the period
 * abstains this member on it and takes them out of the group its quorum is a
 * share of. The engine's unit is the race's **approval pair** — the leader
 * against the current text — so the deadline is one per race per seat, and
 * `Races.abstainDeadline` reads it off the very row `awaitedAt` will strike
 * the member from. There is no second rule anywhere.
 *
 * **What it is not.** It says nothing about anybody else: not who else is
 * awaited, not how many, not when theirs runs. §3.5 is untouched — this is
 * the seat's own clock, like its own wallet and its own judgments.
 *
 * The four silences, all asserted below: no 💤 at all, a pair this seat has
 * answered, a race this seat is not awaited on (its author), and a moment
 * already behind us.
 */
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { afterAll, describe, expect, it } from 'vitest';
import { createDraftServer } from '../src/server.js';
import type { DraftServer } from '../src/server.js';
import { FilePersistence } from '../src/persistence.js';

const DESIGN_DIR = join(import.meta.dirname, '..', '..', '..', 'design');
const HOUR = 3_600_000;

/** Only the parts of a member's view this file reads. */
type View = {
  me: string; serverNowMs: number;
  clauses: Array<{ id: string; judged: boolean; incumbentId: string; abstainAt?: number;
    candidates: Array<{ id: string; mine: boolean }> }>;
  raceCards: Array<{ kind: string; raceId?: string; a: { id: string }; b: { id: string } }>;
};

interface Booted { base: string; draft: DraftServer; dataDir: string }
const booted: Booted[] = [];

async function boot(): Promise<Booted> {
  const dataDir = mkdtempSync(join(tmpdir(), 'draft-abstain-'));
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
const post = (base: string, path: string, body: unknown, cookie?: string) =>
  fetch(base + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
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

/**
 * A begun document, perpetual so nothing closes under the test, with 💤 set
 * to whatever the case needs.
 *
 * **Three members, not two.** The floor in this room is two (a quorum of one
 * against `min(2, E)`, §8.2), so in a room of two the author's own
 * preference plus one answer either way ends the race at once — approving
 * adopts it, and opposing closes it as dominated (Q1440). A third seat,
 * silent throughout, is what keeps a race open long enough to be asked
 * anything about it.
 */
async function room(b: Booted, lapseMs: number | null) {
  const created = await (await post(b.base, '/api/docs', {
    title: 'Abstention Charter', email: 'ada@example.org',
  })).json() as { slug: string; devLink: string };
  const slug = created.slug;
  const ada = cookieOf(await consume(created.devLink));
  const cmd = async (cookie: string, name: string, args: unknown) => {
    const body = await (await post(b.base, `/api/d/${slug}/cmd`, { cmd: name, args }, cookie))
      .json() as { error?: string; result?: unknown };
    expect(body.error, `${name}: ${body.error}`).toBeUndefined();
    return body.result;
  };
  await cmd(ada, 'confirm-starting-text', { text: 'The orchard is shared at harvest.' });
  await cmd(ada, 'invite', { email: 'bo@example.org' });
  const bo = cookieOf(await consume(await lastLinkTo(b, 'bo@example.org')));
  await cmd(ada, 'invite', { email: 'cy@example.org' });
  const cy = cookieOf(await consume(await lastLinkTo(b, 'cy@example.org')));
  const values: Record<string, unknown> = {
    ending: { endsAtMs: null },
    rate: { grant: 4, cap: 8, dripMinutes: 240 },
    quorum: { form: 'count', n: 1 },
    chamber: { rung: 'link' }, authorship: { rung: 'sealed' }, judgments: { rung: 'after' },
    applications: { apply: false }, admission: { price: 'assembly' },
    machines: { enabled: false, budget: 0 },
    lapse: { afterMs: lapseMs },
  };
  for (const [setting, value] of Object.entries(values)) {
    await cmd(ada, 'reclaim', { setting });
    await cmd(ada, 'set-setting', { setting, value });
  }
  await cmd(ada, 'begin', {});
  const view = async (cookie: string) => (await (await fetch(
    `${b.base}/api/d/${slug}/view`, { headers: { cookie } })).json()) as View;
  return { slug, ada, bo, cy, cmd, view };
}

describe('💤 the abstention countdown in the view (Q1460, SPEC §8.2)', () => {
  it('a race this seat is awaited on carries its own deadline, and only its own', async () => {
    const b = await boot();
    const { ada, bo, cmd, view } = await room(b, 6 * HOUR);
    await cmd(bo, 'propose-text', {
      baseVersion: 0,
      hunks: [{ start: 0, end: 1, lines: ['The orchard is shared at midsummer.'] }],
      why: 'midsummer, not harvest',
    });

    // ada is awaited on the pair, so her view carries the moment her silence
    // stops counting: the proposal's own moment plus 💤's period
    const adaView = await view(ada);
    expect(adaView.clauses).toHaveLength(1);
    const at = adaView.clauses[0]!.abstainAt;
    expect(at, 'ada is awaited and 💤 is set').toBeTypeOf('number');
    expect(at!).toBeGreaterThan(adaView.serverNowMs);
    expect(Math.abs(at! - (adaView.serverNowMs + 6 * HOUR))).toBeLessThan(5 * 60_000);

    // **the author is not awaited** (SPEC §3.3): their preference for their
    // own wording is already in, so there is no silence of theirs to run out
    const boView = await view(bo);
    expect(boView.clauses).toHaveLength(1);
    expect(boView.clauses[0]!.abstainAt).toBeUndefined();

    // …and the moment ada answers the pair, the clock is nobody's business.
    // **She keeps the current text, deliberately**: in a room of two the
    // floor is two, so approving would adopt on the spot and take the race —
    // and the row this assertion is about — away with it.
    const card = adaView.raceCards.find((c) => c.kind === 'edge');
    expect(card, 'ada is dealt the pair').toBeTruthy();
    const inc = adaView.clauses[0]!.incumbentId;
    await cmd(ada, 'judge-race',
      { a: card!.a.id, b: card!.b.id, outcome: card!.a.id === inc ? 'a' : 'b' });
    const judged = await view(ada);
    expect(judged.clauses).toHaveLength(1);
    expect(judged.clauses[0]!.judged).toBe(true);
    expect(judged.clauses[0]!.abstainAt).toBeUndefined();
  }, 60_000);

  it('where 💤 is never, nothing counts down', async () => {
    const b = await boot();
    const { ada, bo, cmd, view } = await room(b, null);
    await cmd(bo, 'propose-text', {
      baseVersion: 0,
      hunks: [{ start: 0, end: 1, lines: ['The orchard is shared at midsummer.'] }],
      why: 'midsummer, not harvest',
    });
    const adaView = await view(ada);
    expect(adaView.clauses).toHaveLength(1);
    expect(adaView.clauses[0]!.judged).toBe(false);
    // nothing is imputed from silence at all under *never* (R-127, R-089), so
    // there is no moment to name and the row says nothing rather than *never*
    expect(adaView.clauses[0]!.abstainAt).toBeUndefined();
  }, 60_000);

  it('once the period has run, the deadline is gone rather than negative', async () => {
    const b = await boot();
    const { slug, ada, bo, cmd, view } = await room(b, 6 * HOUR);
    await cmd(bo, 'propose-text', {
      baseVersion: 0,
      hunks: [{ start: 0, end: 1, lines: ['The orchard is shared at midsummer.'] }],
      why: 'midsummer, not harvest',
    });
    const now = await view(ada);
    expect(now.clauses[0]!.abstainAt).toBeTypeOf('number');

    // **The projection is asked directly, at a clock of our own.** 💤's
    // shortest legal period is five minutes (`LAPSE_MIN_MS`, Q1453) and the
    // route reads the wall clock, so no HTTP test can reach the far side of
    // a period without sleeping through it; `raceView` takes its `now` as an
    // argument, and that is the whole of what this case is about.
    const doc = b.draft.store.bySlug(slug)!;
    const { raceView } = await import('../src/views.js');
    const before = raceView(doc, now.me, Date.now()) as unknown as View;
    expect(before.clauses[0]!.abstainAt).toBeTypeOf('number');
    const after = raceView(doc, now.me, Date.now() + 7 * HOUR) as unknown as View;
    expect(after.clauses, 'the race is still open').toHaveLength(1);
    expect(after.clauses[0]!.abstainAt).toBeUndefined();
  }, 60_000);
});
