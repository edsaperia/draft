/**
 * The thin server end to end (Q368): creation is a mailed link (§9.7a),
 * membership begins at arrival through an invitation link (§9.6a), every
 * command runs as the cookie's member and persists as the document's own
 * hash-chained log, and a restart replays to the same state byte for byte.
 * All over a real HTTP socket with the dev mailer (outbox on disk).
 */
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { afterAll, describe, expect, it } from 'vitest';
import { createDraftServer } from '../src/server.js';
import type { DraftServer } from '../src/server.js';
import { DocStore } from '../src/store.js';
import { FilePersistence } from '../src/persistence.js';
import type { Persistence } from '../src/persistence.js';
import { PgPersistence } from '../src/pg-persistence.js';
import { asEngineDoc, resumeBridge } from '../src/engine-host.js';
import { LIMITS } from '../src/commands.js';

const DESIGN_DIR = join(import.meta.dirname, '..', '..', '..', 'design');

// **One type for the member view** (stage 8 follow-up): every `/view` read
// in this file is typed here rather than by an ad-hoc cast at the call, so
// a field the server adds and a test then reads is declared once — and the
// typecheck says so before CI does. Loose where the tests do not look.
type Hunk = { start: number; end: number; lines: string[] };
type CandidateOutcome = { candidateId: string; outcome: string; p: number | null;
  threshold: number | null; hunks: Hunk[]; rationale: string; judgedByMe: boolean;
  author?: { id: string; name: string | null } };
type RaceRecord = { raceId: string; candidateId: string; outcome: string; when: number;
  p: number | null; threshold: number | null; version: number; footprint: unknown;
  displaced: string[]; judges: number; judgedByMe: boolean; field: CandidateOutcome[] };
type CardOption = { id: string; incumbent?: true;
  setting?: { settingId: string; value: { endsAtMs?: number } } };
type MemberViewPayload = {
  me: string; isFounder: boolean; devMail: boolean; title: string; slug: string;
  constitutedAtT: number | null; seq: number; eseq: number; serverNowMs: number;
  textConfirmed: boolean; quorumForm: string; electorateSize: number;
  membershipReserved: boolean; crowned: boolean; provisionalText: string | null;
  readiness: null | { ready: boolean; waiting: string[];
    holds: Array<{ setting: string; why: string }>;
    questions: Array<{ setting: string; settled: boolean; collecting: boolean;
      answered: number; electorate: number }>;
    members: Array<{ id: string; name: string | null; arrived: boolean;
      owed: number; answered: number }> };
  text: string; textVersion: number; floor: number;
  wallet: number | null;
  walletInfo: { balance: number; nextDripInMs: number | null; dripIntervalMs: number | null;
    cap: number | null } | null;
  clauses: Array<{ id: string; contested: Array<{ start: number; end: number }>;
    incumbentId: string; deadlocked: boolean; closeness: number; judges: number; floor: number;
    judged: boolean; shifted: boolean;
    candidates: Array<{ id: string; mine: boolean; rationale: string; hunks: Hunk[] }> }>;
  mine: Array<{ id: string; state: string; rationale: string; patch: unknown; footprint: unknown }>;
  records: RaceRecord[];
  raceCards: Array<{ kind: string; raceId?: string; urgency: number; a: CardOption; b: CardOption }>;
  record: null | { closedAt: number; text: string; adopted: RaceRecord[];
    undecided: RaceRecord[]; carriedButUnassented: Array<{ candidateId: string; summary: string }>;
    signatures: Array<{ member: string; name: string | null; comment: string; t: number }> };
  view: {
    questions: Array<{ setting: string; answered: number; answeredCount: number; myAnswer: unknown }>;
    members: Array<{ id: string; email: string; name: string | null }>;
    applicants: Array<{ id: string; email: string; name: string | null }>;
    motions: Array<{ id: string; route: string; status: string; payload: unknown }>;
    crownTasks: Array<{ id: string; motion: string | null;
      text?: { candidateId: string; summary: string } }>;
    frozen: boolean; mustReturn: number | null;
    closed: null | { at: number; mySignature: { comment: string } | null; signatures: unknown[] };
  };
};

interface Booted {
  base: string;
  draft: DraftServer;
  dataDir: string;
  /** A second handle on the same store, as a restart would open. */
  reopen: () => Promise<Persistence>;
  /** The pg schema this boot lives in, dropped at the end; null on file. */
  schema: PgPersistence | null;
}

// The same walk over either backend (stage 6): DRAFT_TEST_STORE=pg with
// DRAFT_TEST_DATABASE_URL runs every test here against Postgres, each
// boot in a private schema dropped afterwards. The storage swap must be a
// substitution, and this is the test that says so.
const PG_URL = process.env.DRAFT_TEST_DATABASE_URL ?? null;
const STORE = process.env.DRAFT_TEST_STORE === 'pg' ? 'pg' : 'file';
if (STORE === 'pg' && PG_URL === null) {
  throw new Error('DRAFT_TEST_STORE=pg needs DRAFT_TEST_DATABASE_URL');
}
const schemaName = () => 't_' + Math.random().toString(36).slice(2, 10);

const booted: Booted[] = [];

async function boot(over: { trustProxy?: boolean; proxyHops?: number;
  notifyEmail?: string | null; mailOff?: boolean } = {}): Promise<Booted> {
  const dataDir = mkdtempSync(join(tmpdir(), 'draft-server-'));
  const cfg = {
    port: 0,
    dataDir,
    baseUrl: 'http://127.0.0.1',
    designDir: DESIGN_DIR,
    resendApiKey: null,
    mailFrom: 'test <t@example.org>',
    mailOff: false,
    secret: 'test-secret',
    store: STORE as 'file' | 'pg',
    databaseUrl: null,
    trustProxy: false,
    buildSha: null,
    notifyEmail: null,
    // the test adopts twice inside one second; a room would be paced
    engineTuning: { cooldownMs: 0 },
    ...over,
  };
  let persistence: Persistence;
  let schema: PgPersistence | null = null;
  let reopen: () => Promise<Persistence>;
  if (STORE === 'pg') {
    const name = schemaName();
    schema = await PgPersistence.open(PG_URL!, { schema: name });
    persistence = schema;
    reopen = () => PgPersistence.open(PG_URL!, { schema: name });
  } else {
    persistence = new FilePersistence(dataDir);
    reopen = async () => new FilePersistence(dataDir);
  }
  // the same object the server holds: listen() picks the port, and the
  // baseUrl the server mints links from is patched in place below
  const draft = await createDraftServer(cfg, persistence);
  await new Promise<void>((r) => draft.server.listen(0, '127.0.0.1', r));
  const port = (draft.server.address() as AddressInfo).port;
  cfg.baseUrl = `http://127.0.0.1:${port}`;
  const b = { base: cfg.baseUrl, draft, dataDir, reopen, schema };
  booted.push(b);
  return b;
}

afterAll(async () => {
  for (const b of booted) {
    await b.draft.close();
    if (b.schema !== null) {
      // close() ended this pool; a fresh handle drops the schema
      await (await b.reopen() as PgPersistence).dropSchemaAndClose();
    }
  }
});

const cookieOf = (res: Response): string => {
  const header = res.headers.get('set-cookie');
  expect(header).toBeTruthy();
  return header!.split(';')[0]!;
};

const post = (base: string, path: string, body: unknown, cookie?: string) =>
  fetch(base + path, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });

/** Follow a magic link the way a browser does: GET the interstitial,
 *  then POST the token — the POST is what consumes (stage 3, defect 6),
 *  so a scanner's GET burns nothing. */
const consume = async (link: string): Promise<Response> => {
  const u = new URL(link);
  const page = await fetch(link);
  expect(page.status).toBe(200);
  expect(page.headers.get('content-type')).toContain('text/html');
  // the interstitial must not carry no-referrer, or a real browser's form
  // POST sends Origin: null (fetch spec) and the check below refuses it
  expect(page.headers.get('referrer-policy')).toBe('same-origin');
  return fetch(u.origin + u.pathname, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      // what a browser actually sends from the interstitial
      origin: u.origin,
    },
    body: new URLSearchParams({ token: u.searchParams.get('token') ?? '' }).toString(),
    redirect: 'manual',
  });
};

/**
 * **A relayed mail is no longer sent inside the request.** Since the outbox
 * landed, `relay` enqueues and kicks the sender; the kick is deliberately
 * fire-and-forget, so a 200 does not mean the provider has been offered the
 * mail — only that the mail cannot now be lost. A reader of the dev inbox
 * therefore waits for whatever pass is in flight, which is what `drain` is.
 * Without this the assertion below raced the sender and the invitation,
 * admission and close mails were read as missing.
 */
const lastMailTo = async (dataDir: string, to: string): Promise<{ link?: string }> => {
  const owner = booted.find((b) => b.dataDir === dataDir);
  if (owner !== undefined) await owner.draft.outbox.drain();
  const lines = readFileSync(join(dataDir, 'outbox.jsonl'), 'utf8')
    .split('\n').filter((l) => l.length > 0)
    .map((l) => JSON.parse(l) as { to: string; link?: string });
  const mine = lines.filter((m) => m.to === to);
  expect(mine.length).toBeGreaterThan(0);
  return mine[mine.length - 1]!;
};

describe('the whole road: create, invite, arrive, answer, constitute', () => {
  it('walks a three-member founding over HTTP and survives a restart', async () => {
    const { base, dataDir, reopen } = await boot();

    // -- creation: nothing exists until the mailed link is followed -------
    const created = await (await post(base, '/api/docs', {
      title: 'Hollow Oak Club Charter', email: 'ada@example.org',
    })).json() as { ok: boolean; slug: string; devLink: string };
    expect(created.ok).toBe(true);
    expect(created.slug).toBe('hollow-oak-club-charter');

    const saved = await consume(created.devLink);
    expect(saved.status).toBe(302);
    expect(saved.headers.get('location')).toBe(`/d/${created.slug}`);
    const ada = cookieOf(saved);

    // the same creation link a second time is dead (single use)
    expect((await consume(created.devLink)).status).toBe(400);

    // -- the founder's hand ----------------------------------------------
    const cmd = async (cookie: string, name: string, args: unknown) => {
      const res = await post(base, `/api/d/${created.slug}/cmd`,
        { cmd: name, args }, cookie);
      const body = await res.json() as { ok?: boolean; error?: string; result?: unknown };
      expect(body.error, `${name}: ${body.error}`).toBeUndefined();
      return body.result;
    };
    await cmd(ada, 'confirm-starting-text', { text: 'The clubhouse shall be kept open.' });
    await cmd(ada, 'invite', { email: 'bo@example.org' });
    await cmd(ada, 'invite', { email: 'cy@example.org' });

    // -- invitations went out as mail with login links --------------------
    const follow = async (email: string): Promise<string> => {
      const mail = await lastMailTo(dataDir, email);
      expect(mail.link).toBeTruthy();
      const res = await consume(mail.link!);
      expect(res.status).toBe(302);
      return cookieOf(res);
    };
    const bo = await follow('bo@example.org');
    const cy = await follow('cy@example.org');

    // arrival made them members: the founder's view counts three in E
    const viewOf = async (cookie: string) =>
      (await (await fetch(`${base}/api/d/${created.slug}/view`,
        { headers: { cookie } })).json()) as MemberViewPayload;
    expect((await viewOf(ada)).isFounder).toBe(true);
    expect((await viewOf(bo)).isFounder).toBe(false);

    // -- settle the constitution: reclaim+set the founder's, answer the rest
    await cmd(ada, 'set-setting',
      { setting: 'rate', value: { grant: 4, cap: 8, dripMinutes: 240 } });
    const values: Record<string, unknown> = {
      pace: { shape: 'fixed' },
      quorum: { form: 'share', n: 60 },
      authorship: { rung: 'sealed' },
      judgments: { rung: 'after' },
      applications: { holder: 'members', apply: true },
      admission: { price: 'proposal' },
      machines: { enabled: false, budget: 0 },
      lapse: { afterMs: null },
    };
    for (const [setting, value] of Object.entries(values)) {
      await cmd(ada, 'reclaim', { setting });
      await cmd(ada, 'set-setting', { setting, value });
    }
    // nothing arrives delegated (Ed, 2026-08-21, amending §9.0a): the founder
    // hands each question to the room, which is what opens it for answering
    for (const setting of ['ending', 'bar', 'chamber']) await cmd(ada, 'delegate', { setting });
    const ends = Date.now() + 7 * 24 * 3600_000;
    for (const [setting, value] of [
      ['ending', { endsAtMs: ends }],
      ['bar', { pct: 66 }],
    ] as const) {
      for (const cookie of [ada, bo, cy]) {
        await cmd(cookie, 'answer', { setting, value });
      }
    }
    // -- blindness held on the wire: while a question runs, cy (who has
    // not answered) sees a count and their own null — never the values
    // the others committed (§9.0a)
    await cmd(ada, 'answer', { setting: 'chamber', value: { rung: 'link' } });
    await cmd(bo, 'answer', { setting: 'chamber', value: { rung: 'link' } });
    const blind = await (await fetch(`${base}/api/d/${created.slug}/view`,
      { headers: { cookie: cy } })).json() as MemberViewPayload;
    const chamberQ = blind.view.questions.find((q) => q.setting === 'chamber')!;
    expect(chamberQ.answeredCount).toBe(2);
    expect(chamberQ.myAnswer).toBeNull();
    expect(JSON.stringify(blind.view)).not.toContain('"rung":"link"');
    await cmd(cy, 'answer', { setting: 'chamber', value: { rung: 'link' } });
    // -- 🍾 (Q443): every gate resolved, and still nothing has begun — the
    // start is the founder's act. The readiness readout is theirs alone
    // (participation by name, never preference); a member's 🍾 is refused.
    const resolved = await viewOf(ada);
    expect(resolved.constitutedAtT).toBeNull();
    expect(resolved.readiness).not.toBeNull();
    expect(resolved.readiness!.ready).toBe(true);
    expect(resolved.readiness!.waiting).toEqual([]);
    // three arrived members; a delegated question that is not a gate (the
    // rate) may still be collecting — that is owed, and it holds nothing up
    expect(resolved.readiness!.members.map((m) => m.arrived)).toEqual([true, true, true]);
    for (const m of resolved.readiness!.members) expect(m.answered).toBeLessThanOrEqual(m.owed);
    expect(JSON.stringify(resolved.readiness)).not.toContain('"rung"');
    expect((await viewOf(bo)).readiness).toBeNull();
    const boBegins = await post(base, `/api/d/${created.slug}/cmd`, { cmd: 'begin', args: {} }, bo);
    expect(boBegins.status).toBe(400);
    expect(((await boBegins.json()) as { error: string }).error).toMatch(/only the founder/);
    const seqBefore = resolved.seq;
    await viewOf(bo); // a read within the hour of an act records nothing (Q459)
    expect((await viewOf(bo)).seq).toBe(seqBefore);
    await cmd(ada, 'begin', {});
    const after = await viewOf(ada);
    expect(after.constitutedAtT).not.toBeNull();
    // the session-clock (Q466): the view says what time the server thinks it
    // is, and whether the document is frozen or closed — never the threshold
    expect(typeof after.serverNowMs).toBe('number');
    expect(Math.abs(after.serverNowMs - Date.now())).toBeLessThan(60_000);
    expect(after.view.frozen).toBe(false);
    expect(after.view.closed).toBeNull();

    // -- a motion over HTTP races in the engine (Q391) --------------------
    const motion = await cmd(bo, 'open-motion', {
      payload: { kind: 'set', setting: 'ending', value: { endsAtMs: ends + 3600_000 } },
      why: 'a little longer',
    }) as string;
    expect(typeof motion).toBe('string');

    // cy is served the race as a card: the standing value against bo's
    const cyView = await (await fetch(`${base}/api/d/${created.slug}/view`,
      { headers: { cookie: cy } })).json() as MemberViewPayload;
    expect(cyView.wallet).not.toBeNull();
    const card = cyView.raceCards.find((c) =>
      c.a.setting?.settingId === 'ending' || c.b.setting?.settingId === 'ending');
    expect(card).toBeTruthy();
    const proposedSide =
      card!.a.setting?.value.endsAtMs === ends + 3600_000 ? 'a' : 'b';

    // cy prefers the proposed value: with bo's own preference that clears
    // the floor (F = 2 of 3), the race adopts, the seam adjudicates, and
    // the constitution applies the value — the setting actually moved
    await cmd(cy, 'judge-race',
      { a: card!.a.id, b: card!.b.id, outcome: proposedSide });
    const live = booted[booted.length - 1]!.draft.store.bySlug(created.slug)!;
    expect(live.cs.motionRecords().get(motion)!.status).toBe('carried');
    expect(live.cs.settingState('ending').value)
      .toEqual({ endsAtMs: ends + 3600_000 });

    // -- a text proposal over HTTP (stage 8, Q418): bo patches the one
    // clause, cy is served it as a clause race and a card, judges it, and
    // the document every member reads changes ---------------------------
    type TextView = MemberViewPayload;
    const textView = async (cookie: string) =>
      (await (await fetch(`${base}/api/d/${created.slug}/view`,
        { headers: { cookie } })).json()) as TextView;
    const before = await textView(bo);
    expect(before.text).toBe('The clubhouse shall be kept open.');
    expect(before.textVersion).toBe(0);
    const walletBefore = before.wallet!;
    const proposed = await cmd(bo, 'propose-text', {
      baseVersion: 0,
      hunks: [{ start: 0, end: 1, lines: ['The clubhouse shall be kept open all week.'] }],
      why: 'weekends too',
    }) as { id: string; raceId: string };
    expect(proposed.id).toBeTruthy();
    // the stake left bo's wallet; the proposal is theirs in their own view
    const boAfter = await textView(bo);
    expect(boAfter.wallet).toBe(walletBefore - 1);
    expect(boAfter.mine.map((m) => [m.id, m.state])).toEqual([[proposed.id, 'live']]);
    expect(boAfter.clauses[0]!.candidates[0]!.mine).toBe(true);
    // cy sees the race at its clause — blind: no author, no standing
    const cyText = await textView(cy);
    expect(cyText.clauses).toHaveLength(1);
    const clause = cyText.clauses[0]!;
    expect(clause.contested).toEqual([{ start: 0, end: 1 }]);
    expect(clause.judged).toBe(false);
    expect(clause.candidates[0]).toMatchObject({ id: proposed.id, mine: false,
      rationale: 'weekends too' });
    expect(JSON.stringify(cyText.clauses)).not.toMatch(/leaderP|certification|author/);
    const textCard = cyText.raceCards.find((c) =>
      c.a.id === proposed.id || c.b.id === proposed.id);
    expect(textCard).toBeTruthy();
    // a stale base is refused — the page re-fetches and rebases
    const stale = await post(base, `/api/d/${created.slug}/cmd`, { cmd: 'propose-text',
      args: { baseVersion: 7, hunks: [{ start: 0, end: 1, lines: ['x'] }] } }, cy);
    expect(stale.status).toBe(400);
    expect(((await stale.json()) as { error: string }).error).toMatch(/targets version 7/);
    // cy prefers the proposal: with bo's own that clears F = 2 of 3
    await cmd(cy, 'judge-race', { a: textCard!.a.id, b: textCard!.b.id,
      outcome: textCard!.a.id === proposed.id ? 'a' : 'b' });
    const adopted = await textView(ada);
    expect(adopted.text).toBe('The clubhouse shall be kept open all week.');
    expect(adopted.textVersion).toBe(1);
    expect(adopted.clauses).toHaveLength(0);
    expect(adopted.records).toHaveLength(1);
    expect(adopted.records[0]).toMatchObject({ candidateId: proposed.id, outcome: 'adopted',
      judgedByMe: false });
    expect(adopted.records[0]!.p).toBeGreaterThan(0.5);
    expect((await textView(cy)).records[0]!.judgedByMe).toBe(true);
    // withdrawing hands the stake back whole (§3.3a), and only to its author
    const second = await cmd(cy, 'propose-text', { baseVersion: 1,
      hunks: [{ start: 0, end: 1, lines: ['Closed.'] }] }) as { id: string };
    const cyWallet = (await textView(cy)).wallet!;
    const notYours = await post(base, `/api/d/${created.slug}/cmd`,
      { cmd: 'withdraw-text', args: { candidate: second.id } }, bo);
    expect(notYours.status).toBe(400);
    await cmd(cy, 'withdraw-text', { candidate: second.id });
    const cyDone = await textView(cy);
    expect(cyDone.wallet).toBe(cyWallet + 1);
    expect(cyDone.clauses).toHaveLength(0);
    expect(cyDone.mine.find((m) => m.id === second.id)!.state).toBe('withdrawn');

    // -- stage 8 follow-up (Q501, Q503): two rivals on one clause make one
    // race; the third member is served the pair with the router's own
    // urgency; the race carries a signless closeness and its judge count;
    // the wallet has a clock; the record files the race once, with the
    // field and the text it displaced -----------------------------------
    type RichView = TextView & {
      floor: number;
      walletInfo: { balance: number; nextDripInMs: number | null; dripIntervalMs: number | null; cap: number } | null;
      clauses: Array<{ closeness: number; judges: number; floor: number; candidates: Array<{ id: string }> }>;
      raceCards: Array<{ raceId: string; urgency: number; a: { id: string; incumbent?: boolean }; b: { id: string; incumbent?: boolean } }>;
      records: Array<{ raceId: string; candidateId: string; outcome: string; judges: number;
        displaced: string[]; field: Array<{ candidateId: string; outcome: string }> }>;
    };
    const rich = async (cookie: string) => (await textView(cookie)) as unknown as RichView;
    const v1 = (await rich(bo)).textVersion;
    const r1 = await cmd(bo, 'propose-text', { baseVersion: v1,
      hunks: [{ start: 0, end: 1, lines: ['The clubhouse shall be kept open every day.'] }], why: 'daily' }) as { id: string; raceId: string };
    const r2 = await cmd(cy, 'propose-text', { baseVersion: v1,
      hunks: [{ start: 0, end: 1, lines: ['The clubhouse shall never close.'] }], why: 'never' }) as { id: string; raceId: string };
    expect(r2.raceId).toBe(r1.raceId);
    const adaV = await rich(ada);
    expect(adaV.clauses).toHaveLength(1);
    expect(adaV.clauses[0]!.candidates).toHaveLength(2);
    expect(adaV.clauses[0]!.closeness).toBeGreaterThanOrEqual(0);
    expect(adaV.clauses[0]!.closeness).toBeLessThanOrEqual(1);
    expect(adaV.clauses[0]!.judges).toBe(2); // the two authors' own derived preferences
    expect(adaV.clauses[0]!.floor).toBe(adaV.floor);
    expect(adaV.floor).toBeGreaterThan(0);
    expect(JSON.stringify(adaV.clauses)).not.toMatch(/leaderP|certification|author|"value"/);
    expect(adaV.walletInfo).not.toBeNull();
    expect(adaV.walletInfo!.dripIntervalMs).toBe(240 * 60_000);
    expect(adaV.walletInfo!.nextDripInMs).toBeGreaterThan(0);
    expect(adaV.walletInfo!.nextDripInMs).toBeLessThanOrEqual(240 * 60_000);
    const served = adaV.raceCards.filter((c) => c.raceId === r1.raceId);
    expect(served.length).toBeGreaterThan(0);
    expect(Math.max(...adaV.raceCards.map((c) => c.urgency))).toBe(1);
    expect(JSON.stringify(adaV.raceCards)).not.toMatch(/"value"|leaderP/);
    // ada judges until the race resolves: prefer r1 over whatever it is paired with
    for (let i = 0; i < 8; i++) {
      const now = await rich(ada);
      if (now.clauses.length === 0) break;
      const card = now.raceCards.find((c) => c.raceId === r1.raceId);
      if (!card) break;
      const outcome = card.a.id === r1.id ? 'a' : card.b.id === r1.id ? 'b'
        : card.a.incumbent ? 'b' : 'a';
      await cmd(ada, 'judge-race', { a: card.a.id, b: card.b.id, outcome });
    }
    const done = await rich(ada);
    expect(done.clauses).toHaveLength(0);
    const rec = done.records.find((r) => r.raceId === r1.raceId)!;
    expect(rec).toBeTruthy();
    // the field holds the outcome(s): r1 adopted; r2, patching the same
    // line, could not be rebased and went back to its author (§2.4) — a
    // return, not an outcome, so it is cy's to see under `mine`, not the record's
    expect(rec.field.map((f) => [f.candidateId, f.outcome])).toEqual([[r1.id, 'adopted']]);
    const cyMine = (await rich(cy)).mine.find((m) => m.id === r2.id)!;
    expect(cyMine.state).not.toBe('live');
    expect(cyMine.state).not.toBe('adopted');
    expect(rec.displaced).toEqual(['The clubhouse shall be kept open all week.']);
    // ada's judgment and bo's own derived preference: two movers on the record
    expect(rec.judges).toBe(2);
    // one record per race: the adopted rival and the retired one do not file twice
    expect(done.records.filter((r) => r.raceId === r1.raceId)).toHaveLength(1);

    // -- an applicant at the door (§9.7½): start → verify → submit --------
    const preApply = booted[booted.length - 1]!.draft.store
      .bySlug(created.slug)!.cs.logEntries().length;
    const started = await (await post(base, `/api/d/${created.slug}/apply`,
      { email: 'dee@example.org' })).json() as { ok: boolean; devLink: string };
    expect(started.ok).toBe(true);
    // an unauthenticated POST wrote nothing to the log (stage 3, defect 8)
    expect(booted[booted.length - 1]!.draft.store
      .bySlug(created.slug)!.cs.logEntries().length).toBe(preApply);
    const appRes = await consume(started.devLink);
    expect(appRes.status).toBe(302);
    let dee = cookieOf(appRes);

    // the applicant loses their cookie and knocks again (Q439(a)): the
    // door re-sends the verification mail rather than saying nothing, so
    // the mail is the way back in — and it must not start a second
    // application or write anything the first time round
    const beforeRe = booted[booted.length - 1]!.draft.store
      .bySlug(created.slug)!.cs.logEntries().length;
    const again = await (await post(base, `/api/d/${created.slug}/apply`,
      { email: 'dee@example.org' })).json() as { ok: boolean; devLink: string };
    expect(again.ok).toBe(true);
    expect((await lastMailTo(dataDir, 'dee@example.org')).link).toContain('/auth/apply');
    expect(booted[booted.length - 1]!.draft.store
      .bySlug(created.slug)!.cs.logEntries().length).toBe(beforeRe);
    const reEntry = await consume(again.devLink);
    expect(reEntry.status).toBe(302);
    dee = cookieOf(reEntry);
    // one applicant, not two — the seat was re-seated, not recreated
    expect([...booted[booted.length - 1]!.draft.store.bySlug(created.slug)!
      .cs.applicantRecords().values()]
      .filter((a) => a.email === 'dee@example.org').length).toBe(1);
    // the applicant's one act is submitting; anything else is refused
    const refused = await post(base, `/api/d/${created.slug}/cmd`,
      { cmd: 'answer', args: { setting: 'bar', value: { pct: 50 } } }, dee);
    expect(refused.status).toBe(403);
    const submitted = await post(base, `/api/d/${created.slug}/cmd`,
      { cmd: 'submit-application', args: { name: 'Dee' } }, dee);
    expect(submitted.status).toBe(200);
    // under 'apply' the application went straight to the bar as an
    // ordinary admit motion, free (§9.7½)
    const deeView = await (await fetch(`${base}/api/d/${created.slug}/view`,
      { headers: { cookie: dee } })).json() as {
        applicant: { status: string; motion: string | null };
      };
    expect(deeView.applicant.status).toBe('submitted');
    expect(deeView.applicant.motion).toBeTruthy();
    // an applicant is never served the members' emails (stage 3, defect 7)
    const deeRaw = JSON.stringify(deeView);
    expect(deeRaw).not.toContain('bo@example.org');
    expect(deeRaw).not.toContain('ada@example.org');

    // -- the admit motion is its own race (§9.7½ v0.56, Q397): one
    // candidate against the membership as it stands, served to members,
    // adopted at the bar, and dee is a member -------------------------------
    const boView = await (await fetch(`${base}/api/d/${created.slug}/view`,
      { headers: { cookie: bo } })).json() as MemberViewPayload;
    // the members see who is asking, in their own words (v0.56 view)
    expect(boView.view.applicants.some((a2) => a2.email === 'dee@example.org')).toBe(true);
    const admitCard = boView.raceCards.find((c) =>
      (c.a.setting?.settingId ?? '').startsWith('admit:') ||
      (c.b.setting?.settingId ?? '').startsWith('admit:'));
    expect(admitCard).toBeTruthy();
    const admitSide = (admitCard!.a.setting?.settingId ?? '').startsWith('admit:') &&
      !admitCard!.a.id.startsWith('inc:') ? 'a' : 'b';
    await cmd(bo, 'judge-race',
      { a: admitCard!.a.id, b: admitCard!.b.id, outcome: admitSide });
    const live2 = booted[booted.length - 1]!.draft.store.bySlug(created.slug)!;
    if (![...live2.cs.memberRecords().values()].some((m) => m.email === 'dee@example.org')) {
      // the floor may want a second member's judgment
      const cyView2 = await (await fetch(`${base}/api/d/${created.slug}/view`,
        { headers: { cookie: cy } })).json() as typeof boView;
      const c2 = cyView2.raceCards.find((c) =>
        (c.a.setting?.settingId ?? '').startsWith('admit:') ||
        (c.b.setting?.settingId ?? '').startsWith('admit:'))!;
      const s2 = (c2.a.setting?.settingId ?? '').startsWith('admit:') &&
        !c2.a.id.startsWith('inc:') ? 'a' : 'b';
      await cmd(cy, 'judge-race', { a: c2.a.id, b: c2.b.id, outcome: s2 });
    }
    const deeMember = [...live2.cs.memberRecords().values()]
      .find((m) => m.email === 'dee@example.org');
    expect(deeMember).toBeDefined();
    // the admitted member was mailed their seat (review #1, finding 7)
    expect((await lastMailTo(dataDir, 'dee@example.org')).link).toContain('/auth/login');
    expect(deeMember!.arrivedAtT).not.toBeNull();
    // a member's address gets the same 200 as anybody — the apply door
    // is not a membership oracle (review #1, finding 8) — and a login
    // mail goes out instead of a refusal
    const dupe = await post(base, `/api/d/${created.slug}/apply`,
      { email: 'bo@example.org' });
    expect(dupe.status).toBe(200);
    expect(((await dupe.json()) as { ok: boolean }).ok).toBe(true);
    expect((await lastMailTo(dataDir, 'bo@example.org')).link).toContain('/auth/login');

    // -- restart: both logs on disk replay to the same state --------------
    const reopened = await reopen();
    const reloaded = new DocStore(reopened);
    await reloaded.loadAll();
    const doc = reloaded.bySlug(created.slug);
    expect(doc).not.toBeNull();
    expect(doc!.cs.rollingHash()).toBe(live.cs.rollingHash());
    expect(doc!.cs.constitutedAtT).not.toBeNull();
    await resumeBridge(reopened, doc!);
    const liveBridge = asEngineDoc(live).bridge!;
    const backBridge = asEngineDoc(doc!).bridge!;
    expect(backBridge.engine.rollingHash()).toBe(liveBridge.engine.rollingHash());
    expect(backBridge.engine.standing('ending')).toEqual({ endsAtMs: ends + 3600_000 });
  }, 30_000);
});

describe('the pre-save text stash (§9.7a v0.55)', () => {
  it('text pasted before the magic link is followed is waiting after the save', async () => {
    const { base, dataDir } = await boot();
    const created = await (await post(base, '/api/docs', {
      title: 'Stash', email: 'stash@example.org',
    })).json() as { devLink: string; slug: string; pendingId: string };
    expect(created.pendingId).toBeTruthy();

    // paste while the mail is in flight — last write wins
    await post(base, '/api/docs/pending',
      { pendingId: created.pendingId, text: 'First paste.' });
    const synced = await post(base, '/api/docs/pending',
      { pendingId: created.pendingId, text: 'The clubhouse shall be kept open.' });
    expect(synced.status).toBe(200);

    // a wrong id is told the draft expired, nothing else
    const wrong = await post(base, '/api/docs/pending',
      { pendingId: 'not-a-real-id', text: 'x' });
    expect(wrong.status).toBe(404);

    // follow the link: the text is waiting, unconfirmed, in the document
    const saved = await consume(created.devLink);
    const founder = cookieOf(saved);
    const viewOf = async (cookie: string) =>
      (await (await fetch(`${base}/api/d/${created.slug}/view`,
        { headers: { cookie } })).json()) as { provisionalText: string | null };
    expect((await viewOf(founder)).provisionalText)
      .toBe('The clubhouse shall be kept open.');

    // the founder keeps drafting after the save through the doc stash
    await post(base, `/api/d/${created.slug}/stash`,
      { text: 'The clubhouse shall be kept open at all hours.' }, founder);
    expect((await viewOf(founder)).provisionalText)
      .toBe('The clubhouse shall be kept open at all hours.');

    // a member reads it (the charter is what the questions are about) but
    // cannot write it
    await post(base, `/api/d/${created.slug}/cmd`,
      { cmd: 'invite', args: { email: 'reader@example.org' } }, founder);
    const reader = await (async () => {
      const mail = await lastMailTo(dataDir, 'reader@example.org');
      return cookieOf(await consume(mail.link!));
    })();
    expect((await viewOf(reader)).provisionalText)
      .toBe('The clubhouse shall be kept open at all hours.');
    const denied = await post(base, `/api/d/${created.slug}/stash`,
      { text: 'mine now' }, reader);
    expect(denied.status).toBe(403);

    // confirming the starting text supersedes the draft
    await post(base, `/api/d/${created.slug}/cmd`,
      { cmd: 'confirm-starting-text',
        args: { text: 'The clubhouse shall be kept open at all hours.' } }, founder);
    expect((await viewOf(founder)).provisionalText).toBeNull();
    const after = await post(base, `/api/d/${created.slug}/stash`,
      { text: 'too late' }, founder);
    expect(after.status).toBe(400);
  });
});

describe('auth discipline', () => {
  it('commands and views need a cookie; a foreign cookie does not carry', async () => {
    const { base } = await boot();
    const created = await (await post(base, '/api/docs', {
      title: 'One', email: 'one@example.org',
    })).json() as { devLink: string; slug: string };
    await consume(created.devLink);

    // a read without a seat is the stranger's door (Q456): the redacted
    // payload, never a seat — and a command still needs one
    const bare = await fetch(`${base}/api/d/${created.slug}/view`);
    expect(bare.status).toBe(200);
    expect(await bare.json()).toMatchObject({ stranger: true });
    const forged = await fetch(`${base}/api/d/${created.slug}/view`,
      { headers: { cookie: 'draft_session=ZG9j.Zm91bmRlcg.99999999999999.bad' } });
    expect(await forged.json()).toMatchObject({ stranger: true });
    expect((await post(base, `/api/d/${created.slug}/cmd`,
      { cmd: 'set-identity', args: { name: 'x' } })).status).toBe(401);
  });

  it('one cookie per document: logging into a second does not log you out of the first', async () => {
    const { base } = await boot();
    const mk = async (title: string, email: string) => {
      const c = await (await post(base, '/api/docs', { title, email })).json() as
        { devLink: string; slug: string };
      const cookie = cookieOf(await consume(c.devLink));
      return { slug: c.slug, cookie };
    };
    const a = await mk('Alpha', 'alpha@example.org');
    const b = await mk('Beta', 'beta@example.org');
    expect(a.cookie.split('=')[0]).not.toBe(b.cookie.split('=')[0]);
    // a browser holds both; each document reads its own
    const jar = `${a.cookie}; ${b.cookie}`;
    const va = await fetch(`${base}/api/d/${a.slug}/view`, { headers: { cookie: jar } });
    const vb = await fetch(`${base}/api/d/${b.slug}/view`, { headers: { cookie: jar } });
    expect(va.status).toBe(200);
    expect(vb.status).toBe(200);
    expect(((await va.json()) as { me: string }).me).toBe('founder');
    expect(((await vb.json()) as { isFounder: boolean }).isFounder).toBe(true);
    // the other document's cookie alone does not carry (a foreign seat)
    const cross = await fetch(`${base}/api/d/${a.slug}/view`, { headers: { cookie: b.cookie } });
    expect(await cross.json()).toMatchObject({ stranger: true }); // a stranger here
    // the legacy name still reads, for its own document only
    const legacy = 'draft_session=' + a.cookie.split('=')[1];
    expect((await fetch(`${base}/api/d/${a.slug}/view`, { headers: { cookie: legacy } })).status).toBe(200);
    expect(await (await fetch(`${base}/api/d/${b.slug}/view`, { headers: { cookie: legacy } })).json())
      .toMatchObject({ stranger: true });
  });

  it('an unknown login email is told nothing', async () => {
    const { base } = await boot();
    const created = await (await post(base, '/api/docs', {
      title: 'Two', email: 'two@example.org',
    })).json() as { devLink: string; slug: string };
    await consume(created.devLink);
    const res = await post(base, `/api/d/${created.slug}/login`,
      { email: 'stranger@example.org' });
    const body = await res.json() as Record<string, unknown>;
    expect(body).toEqual({ ok: true }); // no devLink, no hint
  });
});

describe('review #1 hardening', () => {
  it('revoked seats die, caps hold, and stateful responses are no-store', async () => {
    const { base, dataDir } = await boot();
    const created = await (await post(base, '/api/docs', {
      title: 'Guard', email: 'guard@example.org',
    })).json() as { devLink: string; slug: string };
    const g = cookieOf(await consume(created.devLink));

    // stateful responses never sit in a cache (finding 10)
    const v = await fetch(`${base}/api/d/${created.slug}/view`,
      { headers: { cookie: g } });
    expect(v.headers.get('cache-control')).toBe('no-store');

    // an out-of-range mark index is refused at the door (finding 2):
    // it used to pass the whitelist and throw inside every render
    const pic = await post(base, `/api/d/${created.slug}/cmd`,
      { cmd: 'set-identity', args: { picture: 'm9' } }, g);
    expect(pic.status).toBe(400);

    // an oversized setting value is refused before it can enter the log
    // (finding 3)
    const big = await post(base, `/api/d/${created.slug}/cmd`,
      { cmd: 'set-setting',
        args: { setting: 'title', value: { text: 'A'.repeat(5000) } } }, g);
    expect(big.status).toBe(400);
    expect(((await big.json()) as { error: string }).error).toContain('too large');

    // a null or foreign Origin on an auth consume is refused (finding 13)
    const nul = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', origin: 'null' },
      body: 'token=x',
    });
    expect(nul.status).toBe(403);

    // a revoked seat is a dead cookie (finding 1): the uninvited member's
    // ninety-day cookie stops reading the room the moment they leave it
    await post(base, `/api/d/${created.slug}/cmd`,
      { cmd: 'invite', args: { email: 'leaver@example.org' } }, g);
    const leaver = cookieOf(await consume(
      (await lastMailTo(dataDir, 'leaver@example.org')).link!));
    const before = await fetch(`${base}/api/d/${created.slug}/view`,
      { headers: { cookie: leaver } });
    expect(before.status).toBe(200);
    const gv = await (await fetch(`${base}/api/d/${created.slug}/view`,
      { headers: { cookie: g } })).json() as MemberViewPayload;
    const leaverId = gv.view.members.find((m) => m.email === 'leaver@example.org')!.id;
    await post(base, `/api/d/${created.slug}/cmd`,
      { cmd: 'uninvite', args: { member: leaverId } }, g);
    const after = await fetch(`${base}/api/d/${created.slug}/view`,
      { headers: { cookie: leaver } });
    // a revoked seat reads as a stranger: the door, not the room
    expect(await after.json()).toMatchObject({ stranger: true });
    expect(JSON.stringify(await (await fetch(`${base}/api/d/${created.slug}/view`,
      { headers: { cookie: leaver } })).json())).not.toContain('.org');
  });
});

describe('the surface is served', () => {
  it('serves session-view.html at /d/:slug and the design assets', async () => {
    const { base } = await boot();
    const created = await (await post(base, '/api/docs', {
      title: 'Three', email: 'three@example.org',
    })).json() as { devLink: string; slug: string };
    await consume(created.devLink);
    const page = await fetch(`${base}/d/${created.slug}`);
    expect(page.status).toBe(200);
    expect(page.headers.get('content-type')).toContain('text/html');
    const js = await fetch(`${base}/design/constitution.js`);
    expect(js.status).toBe(200);
    const sneaky = await fetch(`${base}/design/..%2fSPEC.md`);
    expect(sneaky.status).toBe(404);
  });

  it('serves the top of the design tree only — no notes, references or tooling', async () => {
    const { base } = await boot();
    for (const path of ['/design/STYLE.md', '/design/tools/session-probe.js',
                        '/design/reference/system.css',
                        '/design/reference/setup-pre-constitution/setup.js']) {
      expect((await fetch(base + path)).status, path).toBe(404);
    }
  });
});

/**
 * The limiter behind a proxy (defect 3, re-fixed after staging caught the
 * first answer being wrong on 2026-08-20). What must hold is one sentence:
 * a client cannot change which bucket it lands in by sending headers.
 * /auth/login is the door to hammer — its limiter runs before anything
 * else, and a bad token neither mails nor writes to a log.
 */
describe('rate limiting reads the client the proxy states', () => {
  const flood = async (base: string,
                       headers: (i: number) => Record<string, string>, n = 62) => {
    let limited = 0;
    for (let i = 0; i < n && limited === 0; i++) {
      const res = await fetch(`${base}/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers(i) },
        body: JSON.stringify({ token: 'no' }),
      });
      if (res.status === 429) limited = i + 1;
    }
    return limited;
  };

  it('buckets on cloudflare\'s stated client, whatever x-forwarded-for says', async () => {
    const { base } = await boot({ trustProxy: true });
    // the shape staging actually serves: a rotating edge address on the
    // right, the client's own claim on the left, both ignored
    const limited = await flood(base, (i) => ({
      'cf-connecting-ip': '198.51.100.7',
      'x-forwarded-for': `203.0.113.${i}, 198.51.100.7, 10.7.${i}.${i}`,
    }));
    expect(limited).toBe(61);
  });

  it('gives two clients two buckets', async () => {
    const { base } = await boot({ trustProxy: true });
    const limited = await flood(base, (i) => ({ 'cf-connecting-ip': `198.51.101.${i}` }));
    expect(limited).toBe(0);
  });

  it('counts from the right without cloudflare, so a prepended entry cannot evade it', async () => {
    const { base } = await boot({ trustProxy: true });
    const limited = await flood(base, (i) => ({
      'x-forwarded-for': `10.0.0.${i}, 198.51.102.9`,
    }));
    expect(limited).toBe(61);
  });
});

describe('the operator notification (Ed, 2026-08-20)', () => {
  const toOps = (dataDir: string) =>
    readFileSync(join(dataDir, 'outbox.jsonl'), 'utf8')
      .split('\n').filter((l) => l.length > 0)
      .map((l) => JSON.parse(l) as { to: string; subject: string; text: string; link?: string })
      .filter((m) => m.to === 'ops@example.org');

  it('mails the notify address at the verified save, never at the request', async () => {
    const { base, dataDir } = await boot({ notifyEmail: 'ops@example.org' });
    const created = await (await post(base, '/api/docs', {
      title: 'Night Watch Rota', email: 'nina@example.org',
    })).json() as { ok: boolean; slug: string; devLink: string };
    expect(created.ok).toBe(true);
    // asking to create is not creating: nothing exists, nothing is announced
    expect(toOps(dataDir).length).toBe(0);

    expect((await consume(created.devLink)).status).toBe(302);
    const mails = toOps(dataDir);
    expect(mails.length).toBe(1);
    // the three facts Ed asked for: title, URL, the founder's address
    expect(mails[0]!.subject).toContain('Night Watch Rota');
    expect(mails[0]!.text).toContain('nina@example.org');
    expect(mails[0]!.link).toBe(`${base}/d/${created.slug}`);
  });

  it('stays silent when switched off', async () => {
    const { base, dataDir } = await boot({ notifyEmail: null });
    const created = await (await post(base, '/api/docs', {
      title: 'Quiet Birth', email: 'quinn@example.org',
    })).json() as { ok: boolean; devLink: string };
    expect((await consume(created.devLink)).status).toBe(302);
    expect(toOps(dataDir).length).toBe(0);
  });
});

describe('stage 7: health and graceful shutdown', () => {
  it('/healthz states the store and the document count, uncached', async () => {
    const { base } = await boot();
    expect((await fetch(base + '/', { method: 'HEAD' })).status).toBe(200);
    expect((await fetch(base + '/healthz', { method: 'HEAD' })).status).toBe(200);
    const r = await fetch(base + '/healthz');
    expect(r.status).toBe(200);
    expect(r.headers.get('cache-control')).toBe('no-store');
    const body = await r.json() as { ok: boolean; store: string; documents: number; build: null };
    expect(body).toMatchObject({ ok: true, store: STORE, documents: 0, build: null });
    await post(base, '/api/docs', { title: 'Counted', email: 'c@example.org' });
    // a request, not a save: the count moves only at the verified save
    expect(((await (await fetch(base + '/healthz')).json()) as { documents: number }).documents).toBe(0);
  });

  it('close() lets an in-flight commit land, then refuses new connections', async () => {
    const { base, draft, reopen } = await boot();
    const created = await (await post(base, '/api/docs', {
      title: 'Last Words', email: 'z@example.org',
    })).json() as { devLink: string };
    // the save is the first commit on this document's chain; close while
    // it is in flight and it must still be durable afterwards
    const u = new URL(created.devLink);
    await fetch(created.devLink); // the interstitial; the POST below consumes
    const saving = fetch(u.origin + u.pathname, {
      method: 'POST', redirect: 'manual',
      headers: { 'content-type': 'application/x-www-form-urlencoded', origin: u.origin },
      body: new URLSearchParams({ token: u.searchParams.get('token') ?? '' }).toString(),
    });
    await new Promise((r) => setTimeout(r, 25)); // accepted, in flight
    const closing = draft.close();
    expect((await saving).status).toBe(302);
    await closing;
    await expect(fetch(base + '/healthz')).rejects.toThrow();
    const reopened = new DocStore(await reopen());
    await reopened.loadAll();
    expect([...reopened.all()]).toHaveLength(1);
  });
});

describe('the address is chosen before the email, and reserved on send (Q460/462b)', () => {
  it('checks availability, reserves the promised slug, and tells a second founder "taken"', async () => {
    const { base } = await boot();
    const ask = async (slug: string) =>
      (await (await fetch(`${base}/api/slug/${slug}`)).json()) as
        { available: boolean; legal: boolean; suggestion?: string };

    expect(await ask('hollow-oak')).toEqual({ available: true, legal: true });
    expect((await ask('No Caps')).legal).toBe(false);

    // the founder names the address; the mail promises it
    const first = await post(base, '/api/docs',
      { title: 'The Hollow Oak Club', slug: 'hollow-oak', email: 'ada@example.org' });
    expect(first.status).toBe(200);
    const created = await first.json() as { slug: string; devLink: string };
    expect(created.slug).toBe('hollow-oak');

    // reserved while the creation is pending: a second founder is refused
    // and offered the nearest free address
    // …and the *check* refuses in the same shape as the send, offering the
    // nearest free address. 📍 blocks its commit on this answer (2026-08-22),
    // so a refusal naming no way forward would strand the founder at the one
    // step that mints the document.
    expect(await ask('hollow-oak')).toEqual(
      { available: false, legal: true, suggestion: 'hollow-oak-2' });
    const second = await post(base, '/api/docs',
      { title: 'Another Oak', slug: 'hollow-oak', email: 'bo@example.org' });
    expect(second.status).toBe(409);
    expect(await second.json()).toEqual({ error: 'that address is taken', suggestion: 'hollow-oak-2' });

    // an illegal address is refused outright
    expect((await post(base, '/api/docs',
      { title: 'x', slug: 'Bad Slug', email: 'cy@example.org' })).status).toBe(400);

    // the click creates the document at exactly the address promised
    const saved = await consume(created.devLink);
    expect(saved.status).toBe(302);
    expect(saved.headers.get('location')).toBe('/d/hollow-oak');
    // …and now a document holds it
    expect((await ask('hollow-oak')).available).toBe(false);

    // older clients that send no slug still get one suggested from the title
    const legacy = await (await post(base, '/api/docs',
      { title: 'Hollow Oak', email: 'dee@example.org' })).json() as { slug: string };
    expect(legacy.slug).toBe('hollow-oak-2');
  });

  it('📨 re-sends the same creation: its own reservation, its own stash, no twin', async () => {
    // a bucket of its own: the creation limiter is keyed by client and this
    // file already spends most of one, so the walk states its own address
    // rather than thinning everybody else's budget
    const { base, dataDir } = await boot({ trustProxy: true });
    const send = async (body: unknown) => {
      const res = await fetch(base + '/api/docs', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'cf-connecting-ip': '198.51.103.4' },
        body: JSON.stringify(body),
      });
      return { status: res.status, body: await res.json() as
        { slug?: string; pendingId?: string; devLink?: string; error?: string; suggestion?: string } };
    };

    const first = await send({ title: 'The Hollow Oak Club', slug: 'hollow-oak',
      email: 'ada@example.org' });
    expect(first.status).toBe(200);
    const pendingId = first.body.pendingId!;

    // text pasted while the founder is off to their inbox
    expect((await post(base, '/api/docs/pending',
      { pendingId, text: '# Charter\n\nOne.' })).status).toBe(200);

    // 📨: the same creation asking again. Without the pendingId this is the
    // bug Ed hit — the founder's own reservation refusing them, and the page
    // walking them back to 📍 with a suggestion.
    const naive = await send({ title: 'The Hollow Oak Club', slug: 'hollow-oak',
      email: 'ada@example.org' });
    expect(naive.status).toBe(409);
    expect(naive.body.suggestion).toBe('hollow-oak-2');

    const again = await send({ title: 'The Hollow Oak Club', slug: 'hollow-oak',
      email: 'ada@example.org', pendingId });
    expect(again.status).toBe(200);
    expect(again.body.slug).toBe('hollow-oak');
    // the same stash, so the pasted text is still syncing against it
    expect(again.body.pendingId).toBe(pendingId);
    expect((await post(base, '/api/docs/pending',
      { pendingId, text: '# Charter\n\nOne. Two.' })).status).toBe(200);
    // and still reserved against everybody else
    expect((await send({ title: 'Another Oak', slug: 'hollow-oak',
      email: 'bo@example.org' })).status).toBe(409);

    // the address may still be changed on a resend: the reservation moves
    const moved = await send({ title: 'The Hollow Oak Club', slug: 'oak-club',
      email: 'ada@example.org', pendingId });
    expect(moved.status).toBe(200);
    expect(moved.body.slug).toBe('oak-club');
    const back = await send({ title: 'The Hollow Oak Club', slug: 'hollow-oak',
      email: 'ada@example.org', pendingId });
    expect(back.status).toBe(200);

    // the last link creates the document at the address promised, with the
    // text that was pasted against the stash the resends kept
    const saved = await consume(back.body.devLink!);
    expect(saved.status).toBe(302);
    expect(saved.headers.get('location')).toBe('/d/hollow-oak');

    // …and the earlier link, still in the inbox, is a login rather than a
    // twin at a suffixed address
    const older = await consume(first.body.devLink!);
    expect(older.status).toBe(302);
    expect(older.headers.get('location')).toBe('/d/hollow-oak');
    expect((await (await fetch(`${base}/api/slug/hollow-oak-2`)).json() as
      { available: boolean }).available).toBe(true);
    // …and so does the one that promised the address the founder moved off:
    // every link stays live and forwards to what was created (Q519), however
    // the address moved in between
    const abandoned = await consume(moved.body.devLink!);
    expect(abandoned.status).toBe(302);
    expect(abandoned.headers.get('location')).toBe('/d/hollow-oak');
    // the address the founder moved off is free again: the reservation moved
    // with them rather than being left behind on a name nobody is using
    expect((await (await fetch(`${base}/api/slug/oak-club`)).json() as
      { available: boolean }).available).toBe(true);
    expect((await lastMailTo(dataDir, 'ada@example.org')).link).toBeTruthy();
  });
});

describe('the clock closes the document (SPEC §4.6, Q467)', () => {
  it('closes by tick with nobody online, records the undecided, signs on OK, mails everybody once', async () => {
    const { base, dataDir, draft } = await boot();
    const created = await (await post(base, '/api/docs', {
      title: 'Night Watch Rota', email: 'ada@example.org',
    })).json() as { ok: boolean; slug: string; devLink: string };
    const ada = cookieOf(await consume(created.devLink));
    const slug = created.slug;
    const send = async (cookie: string, name: string, args: unknown) => {
      const res = await post(base, `/api/d/${slug}/cmd`, { cmd: name, args }, cookie);
      return await res.json() as { ok?: boolean; error?: string; result?: unknown };
    };
    const cmd = async (cookie: string, name: string, args: unknown) => {
      const body = await send(cookie, name, args);
      expect(body.error, `${name}: ${body.error}`).toBeUndefined();
      return body.result;
    };
    const viewOf = async (cookie: string) => (await (await fetch(
      `${base}/api/d/${slug}/view`, { headers: { cookie } })).json()) as MemberViewPayload;

    await cmd(ada, 'confirm-starting-text', { text: 'The watch is kept from dusk.\nThe rota is posted weekly.' });
    await cmd(ada, 'invite', { email: 'bo@example.org' });
    await cmd(ada, 'invite', { email: 'cy@example.org' });
    const follow = async (email: string): Promise<string> =>
      cookieOf(await consume((await lastMailTo(dataDir, email)).link!));
    const bo = await follow('bo@example.org');
    const cy = await follow('cy@example.org');
    await cmd(ada, 'set-identity', { name: 'Ada' });
    await cmd(bo, 'set-identity', { name: 'Bo' });
    await cmd(ada, 'set-setting', { setting: 'rate', value: { grant: 4, cap: 8, dripMinutes: 240 } });
    const values: Record<string, unknown> = {
      pace: { shape: 'fixed' }, quorum: { form: 'count', n: 2 },
      authorship: { rung: 'sealed' },
      judgments: { rung: 'after' }, applications: { apply: false },
      admission: { price: 'assembly' },
      machines: { enabled: false, budget: 0 }, lapse: { afterMs: null },
    };
    for (const [setting, value] of Object.entries(values)) {
      await cmd(ada, 'reclaim', { setting });
      await cmd(ada, 'set-setting', { setting, value });
    }
    for (const setting of ['ending', 'bar', 'chamber']) await cmd(ada, 'delegate', { setting });
    const ends = Date.now() + 3600_000;
    for (const [setting, value] of [
      ['ending', { endsAtMs: ends }], ['bar', { pct: 66 }], ['chamber', { rung: 'link' }],
    ] as const) {
      for (const cookie of [ada, bo, cy]) await cmd(cookie, 'answer', { setting, value });
    }
    await cmd(ada, 'begin', {}); // 🍾
    expect((await viewOf(ada)).constitutedAtT).not.toBeNull();

    // a proposal nobody judges: the close will leave it undecided
    await cmd(bo, 'propose-text', { baseVersion: 0,
      hunks: [{ start: 1, end: 2, lines: ['The rota is posted daily.'] }], why: 'weekly is too slow' });
    // before the close there is nothing to sign
    expect((await send(bo, 'acknowledge-close', { comment: 'early' })).error)
      .toContain('has not closed');
    expect((await viewOf(bo)).record).toBeNull();

    // -- T=0 arrives on the minute tick, with nobody online --------------
    await draft.tick(ends + 1_000);
    const closed = await viewOf(bo);
    expect(closed.view.closed).not.toBeNull();
    expect(closed.view.closed!.at).toBe(ends);
    expect(closed.view.frozen).toBe(false);
    expect(closed.view.mustReturn).toBeNull();
    // the third outcome, with its field and the text that stood
    expect(closed.records.some((r) => r.outcome === 'undecided')).toBe(true);
    const rec = closed.record!;
    expect(rec.closedAt).toBe(ends);
    expect(rec.text).toBe('The watch is kept from dusk.\nThe rota is posted weekly.');
    expect(rec.adopted).toEqual([]);
    expect(rec.undecided).toHaveLength(1);
    expect(rec.undecided[0]!.displaced).toEqual(['The rota is posted weekly.']);
    // sealed authorship unseals at the record (§3.5a): the field names its author
    expect(rec.undecided[0]!.field[0]!.author).toEqual(expect.objectContaining({ name: 'Bo' }));
    expect(rec.carriedButUnassented).toEqual([]);
    expect(rec.signatures).toEqual([]);

    // -- after the close nothing moves but the signing --------------------
    expect((await send(cy, 'propose-text', { baseVersion: 1,
      hunks: [{ start: 0, end: 1, lines: ['x'] }], why: '' })).error).toContain('closed');
    expect((await send(ada, 'set-setting', { setting: 'rate',
      value: { grant: 1, cap: 1, dripMinutes: 1 } })).error).toContain('closed');
    expect((await send(cy, 'judge-race', { a: 'c1', b: 'inc:x', outcome: 'a' })).error)
      .toContain('closed');
    await cmd(bo, 'acknowledge-close', { comment: 'I still think daily.' });
    expect((await send(bo, 'acknowledge-close', { comment: 'again' })).error)
      .toContain('already signed');
    await cmd(cy, 'acknowledge-close', {}); // blank is a real signature
    const long = 'x'.repeat(LIMITS.why + 1);
    expect((await send(ada, 'acknowledge-close', { comment: long })).error).toBeTruthy();
    const signed = await viewOf(bo);
    expect(signed.view.closed!.mySignature).toEqual(expect.objectContaining({ comment: 'I still think daily.' }));
    expect(signed.record!.signatures.map((s) => [s.name, s.comment]))
      .toEqual([['Bo', 'I still think daily.'], [null, '']]);

    // -- the mail: every member and invitee, once, and not again next minute
    const closedMails = () => readFileSync(join(dataDir, 'outbox.jsonl'), 'utf8')
      .split('\n').filter((l) => l.length > 0)
      .map((l) => JSON.parse(l) as { to: string; subject: string; link?: string })
      .filter((m) => m.subject === '“Night Watch Rota” has closed');
    expect(closedMails().map((m) => m.to).sort())
      .toEqual(['ada@example.org', 'bo@example.org', 'cy@example.org']);
    expect(closedMails()[0]!.link).toBe(`${base}/d/${slug}`);
    await draft.tick(ends + 61_000);
    expect(closedMails()).toHaveLength(3);
  });
});

type StrangerPayload = {
  stranger: true; seq: number; eseq: number; devMail: boolean; title: string; slug: string;
  constitutedAtT: number | null; closed: { at: number } | null; frozen: boolean;
  serverNowMs: number; textConfirmed: boolean;
  holding: { kind: string; sentence: string | null };
  founder: { name: string | null; picture: string | null };
  canRead: boolean; text: string | null;
  textShape: Array<{ heading: number; chars: number }>;
  mayApply: boolean; admission: string; applyOpen: boolean; joinOpen: boolean;
  members: { arrived: number; list: Array<{ name: string | null; picture: string | null }> | null };
  view: { settings: Array<{ setting: string; kind: string; value: unknown; settledBy: string | null;
    holder: string; collecting: boolean; powers: { unilateral: boolean; assent: boolean } }>;
    gates: { proposing: boolean; judging: boolean }; crowned: boolean };
};

describe("the stranger's door (Q452/455/456)", () => {
  it('answers a real slug with the rules, the shape of the text and one sentence; an unknown slug 404', async () => {
    const { base } = await boot();
    expect((await fetch(`${base}/api/d/no-such-charter/view`)).status).toBe(404);
    const created = await (await post(base, '/api/docs', {
      title: 'Orchard Rules', email: 'ada@example.org',
    })).json() as { ok: boolean; slug: string; devLink: string };
    const ada = cookieOf(await consume(created.devLink));
    const slug = created.slug;
    const cmd = async (cookie: string, name: string, args: unknown) => {
      const body = await (await post(base, `/api/d/${slug}/cmd`,
        { cmd: name, args }, cookie)).json() as { error?: string };
      expect(body.error, `${name}: ${body.error}`).toBeUndefined();
    };
    const knock = async (): Promise<{ status: number; body: StrangerPayload; raw: string }> => {
      const res = await fetch(`${base}/api/d/${slug}/view`);
      const raw = await res.text();
      return { status: res.status, body: JSON.parse(raw) as StrangerPayload, raw };
    };

    // the birth: the constitution is being drafted, nothing to redact yet
    let k = await knock();
    expect(k.status, k.raw).toBe(200);
    expect(k.body.stranger).toBe(true);
    expect(k.body.title).toBe('Orchard Rules');
    expect(k.body.holding).toEqual({ kind: 'drafting', sentence: 'The constitution is being drafted.' });
    expect(k.body.text).toBeNull();
    expect(k.body.textShape).toEqual([]);
    expect(k.body.canRead).toBe(false);

    // Text confirmed. **Nothing arrives delegated** (Ed, 2026-08-21, amending
    // §9.0a): 🌍 is the founder's until they hand it over, so the door names
    // them first and the membership only once the hand-over has happened.
    await cmd(ada, 'confirm-starting-text', { text: '# The orchard\nThe apples are shared at harvest.' });
    k = await knock();
    expect(k.body.holding.kind).toBe('founder-deciding');
    expect(k.body.holding.sentence).toMatch(/deciding if you can see this document\.$/);
    await cmd(ada, 'delegate', { setting: 'chamber' });
    k = await knock();
    expect(k.body.holding.kind).toBe('members-deciding');
    expect(k.body.holding.sentence).toBe('The members are deciding if you can see this document.');
    expect(k.body.textShape).toEqual([
      { heading: 1, chars: 'The orchard'.length },
      { heading: 0, chars: 'The apples are shared at harvest.'.length },
    ]);
    expect(k.raw).not.toMatch(/apples|harvest|The orchard/); // the shape, never the words
    // nothing about anybody: no addresses, no answers, no motions, no questions
    expect(k.raw).not.toContain('@example.org');
    expect(k.raw).not.toMatch(/"answers"|"motions"|"questions"|"myAnswer"|"answeredCount"/);
    // the rules read plainly: standing values, holders, powers
    const chamberRow = k.body.view.settings.find((s) => s.setting === 'chamber')!;
    expect(chamberRow.holder).toBe('members');
    expect(chamberRow.settledBy).toBeNull();

    // the founder takes 🌍 back pre-start: now the founder is deciding — unnamed, so "The founder"
    await cmd(ada, 'reclaim', { setting: 'chamber' });
    k = await knock();
    expect(k.body.holding).toEqual({ kind: 'founder-deciding',
      sentence: 'The founder is deciding if you can see this document.' });
    expect(k.body.founder).toEqual({ name: null, picture: null });
    // named, the sentence names them (Q455) — never "Anonymous"
    await cmd(ada, 'set-identity', { name: 'Ada Lovell' });
    k = await knock();
    expect(k.body.holding.sentence).toBe('The founder Ada Lovell is deciding if you can see this document.');
    expect(k.body.founder.name).toBe('Ada Lovell');

    // The sentence is TEXT, and a name is a member's own string: the door
    // carries it raw and every consumer escapes at the point it becomes
    // markup (review #2 — the page dropped it into innerHTML, which made a
    // founder's name executable in an unauthenticated visitor's browser).
    // Escaping here instead would double-escape the consumer that sets it
    // with textContent, so the contract is pinned rather than moved.
    await cmd(ada, 'set-identity', { name: '<img src=x onerror=alert(1)> & Co' });
    k = await knock();
    expect(k.body.holding.sentence)
      .toBe('The founder <img src=x onerror=alert(1)> & Co is deciding if you can see this document.');
    expect(k.body.founder.name).toBe('<img src=x onerror=alert(1)> & Co');
    await cmd(ada, 'set-identity', { name: 'Ada Lovell' });

    // whether a rule is still being collected is the module's own flag: the
    // door states rules, and a count would be a standings read (§9.0b).
    // 💤 has to be handed over first — nothing arrives delegated, so nothing
    // is collecting until the founder opens it (Ed, 2026-08-21).
    await cmd(ada, 'delegate', { setting: 'lapse' });
    k = await knock();
    expect(k.body.view.settings.find((x) => x.setting === 'lapse')!.collecting).toBe(true);
    expect(k.raw).not.toMatch(/"answeredCount"/);

    // members only: who decided, what they decided — taking 🌍 back first,
    // since the founder handed it to the room a few lines above
    await cmd(ada, 'reclaim', { setting: 'chamber' });
    await cmd(ada, 'set-setting', { setting: 'chamber', value: { rung: 'closed' } });
    k = await knock();
    expect(k.body.holding).toEqual({ kind: 'members-only',
      sentence: 'The founder Ada Lovell decided this document is visible to members only.' });
    expect(k.body.text).toBeNull();

    // members-only: the door counts the room and never names it (Q508(c))
    expect(k.body.members.list).toBeNull();

    // the link is enough: the text itself
    await cmd(ada, 'set-setting', { setting: 'chamber', value: { rung: 'link' } });
    k = await knock();
    expect(k.body.holding).toEqual({ kind: 'open', sentence: null });
    expect(k.body.canRead).toBe(true);
    // and with it the membership: the Members list is a section of the very
    // constitution the door is showing (Q508(c), Ed 2026-08-21)
    expect(k.body.members.list).toEqual([{ name: 'Ada Lovell', picture: null }]);
    expect(k.body.text).toBe('# The orchard\nThe apples are shared at harvest.');

    // the poll's short answer works for a stranger too
    const quiet = await fetch(`${base}/api/d/${slug}/view?since=${k.body.seq}.${k.body.eseq}`);
    expect(Object.keys(await quiet.json() as object).sort()).toEqual(['eseq', 'seq']);

    // a command still needs a seat
    const refused = await post(base, `/api/d/${slug}/cmd`, { cmd: 'set-identity', args: { name: 'x' } });
    expect(refused.status).toBe(401);

    // the one task: log in — the same answer whoever asks (no membership oracle)
    const unknown = await (await post(base, `/api/d/${slug}/login`, { email: 'nobody@example.org' })).json();
    expect(unknown).toEqual({ ok: true });
    const known = await (await post(base, `/api/d/${slug}/login`, { email: 'ada@example.org' })).json() as
      { ok: boolean; devLink?: string };
    expect(known.ok).toBe(true);
    // applications: closed until the document begins, whatever the policy
    expect(k.body.applyOpen).toBe(false);
    expect(k.body.mayApply).toBe(false);
  });
});

/**
 * **Foundership carries a read, independent of 🌍** (Ed, 2026-08-22).
 *
 * 🌍 settles who may read a document *besides* the people it is already
 * about. A clerk founder is not a member, so under *members only* the
 * document's own clause read as though it shut out the person who convened
 * it — and the surface said so in as many words. The server has never
 * behaved that way (the convenor's seat is always alive, and the member
 * branch consults no rung), but nothing pinned it, and the one place that
 * *does* gate a read on the rung — the applicant branch — is one refactor
 * away from being the rule for everybody who is not on the roster.
 */
describe('the founder reads their own document (2026-08-22)', () => {
  it('a clerk founder reads the text under members-only, and a stranger does not', async () => {
    const { base } = await boot();
    const created = await (await post(base, '/api/docs', {
      title: 'Clerk Convened Charter', email: 'ada@example.org', isMember: false,
    })).json() as { slug: string; devLink: string };
    const ada = cookieOf(await consume(created.devLink));

    const cmd = async (name: string, args: unknown) => {
      const body = await (await post(base, `/api/d/${created.slug}/cmd`,
        { cmd: name, args }, ada)).json() as { error?: string };
      expect(body.error, `${name}: ${body.error}`).toBeUndefined();
    };
    await cmd('confirm-starting-text', { text: 'The clubhouse shall be kept open.' });
    await cmd('set-setting', { setting: 'chamber', value: { rung: 'closed' } });

    // the founder is not on the roster at all — this is the clerk case
    const mine = await (await fetch(base + `/api/d/${created.slug}/view`,
      { headers: { cookie: ada } })).json() as
      { isFounder: boolean; text?: string; convenor: { isMember: boolean } };
    expect(mine.convenor.isMember).toBe(false);
    expect(mine.isFounder).toBe(true);
    expect(mine.text).toContain('clubhouse');

    // …and the rung still means what it says to everybody else
    const door = await (await fetch(base + `/api/d/${created.slug}/view`)).json() as
      { canRead: boolean; text: string | null };
    expect(door.canRead).toBe(false);
    expect(door.text).toBe(null);
  });
});

describe('the phase ladder (Q674–Q678)', () => {
  it('walks one real document from birth to a closed session with signatures', async () => {
    const { base } = await boot();
    interface Step { slug: string; docId: string; phase: string; seed: number;
      seats: { id: string; name: string; founder: boolean }[];
      built: string[]; skipped: string[]; error?: string }
    let last: Step | null = null;
    let cookie = '';
    const press = async (to: string): Promise<Step> => {
      const res = await post(base, '/api/dev/ladder', {
        to, ...(last === null ? { seed: 42 } : { slug: last.slug }),
      });
      const body = await res.json() as Step;
      expect(body.error, `press to ${to} — ${res.status}: ${JSON.stringify(body)}`).toBeUndefined();
      cookie = cookieOf(res);
      // **nothing the ladder writes may be stamped past real now**, or tOf's
      // clamp drags every later command into the future with it
      last = body;
      return body;
    };
    const viewOf = async () => await (await fetch(`${base}/api/d/${last!.slug}/view`,
      { headers: { cookie } })).json() as MemberViewPayload;

    // -- one press per rung, the same document throughout ----------------
    const constitution = await press('constitution');
    expect(constitution.phase).toBe('constitution');
    expect(constitution.seed).toBe(42);
    expect(constitution.slug).toBe('ladder-16'); // the seed rides the address
    expect(constitution.seats).toHaveLength(20); // ~20 members (Q678)
    expect(constitution.seats[0]!.founder).toBe(true);

    const ready = await press('ready');
    expect(ready.skipped, ready.skipped.join(' · ')).toEqual([]);
    // **the rung stops one press short of 🍾** (Q678): the start is the
    // transition worth watching, so the stagehand does not spend it
    expect(ready.phase).toBe('ready');
    const beforeStart = await viewOf();
    expect(beforeStart.constitutedAtT).toBeNull();
    expect(beforeStart.readiness!.ready).toBe(true);

    const session = await press('session');
    expect(session.phase).toBe('session');
    expect(session.skipped, session.skipped.join(' · ')).toEqual([]);
    expect(session.built.join(' · ')).toMatch(/30 text proposals over 10 clauses/);

    // -- the document itself, not the ladder's account of it -------------
    const live = await viewOf();
    expect(live.constitutedAtT).not.toBeNull();
    // really begun in the past, so the ramp is genuinely part-way up
    expect(live.constitutedAtT!).toBeLessThan(Date.now() - 60_000);
    expect(live.view.members).toHaveLength(20);
    // proposals of different kinds, all at once (Q678)
    const candidates = live.clauses.reduce((n, c) => n + c.candidates.length, 0);
    // how many stay live depends on the host's cooldown — this boot tunes it
    // to nothing, so far more of the thirty carry than a real room would see
    expect(candidates).toBeGreaterThanOrEqual(5);
    expect(live.records.length).toBeGreaterThan(0); // some carried
    expect(live.raceCards.length).toBeGreaterThan(0); // and there is judging to do
    const statuses = new Set(live.view.motions.map((m) => `${m.route}:${m.status}`));
    expect(statuses.size).toBeGreaterThanOrEqual(4);
    expect([...statuses].some((s) => s.startsWith('ordinary:'))).toBe(true);
    expect([...statuses].some((s) => s.startsWith('constitutional:'))).toBe(true);
    expect(live.view.applicants.length).toBeGreaterThan(0);
    // the 👑 route, reachable only because 🛡️ was reserved before anything carried
    expect(live.view.crownTasks.length).toBeGreaterThan(0);

    const closing = await press('closing');
    expect(closing.phase).toBe('closing');
    const nearly = await viewOf();
    expect(nearly.view.closed).toBeNull(); // not yet — the real clock closes it

    const closed = await press('closed');
    expect(closed.phase).toBe('closed');
    expect(closed.built.join(' · ')).toMatch(/members signed/);
    const done = await viewOf();
    expect(done.view.closed).not.toBeNull();
    expect(done.record).not.toBeNull();
    expect(done.record!.signatures.length).toBeGreaterThan(0);
    // …and signed with real words, which is what the closing comment is
    expect(done.record!.signatures.some((s) => (s.comment ?? '').length > 0)).toBe(true);
  }, 120_000);
});

/**
 * **The open-join link admits the visitor, not just verifies them**
 * (backlog 73, Q894–Q896). Under the `open` rung the surface promises
 * *anyone with the link becomes a member the moment they open it*, and the
 * module keeps that promise — `submitApplication` auto-admits with no motion
 * in the way. The HTTP seam did not: `/auth/apply` verified and handed an
 * applicant cookie whatever the policy, so the visitor sat at `verified` for
 * ever with no road onward (the page draws an `open` applicant no rail at
 * all, believing the landing already made them a member). The module's own
 * `open` test passes because it calls `submitApplication` directly, which is
 * exactly why the gap lived here and not there.
 */
describe('the open join link admits (backlog 73)', () => {
  it('a visitor who follows the apply link under `open` lands a member, with no motion in the way', async () => {
    const { base, draft } = await boot();
    const created = await (await post(base, '/api/docs', {
      title: 'Open Commons Charter', email: 'ada@example.org',
    })).json() as { ok: boolean; slug: string; devLink: string };
    const ada = cookieOf(await consume(created.devLink));
    const slug = created.slug;
    const cmd = async (cookie: string, name: string, args: unknown) => {
      const res = await post(base, `/api/d/${slug}/cmd`, { cmd: name, args }, cookie);
      const body = await res.json() as { ok?: boolean; error?: string; result?: unknown };
      expect(body.error, `${name}: ${body.error}`).toBeUndefined();
      return body.result;
    };
    const viewOf = async (cookie: string) => (await (await fetch(
      `${base}/api/d/${slug}/view`, { headers: { cookie } })).json()) as MemberViewPayload;

    await cmd(ada, 'confirm-starting-text', { text: 'The commons are open to all.' });
    await cmd(ada, 'set-setting',
      { setting: 'rate', value: { grant: 4, cap: 8, dripMinutes: 240 } });
    // the founder keeps every question: a delegated one never resolves on a
    // single voice (§9.0a), and this document has a membership of one
    const values: Record<string, unknown> = {
      ending: { endsAtMs: Date.now() + 3600_000 },
      pace: { shape: 'fixed' }, bar: { pct: 66 },
      quorum: { form: 'count', n: 1 }, chamber: { rung: 'link' },
      authorship: { rung: 'sealed' }, judgments: { rung: 'after' },
      applications: { apply: true }, admission: { price: 'pen' }, // open: yes, at ✒️
      machines: { enabled: false, budget: 0 }, lapse: { afterMs: null },
    };
    for (const [setting, value] of Object.entries(values)) {
      await cmd(ada, 'reclaim', { setting });
      await cmd(ada, 'set-setting', { setting, value });
    }
    await cmd(ada, 'begin', {}); // 🍾
    expect((await viewOf(ada)).constitutedAtT).not.toBeNull();

    // -- the visitor knocks, and the mail is the whole of the joining ----
    const knock = await (await post(base, `/api/d/${slug}/apply`,
      { email: 'dee@example.org' })).json() as { ok: boolean; devLink: string };
    expect(knock.ok).toBe(true);
    const landed = await consume(knock.devLink);
    expect(landed.status).toBe(302);
    const dee = cookieOf(landed);

    // arrival IS joining: the roster holds them, arrived, from the landing
    // itself — no `submit-application` was posted and no admit motion ran
    const live = draft.store.bySlug(slug)!;
    const deeMember = [...live.cs.memberRecords().values()]
      .find((m) => m.email === 'dee@example.org');
    expect(deeMember).toBeDefined();
    expect(deeMember!.arrivedAtT).not.toBeNull();
    expect(deeMember!.removed).toBe(false);
    expect([...live.cs.applicantRecords().values()]
      .find((a) => a.email === 'dee@example.org')!.status).toBe('admitted');

    // the seat the link handed back is a member's, not an applicant's:
    // the member view answers it, where an `app:` cookie is served the
    // applicant's own thin payload instead
    const deeView = await viewOf(dee);
    expect(deeView.me).toBe(deeMember!.id);
    expect(deeView.isFounder).toBe(false);
    expect((deeView as unknown as { applicant?: unknown }).applicant).toBeUndefined();
    expect(deeView.text).toContain('The commons are open to all.');

    // nothing was put before the room: no admit motion, no admit race
    const adaView = await viewOf(ada);
    expect(adaView.view.motions.some((m) =>
      (m.payload as { kind?: string } | null)?.kind === 'admit')).toBe(false);
    expect(adaView.raceCards.some((c) =>
      (c.a.setting?.settingId ?? '').startsWith('admit:') ||
      (c.b.setting?.settingId ?? '').startsWith('admit:'))).toBe(false);
    expect(adaView.view.members.some((m) => m.email === 'dee@example.org')).toBe(true);
  }, 60_000);
});
