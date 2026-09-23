/**
 * **The give-up door** (SURFACE E34, Q947 (c), backlog 173): the outbox has
 * given up on a mail at its attempt cap since stage 6, and until now the fact
 * lived nowhere a member could read it. Two halves here — the door itself
 * (`OutboxDeps.gaveUp`, once per pass), and the whole road end to end: the
 * forced give-up, the module event, the view, and 📨's fresh invitation.
 */
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { afterAll, describe, expect, it } from 'vitest';
import { MailOutbox } from '../src/outbox.js';
import { FilePersistence, OUTBOX_MAX_ATTEMPTS } from '../src/persistence.js';
import type { OutboxRow } from '../src/persistence.js';
import { createDraftServer } from '../src/server.js';
import type { DraftServer } from '../src/server.js';

const tmp = () => mkdtempSync(join(tmpdir(), 'draft-mailgiveup-'));

const doomed = (id: string, documentId: string | null, to: string): OutboxRow => ({
  id, documentId, to, subject: 'You are invited', body: 'body',
  tokenHash: 'h-' + id,
  createdMs: 0, attempts: OUTBOX_MAX_ATTEMPTS - 1, lastAttemptMs: null,
  lastError: 'the last one', sentMs: null,
});

describe('the give-up door', () => {
  it('fires once per pass, with every row that pass gave up on', async () => {
    const p = new FilePersistence(tmp());
    await p.putOutbox([doomed('m1', 'd-1', 'a@example.org'),
      doomed('m2', 'd-1', 'b@example.org'),
      // the operator notification belongs to no document; it still reaches
      // the door, and the *server* is what drops it (`tellGaveUp`)
      doomed('m3', null, 'ops@example.org')]);
    const calls: OutboxRow[][] = [];
    const revoked: string[] = [];
    const ob = new MailOutbox({
      persistence: p,
      mailer: { dev: true, send: () => Promise.reject(new Error('provider is down')) },
      mailOff: () => false,
      revoke: async (h) => { revoked.push(h); },
      gaveUp: async (rows) => { calls.push([...rows]); },
      now: () => 1000,
    });
    const report = await ob.run(1000);
    expect(report.failed).toBe(3);
    // **one act, one batch**: three dead mails are one call, not three
    expect(calls).toHaveLength(1);
    expect(calls[0]!.map((r) => r.to).sort())
      .toEqual(['a@example.org', 'b@example.org', 'ops@example.org']);
    // the credential half is unchanged: a link nobody received is revoked
    expect(revoked.sort()).toEqual(['h-m1', 'h-m2', 'h-m3']);
  });

  it('does not fire when nothing gave up, and a failure in it cannot fail the pass', async () => {
    const p = new FilePersistence(tmp());
    let fired = 0;
    const ob = new MailOutbox({
      persistence: p,
      mailer: { dev: true, send: () => Promise.reject(new Error('provider is down')) },
      mailOff: () => false,
      revoke: async () => {},
      gaveUp: async () => { fired += 1; throw new Error('the document would not take it'); },
      now: () => 1000,
    });
    // a row well below the cap: retried, not given up on
    await p.putOutbox([{ ...doomed('m1', 'd-1', 'a@example.org'), attempts: 0 }]);
    expect((await ob.run(1000)).failed).toBe(0);
    expect(fired).toBe(0);

    await p.putOutbox([doomed('m2', 'd-1', 'b@example.org')]);
    const report = await ob.run(2000);
    expect(fired).toBe(1);
    expect(report.failed).toBe(1); // the mail is dead either way
  });
});

/* ---- the whole road, over a real socket ---------------------------------- */

const booted: DraftServer[] = [];
afterAll(async () => { for (const d of booted) await d.close(); });

async function boot(): Promise<{ base: string; dataDir: string }> {
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
  return { base: cfg.baseUrl, dataDir };
}

const post = (base: string, path: string, body: unknown, cookie?: string) =>
  fetch(base + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: base,
      ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });

/** The dev inbox, newest last. */
const inbox = (dataDir: string): Array<{ to: string; link?: string }> => {
  const p = join(dataDir, 'outbox.jsonl');
  return readFileSync(p, 'utf8').split('\n').filter(Boolean)
    .map((l) => JSON.parse(l) as { to: string; link?: string });
};

type Row = { id: string; email: string; mailGaveUp: boolean; arrived: boolean };
type Payload = { me: string; view: { members: Row[];
  owedMailGiveUps: Array<{ id: string; at: number; addresses: string[] }> } };

describe('a mail that gave up, end to end', () => {
  it('tells the document, marks the row, and 📨 sends a fresh invitation', async () => {
    const { base, dataDir } = await boot();
    const made = await post(base, '/api/docs',
      { title: 'Hollow Oak Club Charter', email: 'ada@example.org' });
    expect(made.status).toBe(200);
    const { slug } = await made.json() as { slug: string };
    // the creation mail lands the founder in their own document
    const link = inbox(dataDir).at(-1)!.link!;
    const landed = await fetch(new URL(link).origin + new URL(link).pathname, {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded',
        origin: base },
      body: new URLSearchParams({ token: new URL(link).searchParams.get('token')! }).toString(),
      redirect: 'manual',
    });
    const cookie = landed.headers.get('set-cookie')!.split(';')[0]!;

    expect((await post(base, `/api/d/${slug}/cmd`,
      { cmd: 'invite', args: { email: 'dead@example.org' } }, cookie)).status).toBe(200);
    // the invitation is out and delivered, which is the dev mailer's ordinary
    // case — a real give-up is six attempts over ~3 hours, and this is why
    // the forced one exists at all
    await new Promise((r) => setTimeout(r, 150));
    expect(inbox(dataDir).some((m) => m.to === 'dead@example.org')).toBe(true);

    const forced = await post(base, '/api/dev/outbox/give-up',
      { slug, to: 'dead@example.org' }, cookie);
    expect(forced.status).toBe(200);
    expect(await forced.json()).toMatchObject({ gaveUp: 1 });

    const read = async (): Promise<Payload> => {
      const r = await fetch(`${base}/api/d/${slug}/view`, { headers: { cookie } });
      return await r.json() as Payload;
    };
    let v = await read();
    const dead = v.view.members.find((m) => m.email === 'dead@example.org')!;
    expect(dead.mailGaveUp).toBe(true);
    expect(dead.arrived).toBe(false);
    // the founder is a member here, so they are owed the news as well as the
    // row — the convenor is not skipped (E34: *the founder; every member*)
    expect(v.view.owedMailGiveUps).toHaveLength(1);
    expect(v.view.owedMailGiveUps[0]!.addresses).toEqual(['dead@example.org']);
    const batch = v.view.owedMailGiveUps[0]!.id;

    expect((await post(base, `/api/d/${slug}/cmd`,
      { cmd: 'ack-mail-gave-up', args: { batch } }, cookie)).status).toBe(200);
    v = await read();
    expect(v.view.owedMailGiveUps).toEqual([]);
    // the OK closes the card; the row's line is live state and stands
    expect(v.view.members.find((m) => m.id === dead.id)!.mailGaveUp).toBe(true);

    const before = inbox(dataDir).filter((m) => m.to === 'dead@example.org');
    expect((await post(base, `/api/d/${slug}/cmd`,
      { cmd: 'resend-invite', args: { member: dead.id } }, cookie)).status).toBe(200);
    await new Promise((r) => setTimeout(r, 150));
    v = await read();
    expect(v.view.members.find((m) => m.id === dead.id)!.mailGaveUp).toBe(false);
    const after = inbox(dataDir).filter((m) => m.to === 'dead@example.org');
    expect(after.length).toBe(before.length + 1);
    // a **fresh** token: the one the dead mail carried was revoked with it
    expect(after.at(-1)!.link).not.toBe(before.at(-1)!.link);
  });

  it('refuses a give-up for an address this document never wrote to', async () => {
    const { base, dataDir } = await boot();
    const made = await post(base, '/api/docs',
      { title: 'Second Charter', email: 'bo@example.org' });
    const { slug } = await made.json() as { slug: string };
    const link = inbox(dataDir).at(-1)!.link!;
    await fetch(new URL(link).origin + new URL(link).pathname, {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded',
        origin: base },
      body: new URLSearchParams({ token: new URL(link).searchParams.get('token')! }).toString(),
      redirect: 'manual',
    });
    const r = await post(base, '/api/dev/outbox/give-up',
      { slug, to: 'nobody@example.org' }, undefined);
    expect(r.status).toBe(404);
  });
});

/**
 * **A withdrawn invitation is told to the person it was sent to** (Q1493,
 * Ed 2026-09-21: *An email when withdrawn*). Until now the withdrawal was
 * silent, and the only thing that ever said it had happened was the old
 * link — which answered *unknown member 'm-7'* at 12:43 on the day of the
 * convention, the machine's own vocabulary to a stranger following the one
 * address they had been given. Both halves here: the mail, and the link.
 */
describe('a withdrawn invitation (Q1493)', () => {
  it('mails the invitee with the document’s address and no login link, and the old link lands on the ordinary door', async () => {
    const { base, dataDir } = await boot();
    const made = await post(base, '/api/docs',
      { title: 'Withdrawn Charter', email: 'ada.wd@example.org' });
    const { slug } = await made.json() as { slug: string };
    const seat = async (link: string): Promise<string> => {
      const u = new URL(link);
      const r = await fetch(u.origin + u.pathname, {
        method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', origin: base },
        body: new URLSearchParams({ token: u.searchParams.get('token')! }).toString(),
        redirect: 'manual',
      });
      return r.headers.get('set-cookie')!.split(';')[0]!;
    };
    const cookie = await seat(inbox(dataDir).at(-1)!.link!);
    expect((await post(base, `/api/d/${slug}/cmd`,
      { cmd: 'invite', args: { email: 'bo.wd@example.org' } }, cookie)).status).toBe(200);
    await new Promise((r) => setTimeout(r, 150));
    const invite = inbox(dataDir).filter((m) => m.to === 'bo.wd@example.org').at(-1)!;
    expect(invite.link).toBeTruthy();

    const v = await (await fetch(`${base}/api/d/${slug}/view`, { headers: { cookie } }))
      .json() as { view: { members: Array<{ id: string; email: string }> } };
    const bo = v.view.members.find((m) => m.email === 'bo.wd@example.org')!;
    expect((await post(base, `/api/d/${slug}/cmd`,
      { cmd: 'uninvite', args: { member: bo.id } }, cookie)).status).toBe(200);
    await new Promise((r) => setTimeout(r, 200));

    // one mail, naming the document and carrying its address — **no token**,
    // because the seat it would be minted for no longer exists
    const mails = inbox(dataDir).filter((m) => m.to === 'bo.wd@example.org') as
      Array<{ to: string; subject?: string; text?: string; link?: string }>;
    expect(mails).toHaveLength(2);
    const told = mails.at(-1)!;
    expect(told.subject).toBe('Your invitation to “Withdrawn Charter” has been withdrawn');
    expect(told.link).toBe(`${base}/d/${slug}`);
    expect(told.text ?? '').toContain('no longer open');
    expect(told.text ?? '').not.toContain('token=');
    // the office, never a name (SURFACE C10)
    expect(told.text ?? '').not.toContain('ada.wd@example.org');

    // and the link they were sent opens the document as a stranger would
    // see it: a redirect, no cookie, and no sentence about the withdrawal
    const u = new URL(invite.link!);
    const dead = await fetch(u.origin + u.pathname, {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', origin: base },
      body: new URLSearchParams({ token: u.searchParams.get('token')! }).toString(),
      redirect: 'manual',
    });
    expect(dead.status).toBe(302);
    expect(dead.headers.get('location')).toBe(`/d/${slug}`);
    expect(dead.headers.get('set-cookie')).toBeNull();
    const door = await (await fetch(`${base}/api/d/${slug}/view`)).json() as { stranger?: boolean };
    expect(door.stranger).toBe(true);
  });
});
