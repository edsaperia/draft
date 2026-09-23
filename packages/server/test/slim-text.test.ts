/**
 * **Version 0 means two different things, and a page that polled across the
 * cork kept the wrong one** (Q1477; the nh2026 convention, 2026-09-20).
 *
 * The slim view (the moon room, 2026-09-11) leaves the document's text out of
 * a poll's answer when the page says it already holds that version: `tv`
 * against `textVersion`. Before 🍾 there is no engine, so the view carries
 * `textVersion: 0` over the founder's unversioned text; after 🍾 it carries
 * `textVersion: 0` over the engine's document at version 0. The two are the
 * same number and are not the same text — 🍾 confirms whatever the column
 * holds (R-081), and the column draws no paragraph for a blank line, so the
 * text the engine opened on had two lines fewer than the one every page had
 * been reading all morning.
 *
 * Every page open across the cork therefore claimed `tv=0` for a text the
 * engine had never held, was answered without one, and completed the answer
 * from its own. The whole room then drew the document in a line space two
 * lines out of step with the engine's, and it stood until the first adoption
 * moved the version: at nh2026 that was an hour, in which five proposals from
 * two members went out aimed two lines below the wording they attested and
 * were refused by the host's own guard (R-136).
 *
 * The cure is at the wire: a part is only left out of an answer for a page
 * that has already been served it *under a version*, and a page's engine seq
 * says whether it ever has — 0 until there is an engine.
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { afterAll, describe, expect, it } from 'vitest';
import { FilePersistence } from '../src/persistence.js';
import { createDraftServer } from '../src/server.js';
import type { DraftServer } from '../src/server.js';

const booted: DraftServer[] = [];
afterAll(async () => { for (const d of booted) await d.close(); });

async function boot(): Promise<string> {
  const dataDir = mkdtempSync(join(tmpdir(), 'draft-slim-'));
  const cfg = {
    port: 0, dataDir, baseUrl: 'http://127.0.0.1',
    designDir: join(import.meta.dirname, '..', '..', '..', 'design'),
    resendApiKey: null, mailFrom: 'test <t@example.org>', mailOff: false,
    botKey: null, secret: 'test-secret', store: 'file' as const, databaseUrl: null,
    trustProxy: false, buildSha: null, notifyEmail: null,
  };
  const draft = await createDraftServer(cfg, new FilePersistence(dataDir));
  await new Promise<void>((r) => draft.server.listen(0, '127.0.0.1', r));
  // the mail's links are built from the config, which only knows its port now
  cfg.baseUrl = `http://127.0.0.1:${(draft.server.address() as AddressInfo).port}`;
  booted.push(draft);
  return cfg.baseUrl;
}

const post = (base: string, path: string, body: unknown, headers: Record<string, string> = {}) =>
  fetch(base + path, { method: 'POST',
    headers: { 'content-type': 'application/json', origin: base, ...headers },
    body: JSON.stringify(body) });

async function follow(base: string, link: string): Promise<string> {
  const u = new URL(link);
  await fetch(u.origin + u.pathname + u.search);
  const r = await fetch(u.origin + u.pathname, {
    method: 'POST', redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded', origin: u.origin },
    body: new URLSearchParams({ token: u.searchParams.get('token') ?? '' }).toString(),
  });
  expect(r.status).toBe(302);
  void base;
  return (r.headers.get('set-cookie') ?? '').split(';')[0]!;
}

type Answer = { seq: number; eseq: number; text?: string; textVersion?: number;
  recordsKey?: number; slim?: string[] };
const view = (base: string, slug: string, cookie: string, q = ''): Promise<Answer> =>
  fetch(`${base}/api/d/${slug}/view${q}`, { headers: { cookie } }).then((r) => r.json() as Promise<Answer>);

/** what the page asks with: the two seqs it holds, the text version and the
 *  records' key (`refresh()` in design/live.js) */
const since = (v: Answer): string =>
  `?since=${v.seq}.${v.eseq || 0}&tv=${v.textVersion ?? 0}&rk=${v.recordsKey ?? 0}`;

// the founder's column holds blank lines; the drawn column does not, so the
// text 🍾 confirms is the same words two lines shorter
const WITH_BLANKS = ['# Charter', '', 'One. The society meets on the first Tuesday.', '',
  'Two. The treasurer keeps the accounts.', 'Three. The secretary writes to absentees.'].join('\n');
const AS_DRAWN = WITH_BLANKS.split('\n').filter((l) => l.trim()).join('\n');

async function corked(): Promise<{ base: string; slug: string; cookie: string; before: Answer }> {
  const base = await boot();
  const created = await (await post(base, '/api/docs',
    { title: 'Cork', email: 'founder.cork@example.org', isMember: true }))
    .json() as { ok: boolean; slug: string; devLink: string };
  expect(created.ok).toBe(true);
  const { slug } = created;
  const cookie = await follow(base, created.devLink);
  const cmd = async (name: string, args: unknown): Promise<void> => {
    const r = await post(base, `/api/d/${slug}/cmd`, { cmd: name, args }, { cookie });
    expect(r.status, `${name}: ${await r.clone().text()}`).toBe(200);
  };
  await cmd('confirm-starting-text', { text: WITH_BLANKS });
  await cmd('set-convenor-membership', { isMember: true });
  const values: [string, unknown][] = [
    ['ending', { endsAtMs: Date.now() + 6 * 3_600_000 }], ['quorum', { form: 'count', n: 1 }],
    ['authorship', { rung: 'sealed' }], ['judgments', { rung: 'after' }], ['chamber', { rung: 'link' }],
    ['lapse', { afterMs: null }], ['applications', { apply: false }], ['pace', { shape: 'fixed' }],
    ['removal', { price: 'consent' }], ['admission', { price: 'assembly' }], ['bar', { pct: 50 }],
    ['machines', { enabled: false, budget: 0 }], ['rate', { grant: 4, cap: 8, dripMinutes: 240 }],
  ];
  for (const [setting, value] of values) {
    await post(base, `/api/d/${slug}/cmd`, { cmd: 'reclaim', args: { setting } }, { cookie });
    await cmd('set-setting', { setting, value });
  }
  // the page as it stands a moment before the cork: it holds the founder's
  // text, and the view it holds has no engine behind it
  const before = await view(base, slug, cookie);
  expect(before.eseq).toBe(0);
  expect(before.textVersion).toBe(0);
  expect(before.text).toBe(WITH_BLANKS);
  // 🍾, exactly as the press sends it (session-view.html): confirm whatever
  // the column holds, then begin
  await cmd('confirm-starting-text', { text: AS_DRAWN });
  await cmd('begin', { laidDown: [] });
  return { base, slug, cookie, before };
}

describe('a page that polled across 🍾 (Q1477)', () => {
  it('is served the text the engine opened on, not left to keep its own', async () => {
    const { base, slug, cookie, before } = await corked();
    const after = await view(base, slug, cookie, since(before));
    expect(after.eseq).toBeGreaterThan(0);
    expect(after.slim ?? []).not.toContain('text');
    expect(after.text).toBe(AS_DRAWN);
    // line 2 is the clause a draft on the third paragraph would name: the
    // page held *One…* there and the engine holds *Two…*, which is the
    // convention's own two-line step
    expect(String(before.text).split('\n')[2]).toBe('One. The society meets on the first Tuesday.');
    expect(String(after.text).split('\n')[2]).toBe('Two. The treasurer keeps the accounts.');
  });

  it('still leaves the text out once the page holds a versioned one', async () => {
    const { base, slug, cookie, before } = await corked();
    const first = await view(base, slug, cookie, since(before));
    expect(first.slim ?? []).not.toContain('text');
    // the page now holds the engine's own text at its own version, so the
    // next answer leaves it out again — a poll one beat behind the document,
    // which is what a busy room's every poll is
    const behind = { ...first, seq: first.seq - 1 };
    const second = await view(base, slug, cookie, since(behind));
    expect(second.slim ?? []).toContain('text');
    expect(second.text).toBeUndefined();
  });
});
