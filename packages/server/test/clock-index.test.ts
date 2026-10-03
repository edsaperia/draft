/**
 * **The clock-index differential** (plan-scaling Stage 1, issue #210;
 * Invariant 4: every stage is proved against the old path on the same logs,
 * byte for byte).
 *
 * One data dir is made, then copied twice. Host A ticks the way the host did
 * before the index — every begun document every minute (`tickAll`, the
 * `DRAFT_TICK=all` switch) — and host B ticks only what `clockDueT` says is
 * due. Both are driven by `tick(nowMs)` over one schedule of instants: minute
 * steps through the first hours, then ten-minute steps, then hours, out past
 * every deadline the rooms hold, with irregular instants among them so both
 * landing on a point and stepping over it are tried. Then every document's
 * two logs, its bridge state and its people, and the outbox's mail (to and
 * subject: a link carries a fresh token each host mints for itself), must be
 * identical.
 *
 * **What the dir holds, and which deadline each crosses:**
 *  - the boot-guard's fixed set (Q1554): ten seeded rooms, one at convention
 *    size, live races — a resumed bridge's first sweep, and the abstentions
 *    and lapses of a room left alone for a week;
 *  - the constitution's golden founding log: a begun document with an
 *    ordinary admit motion and no engine yet — the bridge's birth on a tick;
 *  - *lapse*: 💤 of eight days and an ending at twenty, three members and a
 *    race nobody answers — all three warnings, the lapse, the crown's lapse,
 *    the abstention expiries, and the close;
 *  - *cooldown*: two races approved at once under a five-minute cooldown —
 *    the second is ready and waits on the cooldown's beat alone.
 *
 * The assertions after the comparison are that the schedule really did cross
 * each kind (the events are in host A's logs), and that host B really did
 * skip: at the end, no document is due.
 */
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync }
  from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { gunzipSync } from 'node:zlib';
import { afterAll, describe, expect, it } from 'vitest';
import { createDraftServer } from '../src/server.js';
import type { DraftServer } from '../src/server.js';
import { FilePersistence } from '../src/persistence.js';
import { clockDueT, foldTime } from '../src/engine-host.js';
import { attestBody } from './attest-wire.js';

const DESIGN_DIR = join(import.meta.dirname, '..', '..', '..', 'design');
const FIXTURE = join(import.meta.dirname, '..', '..', 'sim-harness', 'fixtures', 'boot-guard-set.json.gz');
const GOLDEN = join(import.meta.dirname, '..', '..', 'constitution', 'test', 'golden');
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
/** The source host's cooldown, and the two tick hosts' — a different one, so
 *  every resumed bridge's first sweep has a re-statement to make (R-086), and
 *  a host that skipped that sweep would leave it out of the engine log. */
const COOLDOWN = 5 * MIN;
const TICK_COOLDOWN = 4 * MIN;

const booted: DraftServer[] = [];
afterAll(async () => { for (const d of booted) await d.close().catch(() => {}); });

function cfgFor(dataDir: string, tickAll: boolean, cooldownMs = TICK_COOLDOWN) {
  return {
    port: 0, dataDir, baseUrl: 'http://127.0.0.1', designDir: DESIGN_DIR,
    resendApiKey: null as string | null, mailFrom: 'test <t@example.org>', mailOff: false,
    secret: 'test-secret', store: 'file' as const, databaseUrl: null,
    trustProxy: false, buildSha: null, notifyEmail: null,
    engineTuning: { cooldownMs }, tickAll,
  };
}

const cookieOf = (res: Response): string => res.headers.get('set-cookie')!.split(';')[0]!;
const post = async (base: string, path: string, body: unknown, cookie?: string) =>
  fetch(base + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(await attestBody(base, path, body, cookie)),
  });
const consume = async (link: string): Promise<Response> => {
  const u = new URL(link);
  await fetch(link);
  return fetch(u.origin + u.pathname, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', origin: u.origin },
    body: new URLSearchParams({ token: u.searchParams.get('token') ?? '' }).toString(),
    redirect: 'manual',
  });
};

type View = {
  clauses: Array<{ incumbentId: string }>;
  raceCards: Array<{ kind: string; a: { id: string }; b: { id: string } }>;
};

/** A begun room of three over the source host, as abstain-clock.test.ts makes one. */
async function room(draft: DraftServer, base: string, dataDir: string, title: string,
  values: Record<string, unknown>, text: string[]) {
  const linkTo = async (to: string): Promise<string> => {
    await draft.outbox.drain();
    const mine = readFileSync(join(dataDir, 'outbox.jsonl'), 'utf8').split('\n')
      .filter((l) => l.length > 0).map((l) => JSON.parse(l) as { to: string; link?: string })
      .filter((m) => m.to === to && m.link !== undefined);
    return mine[mine.length - 1]!.link!;
  };
  const owner = `${title.toLowerCase()}-ada@example.org`;
  const created = await (await post(base, '/api/docs', { title, email: owner }))
    .json() as { slug: string; devLink: string };
  const slug = created.slug;
  const ada = cookieOf(await consume(created.devLink));
  const cmd = async (cookie: string, name: string, args: unknown) => {
    const body = await (await post(base, `/api/d/${slug}/cmd`, { cmd: name, args }, cookie))
      .json() as { error?: string; result?: unknown };
    expect(body.error, `${title} ${name}: ${body.error}`).toBeUndefined();
    return body.result;
  };
  await cmd(ada, 'confirm-starting-text', { text: text.join('\n') });
  const seat = async (who: string): Promise<string> => {
    const email = `${title.toLowerCase()}-${who}@example.org`;
    await cmd(ada, 'invite', { email });
    return cookieOf(await consume(await linkTo(email)));
  };
  const bo = await seat('bo');
  const cy = await seat('cy');
  const all: Record<string, unknown> = {
    ending: { endsAtMs: null },
    rate: { grant: 4, cap: 8, dripMinutes: 240 },
    quorum: { form: 'count', n: 1 },
    chamber: { rung: 'link' }, authorship: { rung: 'sealed' }, judgments: { rung: 'after' },
    applications: { apply: false }, admission: { price: 'assembly' },
    machines: { enabled: false, budget: 0 },
    lapse: { afterMs: null },
    ...values,
  };
  for (const [setting, value] of Object.entries(all)) {
    await cmd(ada, 'reclaim', { setting });
    await cmd(ada, 'set-setting', { setting, value });
  }
  await cmd(ada, 'begin', {});
  const view = async (cookie: string) => (await (await fetch(
    `${base}/api/d/${slug}/view`, { headers: { cookie } })).json()) as View;
  /** ada approves whichever race card she is dealt first */
  const approveFirst = async (): Promise<void> => {
    const v = await view(ada);
    const card = v.raceCards.find((c) => c.kind === 'edge')!;
    const incs = new Set(v.clauses.map((c) => c.incumbentId));
    await cmd(ada, 'judge-race',
      { a: card.a.id, b: card.b.id, outcome: incs.has(card.a.id) ? 'b' : 'a' });
  };
  return { slug, ada, bo, cy, cmd, approveFirst, emails: ['ada', 'bo', 'cy']
    .map((w) => w === 'ada' ? owner : `${title.toLowerCase()}-${w}@example.org`) };
}

/** Build the source dir: the hand-made rooms, the fixed set, the golden log. */
async function source(): Promise<string> {
  const dir = mkdtempSync(join(tmpdir(), 'draft-clock-src-'));
  const cfg = cfgFor(dir, true, COOLDOWN);
  const draft = await createDraftServer(cfg, new FilePersistence(dir));
  await new Promise<void>((r) => draft.server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${(draft.server.address() as AddressInfo).port}`;
  cfg.baseUrl = base;
  // *lapse*: three warnings, the lapse, the crown's lapse, abstentions, the close
  const lapse = await room(draft, base, dir, 'Lapse', {
    lapse: { afterMs: 8 * DAY }, ending: { endsAtMs: Date.now() + 20 * DAY },
  }, ['The orchard is shared at harvest.', 'The well is kept clean.']);
  await lapse.cmd(lapse.bo, 'propose-text', { baseVersion: 0,
    hunks: [{ start: 0, end: 1, lines: ['The orchard is shared at midsummer.'] }], why: 'sooner' });
  // *cooldown*: one batch adopts at the judgment, the second waits on the beat
  const cool = await room(draft, base, dir, 'Cooldown', { lapse: { afterMs: 6 * HOUR } },
    ['The hall opens at nine.', 'The hall closes at ten.', 'Dogs are welcome.']);
  await cool.cmd(cool.bo, 'propose-text', { baseVersion: 0,
    hunks: [{ start: 0, end: 1, lines: ['The hall opens at eight.'] }], why: 'earlier' });
  await cool.cmd(cool.cy, 'propose-text', { baseVersion: 0,
    hunks: [{ start: 2, end: 3, lines: ['Dogs are welcome on a lead.'] }], why: 'leads' });
  await cool.approveFirst();
  await cool.approveFirst();
  // *abstain*: a race only an abstention carries — two approvals against a
  // floor of three until cy's silence on it runs out at P + 6 h, while the
  // room's own lapse clocks wait until P + 3 h + 6 h and their hour warning
  // until P + 8 h (the dev clock stamps everyone three hours on), so no other
  // clock lands at or before the expiry to tick the document
  const abs = await room(draft, base, dir, 'Abstain',
    { lapse: { afterMs: 6 * HOUR }, quorum: { form: 'count', n: 3 } },
    ['Bread is baked on Fridays.']);
  await abs.cmd(abs.bo, 'propose-text', { baseVersion: 0,
    hunks: [{ start: 0, end: 1, lines: ['Bread is baked on Saturdays.'] }], why: 'market day' });
  await abs.approveFirst();
  const jumped = await post(base, '/api/dev/clock',
    { slug: abs.slug, advanceMs: 3 * HOUR, present: abs.emails });
  expect(jumped.status).toBe(200);
  await draft.close();
  // the boot-guard's fixed set, as boot-guard.ts unpacks it
  const packed = JSON.parse(gunzipSync(readFileSync(FIXTURE)).toString('utf8')) as
    { files: Record<string, string> };
  for (const [rel, text] of Object.entries(packed.files)) {
    const to = join(dir, ...rel.split('/'));
    mkdirSync(dirname(to), { recursive: true });
    writeFileSync(to, text);
  }
  // the golden founding log, a begun document with no engine yet
  mkdirSync(join(dir, 'docs', 'golden-founding'), { recursive: true });
  cpSync(join(GOLDEN, 'founding.jsonl'), join(dir, 'docs', 'golden-founding', 'log.jsonl'));
  cpSync(join(GOLDEN, 'founding.people.json'), join(dir, 'docs', 'golden-founding', 'people.json'));
  return dir;
}

/** The schedule: minutes, then ten minutes, then hours, past twenty-one days,
 *  with irregular instants among them. */
function schedule(t0: number): number[] {
  const out: number[] = [];
  let t = t0;
  while (t < t0 + 3 * HOUR) { out.push(t); t += MIN; }
  while (t < t0 + 2 * DAY) { out.push(t); t += 10 * MIN; }
  let k = 0;
  while (t < t0 + 22 * DAY) { out.push(t); t += HOUR + (k++ % 7) * 1_237; }
  return out;
}

/** Every file of every document, and the outbox's mail without its links —
 *  as a sorted multiset, the dev mailer writing one pass's mails in the order
 *  their sends settle. */
function snapshot(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const id of readdirSync(join(dir, 'docs')).sort()) {
    for (const f of ['log.jsonl', 'engine.jsonl', 'bridge.json', 'people.json']) {
      const p = join(dir, 'docs', id, f);
      if (existsSync(p)) out[`${id}/${f}`] = readFileSync(p, 'utf8');
    }
  }
  const mail = join(dir, 'outbox.jsonl');
  out.mail = existsSync(mail) ? readFileSync(mail, 'utf8').split('\n').filter((l) => l.length > 0)
    .map((l) => { const m = JSON.parse(l) as { to: string; subject: string }; return `${m.to} ${m.subject}`; })
    .sort().join('\n') : '';
  return out;
}

describe('the clock index (Scaling Stage 1, issue #210)', () => {
  it('the due-only tick ends byte-identical to the all-documents tick', async () => {
    const src = await source();
    const dirA = mkdtempSync(join(tmpdir(), 'draft-clock-all-'));
    const dirB = mkdtempSync(join(tmpdir(), 'draft-clock-due-'));
    cpSync(src, dirA, { recursive: true });
    cpSync(src, dirB, { recursive: true });
    const a = await createDraftServer(cfgFor(dirA, true), new FilePersistence(dirA));
    const b = await createDraftServer(cfgFor(dirB, false), new FilePersistence(dirB));
    booted.push(a, b);
    expect([...a.store.all()].length).toBe([...b.store.all()].length);
    expect(b.store.quarantined()).toHaveLength(0);

    // start past every log, on a whole minute
    let last = 0;
    for (const d of a.store.all()) last = Math.max(last, foldTime(d, 0));
    const t0 = Math.ceil((Math.max(last, Date.now()) + 1) / MIN) * MIN;
    const times = schedule(t0);
    let skipped = 0;
    for (const t of times) {
      for (const d of b.store.all()) {
        const due = d.cs.constitutedAtT === null ? null : clockDueT(d);
        if (d.cs.constitutedAtT !== null && (due === null || due > foldTime(d, t))) skipped++;
      }
      await a.tick(t);
      await b.tick(t);
    }
    // the abstain room carried on the expiry alone: its adoption lands before
    // any of its constitution's own clocks fires after t0
    const abstain = [...a.store.all()].find((d) => d.cs.titleOf === 'Abstain')!;
    const engineLog = (abstain as unknown as { bridge: { engine: { log:
      Array<{ event: { type: string; t: number } }> } } }).bridge.engine.log;
    const carried = engineLog.find((e) => e.event.type === 'adopted' && e.event.t >= t0);
    const firstClock = abstain.cs.logEntries().find((e) => e.event.t >= t0);
    expect(carried, 'the abstain room adopted after t0').toBeTruthy();
    expect(firstClock, 'the abstain room\'s own clocks ran after t0').toBeTruthy();
    expect(carried!.event.t).toBeLessThan(firstClock!.event.t);
    await a.outbox.drain();
    await b.outbox.drain();
    await a.close();
    await b.close();

    const sa = snapshot(dirA);
    const sb = snapshot(dirB);
    expect(Object.keys(sb)).toEqual(Object.keys(sa));
    for (const k of Object.keys(sa)) expect(sb[k], `${k} differs`).toBe(sa[k]);

    // the schedule crossed every kind (host A's logs say so)
    const events = Object.entries(sa).filter(([k]) => k.endsWith('/log.jsonl') || k.endsWith('/engine.jsonl'))
      .flatMap(([, text]) => text.split('\n').filter((l) => l.length > 0)
        .map((l) => (JSON.parse(l) as { event: { type: string; t: number; lead?: number } }).event))
      .filter((e) => e.t >= t0);
    const types = new Set(events.map((e) => e.type));
    for (const kind of ['lapse-warned', 'member-lapsed', 'crown-lapsed', 'closed', 'adopted']) {
      expect(types.has(kind), `no ${kind} after t0`).toBe(true);
    }
    const leads = new Set(events.filter((e) => e.type === 'lapse-warned').map((e) => e.lead));
    for (const lead of [7 * DAY, DAY, HOUR]) expect(leads.has(lead), `no ${lead} warning`).toBe(true);
    // …and host B passed documents over
    expect(skipped).toBeGreaterThan(times.length);
    console.log(`clock-index differential: ${times.length} ticks, ${events.length} events after t0, `
      + `${skipped} document-ticks skipped`);
  }, 600_000);
});
