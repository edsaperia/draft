/**
 * **Visitors on the demo document** (design/DEMO.md Stage 3; Q1535): the
 * stranger's 👋 Try It and `POST /api/demo/join` — one tap, a made-up name,
 * a member with the grants already accepted; **one seat per device**; a seat
 * that **lapses 30 minutes after its last action**; nothing mailed, nothing
 * stored; Reset taking every visitor with the generation; and nothing of it
 * anywhere but the demo document.
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { afterAll, describe, expect, it } from 'vitest';
import { createDraftServer } from '../src/server.js';
import type { DraftServer, DraftServerOptions } from '../src/server.js';
import { StubDemoModel } from '../src/demo-model-stub.js';
import { DEMO_COOKIE, mintDemoCookie } from '../src/demo-access.js';
import { FilePersistence } from '../src/persistence.js';
import type { Persistence } from '../src/persistence.js';
import { asEngineDoc } from '../src/engine-host.js';
import { VISITOR_LAPSE_MS, VISITOR_PRE_ACKED } from '../src/demo.js';
import { ADJECTIVES, TOPPINGS, visitorName } from '../src/demo-names.js';

const DESIGN_DIR = join(import.meta.dirname, '..', '..', '..', 'design');
const WRITES = ['createDoc', 'appendDocLog', 'appendEngineLog', 'writeBridgeState',
  'writeProvisional', 'putTokens', 'putOutbox', 'putStash', 'saveToken', 'enqueue'];

function spied(inner: Persistence): { p: Persistence; calls: { name: string; id: string }[] } {
  const calls: { name: string; id: string }[] = [];
  const p = new Proxy(inner, {
    get(target, name, recv) {
      const v = Reflect.get(target, name, recv) as unknown;
      if (typeof v !== 'function') return v;
      return (...args: unknown[]) => {
        if (WRITES.includes(String(name))) calls.push({ name: String(name), id: JSON.stringify(args) });
        return (v as (...a: unknown[]) => unknown).apply(target, args);
      };
    },
  });
  return { p, calls };
}

interface Booted { base: string; draft: DraftServer; calls: { name: string; id: string }[] }
const booted: Booted[] = [];

async function boot(demo = true, options: DraftServerOptions = {}, demoKey: string | null = null): Promise<Booted> {
  const dataDir = mkdtempSync(join(tmpdir(), 'draft-demojoin-'));
  const cfg = {
    port: 0, dataDir, baseUrl: 'http://127.0.0.1', designDir: DESIGN_DIR,
    resendApiKey: null as string | null, mailFrom: 'test <t@example.org>', mailOff: false,
    secret: 'test-secret', store: 'file' as const, databaseUrl: null,
    trustProxy: true, buildSha: null, notifyEmail: null,
    engineTuning: { cooldownMs: 0 },
    demo, demoKey,
  };
  const { p, calls } = spied(new FilePersistence(dataDir));
  const draft = await createDraftServer(cfg, p, options);
  await new Promise<void>((r) => draft.server.listen(0, '127.0.0.1', r));
  cfg.baseUrl = `http://127.0.0.1:${(draft.server.address() as AddressInfo).port}`;
  const b = { base: cfg.baseUrl, draft, calls };
  booted.push(b);
  return b;
}
afterAll(async () => { for (const b of booted) await b.draft.close(); });

let n = 0;
const ipNext = (): string => `10.9.0.${++n}`;
/** The name=value pair a response set, for the next request's cookie header. */
const cookieOf = (res: Response): string | null => {
  const h = res.headers.get('set-cookie');
  return h === null ? null : h.split(';')[0]!;
};
const join_ = (b: Booted, cookie?: string, ip = ipNext()) => fetch(b.base + '/api/demo/join', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip, ...(cookie ? { cookie } : {}) },
  body: '{}' });
const view = async (b: Booted, cookie?: string) =>
  (await fetch(b.base + '/api/d/demo/view', { headers: cookie ? { cookie } : {} })).json() as Promise<
    Record<string, unknown> & { me?: string; stranger?: boolean; demoJoin?: boolean; preAcked?: string[];
      view?: { identity: { name: string | null } } }>;
const cmd = (b: Booted, cookie: string, c: string, args: Record<string, unknown>) =>
  fetch(b.base + '/api/d/demo/cmd', { method: 'POST',
    headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify({ cmd: c, args }) });
const demoWrites = (b: Booted) => b.calls.filter((c) => c.id.includes('d-demo-') || c.id.includes('demo.invalid'));

describe('visitors on the demo document (DEMO.md Stage 3)', () => {
  it('the door offers Try It on the demo alone; the join seats a named member with the grants accepted', async () => {
    const b = await boot();
    const door = await view(b);
    expect(door.stranger).toBe(true);
    expect(door.demoJoin).toBe(true);
    const res = await join_(b);
    expect(res.status).toBe(200);
    const out = await res.json() as { member: string; name: string; rejoined: boolean };
    expect(out.rejoined).toBe(false);
    const [adj, ...rest] = out.name.split(' ');
    expect(ADJECTIVES).toContain(adj);
    expect(TOPPINGS).toContain(rest.join(' '));
    const cookie = cookieOf(res)!;
    expect(cookie).toMatch(/^draft_session_/);
    const v = await view(b, cookie);
    expect(v.stranger).toBeUndefined();
    expect(v.me).toBe(out.member);
    expect(v.view!.identity.name).toBe(out.name);
    // D7: the three grants, for a visitor's seat
    expect(v.preAcked).toEqual([...VISITOR_PRE_ACKED]);
    // never the Founder
    const doc = b.draft.store.bySlug('demo')!;
    expect(out.member).not.toBe(doc.cs.convenorRecord().id);
    const rec = doc.cs.memberRecords().get(out.member)!;
    expect(rec.arrivedAtT).not.toBeNull();
    // a cast member's seat is no visitor: no preAcked on theirs
    const cast = [...doc.cs.memberRecords().values()].find((m) => m.id !== out.member && m.id !== doc.cs.convenorRecord().id)!;
    const castCookie = `${cookie.split('=')[0]}=${b.draft.auth.cookieFor(doc.id, cast.id, Date.now())}`;
    expect((await view(b, castCookie)).preAcked).toBeUndefined();
  });

  it('a visitor votes at once, and nothing of the join or the vote reaches the store or the outbox', async () => {
    const b = await boot();
    const res = await join_(b);
    const cookie = cookieOf(res)!;
    const doc = b.draft.store.bySlug('demo')!;
    const engine = asEngineDoc(doc).bridge!.engine;
    const race = engine.races().find((r) => r.members.length > 0)!;
    const r = await cmd(b, cookie, 'judge-race', { a: race.members[0], b: race.incumbentId, outcome: 'a' });
    expect(r.status).toBe(200);
    await b.draft.tick();
    expect(demoWrites(b)).toEqual([]);
  });

  it('one seat per device: a second tap returns the same seat; two devices get two seats and two names', async () => {
    const b = await boot();
    const doc = b.draft.store.bySlug('demo')!;
    const before = doc.cs.memberRecords().size;
    const a = await join_(b);
    const aCookie = cookieOf(a)!;
    const aOut = await a.json() as { member: string; name: string };
    const again = await join_(b, aCookie);
    const againOut = await again.json() as { member: string; rejoined: boolean };
    expect(againOut).toMatchObject({ member: aOut.member, rejoined: true });
    expect(cookieOf(again)).toBeNull();
    const c = await join_(b);
    const cOut = await c.json() as { member: string; name: string };
    expect(cOut.member).not.toBe(aOut.member);
    expect(cOut.name).not.toBe(aOut.name);
    expect(doc.cs.memberRecords().size).toBe(before + 2);
    expect(b.draft.demo.visitorCount()).toBe(2);
  });

  it('a seat lapses 30 minutes after its last action: it leaves, nobody is owed the news, a rescan joins anew', async () => {
    const b = await boot();
    const doc = b.draft.store.bySlug('demo')!;
    const t0 = Date.now();
    const a = await join_(b);
    const aCookie = cookieOf(a)!;
    const aOut = await a.json() as { member: string };
    const c = await join_(b);
    const cOut = await c.json() as { member: string };
    // the second visitor acted twenty minutes in, so their clock restarted
    b.draft.demo.touch(cOut.member, t0 + 20 * 60_000);
    await b.draft.tick(t0 + VISITOR_LAPSE_MS - 60_000);
    expect(doc.cs.memberRecords().get(aOut.member)!.removed).toBe(false);
    await b.draft.tick(t0 + VISITOR_LAPSE_MS + 60_000);
    expect(doc.cs.memberRecords().get(aOut.member)!.removed).toBe(true);
    expect(doc.cs.memberRecords().get(cOut.member)!.removed).toBe(false);
    // the ordinary road, its news acknowledged for the room (a stack of 🥾 otherwise)
    for (const m of doc.cs.memberRecords().values()) expect(m.departuresOwed.has(aOut.member)).toBe(false);
    // the old cookie reads the door, Try It on it
    const door = await view(b, aCookie);
    expect(door.stranger).toBe(true);
    expect(door.demoJoin).toBe(true);
    // and the same device joins anew, a new seat
    const again = await join_(b, aCookie);
    const againOut = await again.json() as { member: string; rejoined: boolean };
    expect(againOut.rejoined).toBe(false);
    expect(againOut.member).not.toBe(aOut.member);
    expect(demoWrites(b)).toEqual([]);
  });

  it('a visitor inviting an address mails nobody, and Log In on the demo mails nobody either', async () => {
    const b = await boot();
    const cookie = cookieOf(await join_(b))!;
    // whether 🪪 lets a member invite at will or asks a motion, nothing is sent
    const inv = await cmd(b, cookie, 'invite', { email: 'somebody@example.org' });
    // 🪪 on the demo: whatever it answers, the address is on no mail
    expect([200, 400]).toContain(inv.status);
    const login = await fetch(b.base + '/api/d/demo/login', { method: 'POST',
      headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'somebody@example.org' }) });
    expect(login.status).toBe(200);
    expect(await login.json()).toEqual({ ok: true });
    const apply = await fetch(b.base + '/api/d/demo/apply', { method: 'POST',
      headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'another@example.org' }) });
    expect(apply.status).toBe(400);
    await b.draft.tick();
    expect(b.calls.filter((c) => c.name === 'putTokens' || c.name === 'putOutbox' ||
      c.name === 'saveToken' || c.name === 'enqueue')).toEqual([]);
  });

  it('Reset takes every visitor with the generation', async () => {
    const b = await boot();
    const cookie = cookieOf(await join_(b))!;
    expect(b.draft.demo.visitorCount()).toBe(1);
    expect((await b.draft.demo.rebuild()).ok).toBe(true);
    expect(b.draft.demo.visitorCount()).toBe(0);
    const door = await view(b, cookie);
    expect(door.stranger).toBe(true);
  });

  it('the bots are the cast minus the Founder, never a visitor, and never keep a visitor’s seat alive', async () => {
    // the stub brain and a fast pace, so four bots act within the second
    const b = await boot(true, { demoModel: (info) => new StubDemoModel(info),
      demoBots: { paceMs: [20, 40], watchMs: 50 } });
    const idle = cookieOf(await join_(b))!;
    const busy = cookieOf(await join_(b))!;
    const joinedBy = Date.now();
    const [idleId, busyId] = [(await view(b, idle)).me!, (await view(b, busy)).me!];
    const doc = b.draft.demo.doc()!;
    const seats = b.draft.demo.botSeats();
    const cast = b.draft.demo.seats();
    expect(seats.map((x) => x.id)).toEqual(cast.filter((x) => !x.founder).map((x) => x.id));
    expect(seats.map((x) => x.id)).not.toContain(doc.cs.convenorRecord().id);
    expect(seats.map((x) => x.id)).not.toContain(idleId);
    expect(seats.every((x) => x.persona.length > 0)).toBe(true);
    expect(b.draft.demoBots.start({ count: 4, pace: 'frantic' })).toEqual({ ok: true });
    await new Promise((r) => setTimeout(r, 1_500));
    // a visitor's own command restarts their clock — even one the module refuses
    await cmd(b, busy, 'judge-race', { a: 'nothing', b: 'nothing', outcome: 'a' });
    const st = b.draft.demoBots.stats();
    b.draft.demoBots.stop('hand');
    expect(st.acts.judgments + st.acts.proposals + st.acts.passes + st.acts.stale).toBeGreaterThan(0);
    // thirty minutes after the joins: the idle phone lapses, since no bot act
    // touched it; the phone that acted since does not
    const gone = await b.draft.demo.lapseVisitors(joinedBy + VISITOR_LAPSE_MS);
    expect(gone).toContain(idleId);
    expect(gone).not.toContain(busyId);
  }, 30_000);

  it('a bot never acts in the seat Ed holds, and acts again once he switches away', async () => {
    const lines: string[] = [];
    const b = await boot(true, { demoModel: (info) => new StubDemoModel(info),
      demoBots: { paceMs: [20, 40], watchMs: 50, log: (l) => lines.push(l) } }, 'walk');
    const ed = `${DEMO_COOKIE}=${mintDemoCookie('walk', Date.now())}`;
    const sit = (member: string) => fetch(b.base + '/api/demo/seat', { method: 'POST',
      headers: { 'content-type': 'application/json', origin: b.base, cookie: ed }, body: JSON.stringify({ member }) });
    const x = b.draft.demo.botSeats()[0]!;
    const founder = b.draft.demo.doc()!.cs.convenorRecord().id;
    const fromX = () => lines.filter((l) => l.slice(9).startsWith(`${x.name}:`)).length;
    expect((await sit(x.id)).status).toBe(200);
    expect(b.draft.demo.heldSeat()).toBe(x.id);
    expect(b.draft.demoBots.start({ count: 4, pace: 'frantic' })).toEqual({ ok: true });
    await new Promise((r) => setTimeout(r, 1_500));
    const st = b.draft.demoBots.stats();
    expect(st.held).toBe(1);
    // the other three acted; the one in Ed's seat said and sent nothing
    expect(lines.filter((l) => !l.includes('▶️')).length).toBeGreaterThan(0);
    expect(fromX()).toBe(0);
    // Ed switches to the Founder: the bot takes its seat back
    expect((await sit(founder)).status).toBe(200);
    await new Promise((r) => setTimeout(r, 2_500));
    b.draft.demoBots.stop('hand');
    expect(b.draft.demoBots.stats().held).toBe(0);
    expect(fromX()).toBeGreaterThan(0);
  }, 30_000);

  it('nowhere but the demo: the join is an unknown path where there is no demo document', async () => {
    const b = await boot(false);
    const r = await join_(b);
    expect(r.status).toBe(404);
    expect(await r.json()).toEqual({ error: 'not found' });
  });

  it('the made-up names never repeat inside a generation', () => {
    const taken = new Set<string>();
    for (let i = 0; i < ADJECTIVES.length * TOPPINGS.length + 5; i++) taken.add(visitorName(taken));
    expect(taken.size).toBe(ADJECTIVES.length * TOPPINGS.length + 5);
  });
});
