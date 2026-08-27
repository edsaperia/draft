/**
 * **Promise-coverage — 🌍 chamber, the server half** (backlog entry 82,
 * series 77). 🌍 is the one setting whose promise a surface predicate cannot
 * keep: every other setting is about what a *member* may do or see, and this
 * one is about who may read at all — a reader who is not a member is by
 * definition not running the page's predicates. They are a second client
 * meeting a route with a slug and no cookie. So the enforcement is here or
 * it is nowhere, and this file is the route table asserted.
 *
 * ── the table: route × rung × reader × epoch ──────────────────────────────
 *
 * **The routes** an unauthenticated caller can reach with a slug in hand:
 *
 * | route | consults 🌍? | what it gives a reader with no seat |
 * | --- | --- | --- |
 * | `GET /api/d/:slug/view` | **yes**, `strangerView`'s `canRead` | the door: title, founder's name and picture, every standing rule, the text's *shape*, how many have arrived, one holding sentence — plus `text` and `members.list` only where `canRead` |
 * | `POST /api/d/:slug/cmd` | no — 401 `log in first` before any rung is read | nothing |
 * | `GET /d/:slug` | **no** | `session-view.html` for any slug the store knows; 404 otherwise. The page then asks `/view` and gets the door. |
 * | `GET /healthz` | n/a | counts and the booted catalogue; names no document |
 * | `GET /api/slug/:slug` | **no** | whether an address is free — so it confirms a document exists, at every rung |
 * | `GET /api/dev/outbox` · `/api/dev/ladder` · `POST /api/dev/seat` | no | 404 unless `mailer.dev`, and dropped from the built artifact by `--drop-labels=DEV` |
 *
 * **The rungs**, and what `canRead` makes of them (`server.ts`, `strangerView`):
 * `closed` → false · `link` → true · `public` → true · **unsettled** (founder
 * deciding, or delegated and collecting) → false. So *unsettled reads as
 * `closed`*, which is the safe direction, and `link` and `public` are the
 * **same behaviour** — Q527's *not yet*, asserted below as an identical
 * payload so that a later listing feature has to touch this file on purpose.
 *
 * **The readers**, and which branch of `/api/d/:slug/view` each lands in:
 *
 * | reader | branch | rung consulted? |
 * | --- | --- | --- |
 * | member, arrived | the member branch | **no** — a member reads whatever the rung says |
 * | **lapsed** member | the member branch (`seatAlive` asks only `!m.removed`) | no — §9.5a, a stall, not a departure |
 * | **removed** member | the **door** (`seatAlive` false — review #1, finding 1) | yes |
 * | clerk founder | the member branch (the convenor's seat is always alive) | no — X12, R-042, foundership carries a read |
 * | **applicant** mid-application | their own branch | **yes**, `chamber.rung !== 'closed'` gates `text` (stage 3 defect 7, review #1 finding 12) |
 * | stranger with the address | the door | yes |
 * | **invitee** who has not followed their link | the door — no cookie, and an invitation is not a membership (§9.6a) | yes |
 *
 * **The epochs.** *Before 🍾* the door serves the shape of a confirmed text
 * while the room decides 🌍, and *drafting* before the text is confirmed.
 * *Live* the rung is the rule and the founder's pen can move it. *After the
 * close* the door serves `closed: { at }` and, where `canRead`, the engine's
 * final `document()` — but the **record** (adoptions, backlog, carried-but-
 * unassented, the signatures) is built only in `raceView` and served only to
 * a seated member, which is §9.3's *the record's distribution is the
 * convenor's* read literally: a stranger under `public` reads the final text
 * and not who signed it. A **perpetual** document (`ending.endsAtMs === null`)
 * has no third epoch at all and the door's `closed` stays null for ever.
 *
 * **Not duplicated here.** `server.test.ts`'s *the stranger's door
 * (Q452/455/456)* already walks the five `holding.kind`s, the shape, the
 * XSS contract on the founder's name, the poll's short answer and the 401 on
 * a seatless `cmd`; *the founder reads their own document (2026-08-22)* pins
 * X12 for a clerk under `closed`. This file extends rather than repeats: the
 * rungs against each *other*, the six other readers, the three epochs, and
 * raw-body assertions — a field list misses the new field that leaks.
 *
 * **The one assertion that cannot run in the seat matrix.** `mailer.dev` is
 * true exactly when there is no Resend key, which is how every walk in this
 * project runs its server. The *production posture* — `/api/dev/*` answering
 * 404 — is therefore only reachable from a test that boots its own server
 * with a key, and it lives in the last `describe` below and nowhere else.
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
const DAY = 24 * 3600_000;

/** The door's payload — `strangerView` plus the two freshness counters. */
type Door = {
  stranger: true; seq: number; eseq: number; devMail: boolean; title: string; slug: string;
  constitutedAtT: number | null; closed: { at: number } | null; frozen: boolean;
  serverNowMs: number; textConfirmed: boolean;
  holding: { kind: string; sentence: string | null };
  founder: { name: string | null; picture: string | null };
  canRead: boolean; text: string | null;
  textShape: Array<{ heading: number; chars: number }>;
  mayApply: boolean; admission: string; applyOpen: boolean; joinOpen: boolean;
  members: { arrived: number; list: Array<{ name: string | null; picture: string | null }> | null };
  view: { settings: Array<{ setting: string; value: unknown; holder: string;
    settledBy: string | null; collecting: boolean }>;
    gates: { proposing: boolean; judging: boolean }; crowned: boolean };
};
/** Whatever a seated reader gets — loose, since the point is what is *there*. */
type Seated = Record<string, unknown> & { me?: string; stranger?: true; text?: string | null;
  record?: unknown; applicant?: unknown; view?: { members?: Array<{ email: string }> } };

interface Booted { base: string; draft: DraftServer; dataDir: string }
const booted: Booted[] = [];

async function boot(over: { resendApiKey?: string | null } = {}): Promise<Booted> {
  const dataDir = mkdtempSync(join(tmpdir(), 'draft-chamber-'));
  const cfg = {
    port: 0, dataDir, baseUrl: 'http://127.0.0.1', designDir: DESIGN_DIR,
    resendApiKey: null as string | null, mailFrom: 'test <t@example.org>', mailOff: false,
    secret: 'test-secret', store: 'file' as const, databaseUrl: null,
    trustProxy: false, buildSha: null, notifyEmail: null,
    engineTuning: { cooldownMs: 0 },
    ...over,
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

const lastMailTo = async (b: Booted, to: string): Promise<{ link?: string }> => {
  await b.draft.outbox.drain();
  const mine = readFileSync(join(b.dataDir, 'outbox.jsonl'), 'utf8')
    .split('\n').filter((l) => l.length > 0)
    .map((l) => JSON.parse(l) as { to: string; link?: string })
    .filter((m) => m.to === to);
  expect(mine.length, `no mail to ${to}`).toBeGreaterThan(0);
  return mine[mine.length - 1]!;
};

/**
 * One founded document, driven over the wire the way the door test does.
 * 🌍 is **founder-held and set** rather than delegated, so the pen can move
 * it live — which is the only road to the same document at three rungs.
 */
async function found(b: Booted, opts: {
  title: string; clerk?: boolean; chamber?: 'closed' | 'link' | 'public' | null;
  applications?: boolean; endsAtMs?: number | null; lapseMs?: number | null;
  members?: string[]; begin?: boolean; keepRemovePen?: boolean;
}) {
  const created = await (await post(b.base, '/api/docs', {
    title: opts.title, email: 'ada@example.org', isMember: opts.clerk !== true,
  })).json() as { slug: string; devLink: string };
  const slug = created.slug;
  const ada = cookieOf(await consume(created.devLink));
  const send = (cookie: string, name: string, args: unknown) =>
    post(b.base, `/api/d/${slug}/cmd`, { cmd: name, args }, cookie)
      .then((r) => r.json() as Promise<{ error?: string; result?: unknown }>);
  const cmd = async (cookie: string, name: string, args: unknown) => {
    const body = await send(cookie, name, args);
    expect(body.error, `${name}: ${body.error}`).toBeUndefined();
    return body.result;
  };
  await cmd(ada, 'set-identity', { name: 'Ada Lovell' });
  await cmd(ada, 'confirm-starting-text',
    { text: '# The orchard\nThe apples are shared at harvest.' });

  const cookies: Record<string, string> = { ada };
  const names: Record<string, string> = { 'bo@example.org': 'Bo Vane', 'cy@example.org': 'Cy Marsh' };
  for (const email of opts.members ?? []) {
    await cmd(ada, 'invite', { email });
    cookies[email] = cookieOf(await consume((await lastMailTo(b, email)).link!));
    if (names[email]) await cmd(cookies[email]!, 'set-identity', { name: names[email] });
  }

  const settle = async () => {
    const values: Record<string, unknown> = {
      ending: { endsAtMs: opts.endsAtMs === undefined ? Date.now() + 400 * DAY : opts.endsAtMs },
      bar: { pct: 66 },
      rate: { grant: 4, cap: 8, dripMinutes: 240 },
      pace: { shape: 'fixed' }, quorum: { form: 'count', n: 1 },
      authorship: { rung: 'sealed' }, judgments: { rung: 'after' },
      applications: { apply: opts.applications === true },
      admission: { price: 'assembly' }, removal: { price: 'consent' },
      machines: { enabled: false, budget: 0 },
      lapse: { afterMs: opts.lapseMs ?? null },
    };
    if (opts.chamber != null) values.chamber = { rung: opts.chamber };
    for (const [setting, value] of Object.entries(values)) {
      await cmd(ada, 'reclaim', { setting });
      await cmd(ada, 'set-setting', { setting, value });
    }
  };
  const begin = async () => {
    // ❌'s ✒️ is laid down at 🍾 unless kept: the removed-reader case needs
    // it, every other document is tidier without it (§9.7 rule 9, R-048)
    if (opts.keepRemovePen !== true) {
      await cmd(ada, 'relinquish', { setting: 'door:remove', power: 'unilateral' });
    }
    await cmd(ada, 'begin', {});
  };
  if (opts.begin !== false) { await settle(); await begin(); }
  const knock = async (cookie?: string): Promise<{ body: Door & Seated; raw: string }> => {
    const res = await fetch(`${b.base}/api/d/${slug}/view`,
      cookie === undefined ? {} : { headers: { cookie } });
    const raw = await res.text();
    expect(res.status, raw).toBe(200);
    return { body: JSON.parse(raw) as Door & Seated, raw };
  };
  const setRung = (rung: string) => cmd(ada, 'set-setting',
    { setting: 'chamber', value: { rung }, why: 'so the cohort can read along' });
  return { slug, ada, cookies, cmd, send, knock, settle, begin, setRung };
}

/** Everything a stranger must never be handed, whatever the rung. */
const NEVER: Array<[string, RegExp]> = [
  ['an address', /@example\.org/],
  ['anybody\'s own answer', /"myAnswer"/],
  ['how many have answered', /"answeredCount"/],
  ['the answers themselves', /"answers"/],
  ['motions in flight', /"motions"/],
  ['the blind questions', /"questions"/],
  // `"judgments"` on its own is 👁️'s **setting row**, which is a rule and
  // public by Q455 — what must never appear is a judgment or a count of them
  ['judgments', /"judgedByMe"|"judgments"\s*:\s*\[/],
  ['the signatures', /"signatures"/],
  ['the record', /"record"/],
  ['a member\'s wallet', /"wallet"/],
  ['the stagehand\'s roster', /"seats"/],
];
/** …and what only the *words* rungs may carry. */
const ONLY_WHERE_CAN_READ: Array<[string, RegExp]> = [
  ['the text itself', /apples|harvest|The orchard/],
  ['a member\'s name', /Bo Vane|Cy Marsh/],
];

const assertRedacted = (raw: string, canRead: boolean) => {
  for (const [what, re] of NEVER) expect(raw, `the door served ${what}`).not.toMatch(re);
  for (const [what, re] of ONLY_WHERE_CAN_READ) {
    if (canRead) expect(raw, `canRead and yet no ${what}`).toMatch(re);
    else expect(raw, `the door served ${what} at a rung that forbids it`).not.toMatch(re);
  }
};

describe('🌍 the rungs, at the door (entry 82)', () => {
  it('closed and unsettled redact alike; link and public serve an identical payload', async () => {
    const b = await boot();
    const d = await found(b, { title: 'Orchard Rules', members: ['bo@example.org'],
      chamber: null, begin: false });
    await d.settle();

    // ---- unsettled, founder-held: reads as `closed`, the safe direction ----
    let k = await d.knock();
    expect(k.body.holding.kind).toBe('founder-deciding');
    expect(k.body.canRead).toBe(false);
    expect(k.body.text).toBeNull();
    expect(k.body.members.list).toBeNull();
    assertRedacted(k.raw, false);
    // the *shape* is served at every rung — real metrics, never the words
    expect(k.body.textShape).toEqual([
      { heading: 1, chars: 'The orchard'.length },
      { heading: 0, chars: 'The apples are shared at harvest.'.length },
    ]);

    // ---- delegated and collecting: still `closed`'s behaviour -------------
    await d.cmd(d.ada, 'delegate', { setting: 'chamber' });
    k = await d.knock();
    expect(k.body.holding.kind).toBe('members-deciding');
    expect(k.body.canRead).toBe(false);
    assertRedacted(k.raw, false);
    await d.cmd(d.ada, 'reclaim', { setting: 'chamber' });

    // ---- closed ----------------------------------------------------------
    await d.setRung('closed');
    k = await d.knock();
    expect(k.body.holding).toEqual({ kind: 'members-only',
      sentence: 'The founder Ada Lovell decided this document is visible to members only.' });
    expect(k.body.canRead).toBe(false);
    assertRedacted(k.raw, false);
    // and yet the door is *not* silent, which is the ruling and not a bug
    // (Q452/455/456): the title, the founder, every rule, the shape, the count
    expect(k.body.title).toBe('Orchard Rules');
    expect(k.body.founder.name).toBe('Ada Lovell');
    expect(k.body.members.arrived).toBe(2);
    expect(k.body.view.settings.length).toBeGreaterThan(10);

    // ---- link ------------------------------------------------------------
    await d.setRung('link');
    const atLink = await d.knock();
    expect(atLink.body.canRead).toBe(true);
    expect(atLink.body.text).toBe('# The orchard\nThe apples are shared at harvest.');
    expect(atLink.body.members.list)
      .toEqual([{ name: 'Ada Lovell', picture: null }, { name: 'Bo Vane', picture: null }]);
    assertRedacted(atLink.raw, true);

    // ---- public: **the same payload**, byte for byte but its own row ------
    // Q527 (Ed, 2026-08-22, *(c) the not-yet reading*): `public` means listed
    // as well as readable, and nothing lists documents today. `canRead` is
    // `link || public`, which is `link`'s promise exactly. This assertion is
    // the lock on that: whoever builds *findable* has to come here on purpose.
    await d.setRung('public');
    const atPublic = await d.knock();
    const strip = (x: Door) => ({
      ...x, seq: 0, eseq: 0, serverNowMs: 0,
      view: { ...x.view, settings: x.view.settings.filter((s) => s.setting !== 'chamber') },
    });
    expect(strip(atPublic.body)).toEqual(strip(atLink.body));
    expect(atPublic.body.view.settings.find((s) => s.setting === 'chamber')!.value)
      .toEqual({ rung: 'public' });
    assertRedacted(atPublic.raw, true);
  });

  it('a clerk founder reads the room at every rung; 🌍 is about everybody else (X12)', async () => {
    const b = await boot();
    // a clerk document does not reach 🍾 at HEAD (Q920 — the start waits on a
    // voice a clerk does not hold), so this walks the pre-start epoch
    const d = await found(b, { title: 'Clerk Convened Charter', clerk: true, begin: false });
    await d.settle();
    for (const rung of ['closed', 'link', 'public'] as const) {
      await d.setRung(rung);
      const mine = await d.knock(d.ada);
      expect(mine.body.stranger, `clerk at ${rung}`).toBeUndefined();
      expect(mine.body.isFounder).toBe(true);
      expect(mine.body.text).toContain('apples');
      const door = await d.knock();
      expect(door.body.canRead).toBe(rung !== 'closed');
    }
  });
});

describe('🌍 the readers: which cookie is a seat, and which is the door', () => {
  it('lapsed reads the room, removed reads the door, an unfollowed invitation is no cookie at all', async () => {
    const b = await boot();
    const d = await found(b, { title: 'Night Watch Rota', chamber: 'closed',
      members: ['bo@example.org', 'cy@example.org'], lapseMs: 7 * DAY, keepRemovePen: true });

    // ---- the invitee who has not followed their link ---------------------
    // an invitation is not a membership (§9.6a), and no cookie is no seat
    await d.cmd(d.ada, 'invite', { email: 'dee@example.org' });
    const uninvited = await d.knock();
    expect(uninvited.body.stranger).toBe(true);
    expect(uninvited.body.canRead).toBe(false);
    assertRedacted(uninvited.raw, false);

    // ---- the member ------------------------------------------------------
    const bo = d.cookies['bo@example.org']!;
    expect((await d.knock(bo)).body.text).toContain('apples');

    // ---- the lapsed member ----------------------------------------------
    // §9.5a: a stall, not a departure. `seatAlive` asks only `!m.removed`,
    // so the member branch takes them and the rung is never consulted.
    await b.draft.tick(Date.now() + 8 * DAY);
    const rosterNow = await d.knock(d.ada);
    expect((rosterNow.body.view!.members as Array<{ email: string; lapsed: boolean }>)
      .find((m) => m.email === 'cy@example.org')!.lapsed).toBe(true);
    const lapsed = await d.knock(d.cookies['cy@example.org']!);
    expect(lapsed.body.stranger).toBeUndefined();
    expect(lapsed.body.text).toContain('apples');
    expect(lapsed.raw).toContain('@example.org'); // the full register, as a member's

    // ---- the removed member ---------------------------------------------
    // review #1, finding 1: a cookie is not a seat. Without `seatAlive` this
    // is ninety days of full member read under a constitution saying members
    // only — so the exile's own read is the door, at the closed rung.
    const cyId = (rosterNow.body.view!.members as Array<{ id: string; email: string }>)
      .find((m) => m.email === 'cy@example.org')!.id;
    await d.cmd(d.ada, 'remove', { member: cyId });
    const exiled = await d.knock(d.cookies['cy@example.org']!);
    expect(exiled.body.stranger).toBe(true);
    expect(exiled.body.canRead).toBe(false);
    expect(exiled.body.text).toBeNull();
    assertRedacted(exiled.raw, false);
    // …and a command from that cookie is 401, not a 403 that would confirm
    // the seat had ever existed
    expect((await post(b.base, `/api/d/${d.slug}/cmd`,
      { cmd: 'set-identity', args: { name: 'x' } }, d.cookies['cy@example.org']!)).status).toBe(401);
  });

  it('an applicant\'s text read follows 🌍, and their payload never names a member', async () => {
    const b = await boot();
    const d = await found(b, { title: 'Harvest Committee', chamber: 'closed',
      applications: true, members: ['bo@example.org'] });
    const open = await d.knock();
    expect(open.body.mayApply).toBe(true);
    expect(open.body.applyOpen).toBe(true);

    const started = await (await post(b.base, `/api/d/${d.slug}/apply`,
      { email: 'zoe@example.org' })).json() as { ok: boolean; devLink?: string };
    expect(started.ok).toBe(true);
    const zoe = cookieOf(await consume(started.devLink!));

    for (const rung of ['closed', 'link', 'public'] as const) {
      await d.setRung(rung);
      const k = await d.knock(zoe);
      // their own branch: their application, the document's face, and the
      // text only where 🌍 says so (review #1, finding 12; stage 3 defect 7)
      expect(k.body.applicant, `applicant at ${rung}`).not.toBeNull();
      expect(k.body.stranger).toBeUndefined();
      if (rung === 'closed') expect(k.body.text).toBeNull();
      else expect(k.body.text).toContain('apples');
      // never a member's address, never a member's name, at any rung —
      // an applicant is not in the room until the room says so
      expect(k.raw, `applicant at ${rung}`).not.toMatch(/bo@example\.org|ada@example\.org/);
      expect(k.raw, `applicant at ${rung}`).not.toMatch(/Bo Vane/);
      for (const [what, re] of NEVER.filter(([w]) => w !== 'an address' && w !== 'a member\'s wallet')) {
        expect(k.raw, `an applicant was served ${what} at ${rung}`).not.toMatch(re);
      }
    }
  });
});

describe('🌍 the third epoch: the close, and the document that never has one', () => {
  it('the record reaches a member and never the door, whatever the rung', async () => {
    const b = await boot();
    const ends = Date.now() + 3600_000;
    const d = await found(b, { title: 'Orchard Rules', chamber: 'public',
      members: ['bo@example.org'], endsAtMs: ends });
    await b.draft.tick(ends + 1_000);

    // a member: the record, with its signatures
    await post(b.base, `/api/d/${d.slug}/cmd`,
      { cmd: 'acknowledge-close', args: { comment: 'a good harvest' } }, d.cookies['bo@example.org']!);
    const mine = await d.knock(d.cookies['bo@example.org']!);
    expect(mine.body.record).not.toBeNull();
    expect(mine.raw).toContain('a good harvest');

    // the door, at the most open rung there is: the final text, and not one
    // word of who signed it — §9.3, *the record's distribution is the
    // convenor's*, read literally
    const door = await d.knock();
    expect(door.body.stranger).toBe(true);
    expect(door.body.canRead).toBe(true);
    expect(door.body.closed).toEqual({ at: ends });
    expect(door.body.text).toContain('apples');
    expect(door.raw).not.toContain('a good harvest');
    assertRedacted(door.raw, true);

    // …and the rung cannot move after the close, so `public` is what this
    // document says for ever: §4.6, nothing moves but the signing
    const refused = await d.send(d.ada, 'set-setting',
      { setting: 'chamber', value: { rung: 'closed' } });
    expect(refused.error).toContain('closed');
    expect((await d.knock()).body.canRead).toBe(true);
  });

  it('a perpetual document has no third epoch: the door\'s `closed` stays null', async () => {
    const b = await boot();
    const d = await found(b, { title: 'The Standing Orders', chamber: 'link', endsAtMs: null });
    expect((await d.knock()).body.closed).toBeNull();
    await b.draft.tick(Date.now() + 500 * DAY);
    const k = await d.knock();
    expect(k.body.closed).toBeNull();
    expect(k.body.canRead).toBe(true);
  });
});

describe('🌍 the routes that consult no rung at all', () => {
  it('the page, health and the address oracle answer the same at every rung', async () => {
    const b = await boot();
    const d = await found(b, { title: 'Orchard Rules', chamber: 'closed' });
    for (const rung of ['closed', 'link', 'public'] as const) {
      await d.setRung(rung);
      // the page itself is served to anybody with the address: it is the
      // door's own three columns, and it asks `/view` for what it may say
      const page = await fetch(`${b.base}/d/${d.slug}`);
      expect(page.status, `GET /d/:slug at ${rung}`).toBe(200);
      expect(await page.text()).not.toContain('apples');
      // the address oracle confirms the document exists — at every rung, and
      // no more than the door already does by answering 200 at all
      const oracle = await (await fetch(`${b.base}/api/slug/${d.slug}`)).json() as
        { available: boolean; legal: boolean };
      expect(oracle).toMatchObject({ available: false, legal: true });
    }
    expect((await fetch(`${b.base}/d/no-such-charter`)).status).toBe(404);
    expect((await fetch(`${b.base}/api/d/no-such-charter/view`)).status).toBe(404);
    const health = await (await fetch(`${b.base}/healthz`)).json() as Record<string, unknown>;
    expect(health.documents).toBe(1);
    expect(JSON.stringify(health)).not.toContain(d.slug); // counts, never a name
  });
});

/**
 * **The production posture** (PRODUCTION.md stage 3, defect 1). The three
 * `DEV:` routes are dropped from the built artifact bodily; this asserts
 * the *other* half of the guard — that they refuse at runtime as soon as a
 * Resend key is configured, which is what a staging box that was built
 * without the drop would be relying on. Reachable only here: every walk in
 * this project runs its server with a dev outbox, which is precisely the
 * configuration under which these routes are meant to answer.
 */
describe('🌍 nothing a stranger reaches leaks the stagehand', () => {
  it('the dev routes are 404 once a mailer is configured, and no other route serves seats', async () => {
    const b = await boot({ resendApiKey: 'not-a-real-key' });
    for (const [method, path] of [
      ['GET', '/api/dev/outbox'], ['GET', '/api/dev/ladder'],
      ['POST', '/api/dev/ladder'], ['POST', '/api/dev/seat'],
    ] as const) {
      const res = await fetch(b.base + path, method === 'GET' ? {}
        : { method, headers: { 'content-type': 'application/json' }, body: '{}' });
      expect(res.status, `${method} ${path}`).toBe(404);
    }
    // and with a dev outbox they answer, so the 404s above are the key's
    // doing and not a typo in the path
    const dev = await boot();
    expect((await fetch(dev.base + '/api/dev/outbox')).status).toBe(200);
    // `seats` is the ladder's word for its cast; no member or door payload
    // has ever carried it, and `NEVER` above says so on every knock
    const d = await found(dev, { title: 'Orchard Rules', chamber: 'public' });
    expect((await d.knock()).raw).not.toMatch(/"seats"/);
    expect((await d.knock(d.ada)).raw).not.toMatch(/"seats"/);
  });
});
