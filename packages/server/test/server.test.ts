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

const DESIGN_DIR = join(import.meta.dirname, '..', '..', '..', 'design');

interface Booted {
  base: string;
  draft: DraftServer;
  dataDir: string;
}

const booted: Booted[] = [];

async function boot(): Promise<Booted> {
  const dataDir = mkdtempSync(join(tmpdir(), 'draft-server-'));
  const cfg = {
    port: 0,
    dataDir,
    baseUrl: 'http://127.0.0.1',
    designDir: DESIGN_DIR,
    resendApiKey: null,
    mailFrom: 'test <t@example.org>',
    secret: 'test-secret',
  };
  const draft = createDraftServer(cfg);
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

    const saved = await fetch(created.devLink, { redirect: 'manual' });
    expect(saved.status).toBe(302);
    expect(saved.headers.get('location')).toBe(`/d/${created.slug}`);
    const ada = cookieOf(saved);

    // the same creation link a second time is dead (single use)
    expect((await fetch(created.devLink, { redirect: 'manual' })).status).toBe(400);

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
      const res = await fetch(mail.link!, { redirect: 'manual' });
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
      applications: { holder: 'members', joinPolicy: 'invite' },
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
      ['chamber', { rung: 'link' }],
    ] as const) {
      for (const cookie of [ada, bo, cy]) {
        await cmd(cookie, 'answer', { setting, value });
      }
    }
    const after = await viewOf(ada);
    expect(after.constitutedAtT).not.toBeNull();

    // -- blindness held on the wire: a running question served counts only
    // (the settled ones carry distributions; nothing ever carried names)
    const raw = JSON.stringify(after.view);
    expect(raw).not.toContain('bo@example.org'); // emails are identity, not display

    // -- a motion over HTTP ----------------------------------------------
    const motion = await cmd(bo, 'open-motion', {
      payload: { kind: 'set', setting: 'ending', value: { endsAtMs: ends + 3600_000 } },
      why: 'a little longer',
    }) as string;
    expect(typeof motion).toBe('string');

    // -- restart: the log on disk replays to the same document ------------
    const live = booted[booted.length - 1]!.draft.store.bySlug(created.slug)!;
    const reloaded = new DocStore(dataDir);
    reloaded.loadAll();
    const doc = reloaded.bySlug(created.slug);
    expect(doc).not.toBeNull();
    expect(doc!.cs.rollingHash()).toBe(live.cs.rollingHash());
    expect(doc!.cs.constitutedAtT).not.toBeNull();
  }, 30_000);
});

describe('auth discipline', () => {
  it('commands and views need a cookie; a foreign cookie does not carry', async () => {
    const { base } = await boot();
    const created = await (await post(base, '/api/docs', {
      title: 'One', email: 'one@example.org',
    })).json() as { devLink: string; slug: string };
    await fetch(created.devLink, { redirect: 'manual' });

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
    await fetch(created.devLink, { redirect: 'manual' });
    const res = await post(base, `/api/d/${created.slug}/login`,
      { email: 'stranger@example.org' });
    const body = await res.json() as Record<string, unknown>;
    expect(body).toEqual({ ok: true }); // no devLink, no hint
  });
});

describe('the surface is served', () => {
  it('serves setup.html at /d/:slug and the design assets', async () => {
    const { base } = await boot();
    const created = await (await post(base, '/api/docs', {
      title: 'Three', email: 'three@example.org',
    })).json() as { devLink: string; slug: string };
    await fetch(created.devLink, { redirect: 'manual' });
    const page = await fetch(`${base}/d/${created.slug}`);
    expect(page.status).toBe(200);
    expect(page.headers.get('content-type')).toContain('text/html');
    const js = await fetch(`${base}/design/constitution.js`);
    expect(js.status).toBe(200);
    const sneaky = await fetch(`${base}/design/..%2fSPEC.md`);
    expect(sneaky.status).toBe(404);
  });
});
