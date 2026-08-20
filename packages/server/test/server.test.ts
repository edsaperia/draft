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
import { asEngineDoc, resumeBridge } from '../src/engine-host.js';

const DESIGN_DIR = join(import.meta.dirname, '..', '..', '..', 'design');

interface Booted {
  base: string;
  draft: DraftServer;
  dataDir: string;
}

const booted: Booted[] = [];

async function boot(over: { trustProxy?: boolean; proxyHops?: number } = {}): Promise<Booted> {
  const dataDir = mkdtempSync(join(tmpdir(), 'draft-server-'));
  const cfg = {
    port: 0,
    dataDir,
    baseUrl: 'http://127.0.0.1',
    designDir: DESIGN_DIR,
    resendApiKey: null,
    mailFrom: 'test <t@example.org>',
    secret: 'test-secret',
    trustProxy: false,
    buildSha: null,
    // the test adopts twice inside one second; a room would be paced
    engineTuning: { cooldownMs: 0 },
    ...over,
  };
  const draft = await createDraftServer(cfg);
  await new Promise<void>((r) => draft.server.listen(0, '127.0.0.1', r));
  const port = (draft.server.address() as AddressInfo).port;
  cfg.baseUrl = `http://127.0.0.1:${port}`;
  const b = { base: cfg.baseUrl, draft, dataDir };
  booted.push(b);
  return b;
}

afterAll(async () => {
  for (const b of booted) {
    await new Promise((r) => b.draft.server.close(r));
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

const lastMailTo = (dataDir: string, to: string): { link?: string } => {
  const lines = readFileSync(join(dataDir, 'outbox.jsonl'), 'utf8')
    .split('\n').filter((l) => l.length > 0)
    .map((l) => JSON.parse(l) as { to: string; link?: string });
  const mine = lines.filter((m) => m.to === to);
  expect(mine.length).toBeGreaterThan(0);
  return mine[mine.length - 1]!;
};

describe('the whole road: create, invite, arrive, answer, constitute', () => {
  it('walks a three-member founding over HTTP and survives a restart', async () => {
    const { base, dataDir } = await boot();

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
      const mail = lastMailTo(dataDir, email);
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
        { headers: { cookie } })).json()) as {
        me: string; isFounder: boolean; constitutedAtT: number | null;
        view: { questions: Array<{ setting: string; answered: number }> };
      };
    expect((await viewOf(ada)).isFounder).toBe(true);
    expect((await viewOf(bo)).isFounder).toBe(false);

    // -- settle the constitution: reclaim+set the founder's, answer the rest
    await cmd(ada, 'set-setting',
      { setting: 'rate', value: { grant: 4, cap: 8, dripMinutes: 240 } });
    const values: Record<string, unknown> = {
      pace: { shape: 'fixed' },
      quorum: { form: 'share', n: 60 },
      authorship: { rung: 'sealed' },
      signing: { rung: 'each' },
      judgments: { rung: 'after' },
      applications: { holder: 'members', joinPolicy: 'apply' },
      machines: { enabled: false, budget: 0 },
      lapse: { afterMs: null },
    };
    for (const [setting, value] of Object.entries(values)) {
      await cmd(ada, 'reclaim', { setting });
      await cmd(ada, 'set-setting', { setting, value });
    }
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
      { headers: { cookie: cy } })).json() as {
        view: { questions: Array<{ setting: string; answeredCount: number;
          myAnswer: unknown }> };
      };
    const chamberQ = blind.view.questions.find((q) => q.setting === 'chamber')!;
    expect(chamberQ.answeredCount).toBe(2);
    expect(chamberQ.myAnswer).toBeNull();
    expect(JSON.stringify(blind.view)).not.toContain('"rung":"link"');
    await cmd(cy, 'answer', { setting: 'chamber', value: { rung: 'link' } });
    const after = await viewOf(ada);
    expect(after.constitutedAtT).not.toBeNull();

    // -- a motion over HTTP races in the engine (Q391) --------------------
    const motion = await cmd(bo, 'open-motion', {
      payload: { kind: 'set', setting: 'ending', value: { endsAtMs: ends + 3600_000 } },
      why: 'a little longer',
    }) as string;
    expect(typeof motion).toBe('string');

    // cy is served the race as a card: the standing value against bo's
    const cyView = await (await fetch(`${base}/api/d/${created.slug}/view`,
      { headers: { cookie: cy } })).json() as {
        wallet: number | null;
        raceCards: Array<{ kind: string;
          a: { id: string; setting?: { settingId: string; value: { endsAtMs: number } } };
          b: { id: string; setting?: { settingId: string; value: { endsAtMs: number } } };
        }>;
      };
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
    expect(lastMailTo(dataDir, 'dee@example.org').link).toContain('/auth/apply');
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
      { headers: { cookie: bo } })).json() as {
        view: { applicants: Array<{ email: string; name: string | null }> };
        raceCards: Array<{ a: { id: string; setting?: { settingId: string } };
          b: { id: string; setting?: { settingId: string } } }>;
      };
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
    expect(lastMailTo(dataDir, 'dee@example.org').link).toContain('/auth/login');
    expect(deeMember!.arrivedAtT).not.toBeNull();
    // a member's address gets the same 200 as anybody — the apply door
    // is not a membership oracle (review #1, finding 8) — and a login
    // mail goes out instead of a refusal
    const dupe = await post(base, `/api/d/${created.slug}/apply`,
      { email: 'bo@example.org' });
    expect(dupe.status).toBe(200);
    expect(((await dupe.json()) as { ok: boolean }).ok).toBe(true);
    expect(lastMailTo(dataDir, 'bo@example.org').link).toContain('/auth/login');

    // -- restart: both logs on disk replay to the same state --------------
    const reopened = new FilePersistence(dataDir);
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
      const mail = lastMailTo(dataDir, 'reader@example.org');
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

    const bare = await fetch(`${base}/api/d/${created.slug}/view`);
    expect(bare.status).toBe(401);
    const forged = await fetch(`${base}/api/d/${created.slug}/view`,
      { headers: { cookie: 'draft_session=ZG9j.Zm91bmRlcg.99999999999999.bad' } });
    expect(forged.status).toBe(401);
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
      lastMailTo(dataDir, 'leaver@example.org').link!));
    const before = await fetch(`${base}/api/d/${created.slug}/view`,
      { headers: { cookie: leaver } });
    expect(before.status).toBe(200);
    const gv = await (await fetch(`${base}/api/d/${created.slug}/view`,
      { headers: { cookie: g } })).json() as {
        view: { members: Array<{ id: string; email: string }> } };
    const leaverId = gv.view.members.find((m) => m.email === 'leaver@example.org')!.id;
    await post(base, `/api/d/${created.slug}/cmd`,
      { cmd: 'uninvite', args: { member: leaverId } }, g);
    const after = await fetch(`${base}/api/d/${created.slug}/view`,
      { headers: { cookie: leaver } });
    expect(after.status).toBe(401);
  });
});

describe('the surface is served', () => {
  it('serves setup.html at /d/:slug and the design assets', async () => {
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
    for (const path of ['/design/setup.notes.md', '/design/tools/session-probe.js',
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
