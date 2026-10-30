import { existsSync, mkdirSync, mkdtempSync, rmdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { describe, expect, it } from 'vitest';
import { buildConstituted } from '../../constitution/test/helpers.js';
import { chainHash } from '../../constitution/src/hash.js';
import { ConstitutionSession } from '../../constitution/src/index.js';
import { FilePersistence } from '../src/persistence.js';
import { DocStore, uniqueSlug } from '../src/store.js';
import { createDraftServer } from '../src/server.js';
import { cookieName } from '../src/routes.js';
import { creationClaimContract } from './address-claim-contract.js';

async function room() {
  const p = new FilePersistence(mkdtempSync(join(tmpdir(), 'draft-address-')));
  const { s, bo, cy } = buildConstituted();
  await p.createDoc('a');
  await p.appendDocLog('a', s.logEntries());
  const store = new DocStore(p);
  await store.loadAll();
  return { p, store, doc: store.bySlug('hollow-oak')!, bo, cy };
}

describe('open proposals reserve their requested address (Q1604)', () => {
  it('ignores a journal interrupted before atomic publication', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'draft-journal-publish-'));
    const p = new FilePersistence(dir);
    const pending = { text: 'draft', slug: 'promised', expMs: Date.now() + 60_000 };
    await p.putStash('pending', pending);
    await p.createDoc('a');
    writeFileSync(join(dir, 'docs', 'a', 'creation-claim.json.next'), '{"key":');
    expect(await new FilePersistence(dir).getStash('pending')).toEqual(pending);
  });

  it('a failed pending-file replacement writes no genesis and leaves the reservation usable', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'draft-creation-fail-'));
    const p = new FilePersistence(dir);
    const pending = { text: 'draft', slug: 'promised', email: 'a@example.org', expMs: Date.now() + 60_000 };
    await p.putStash('pending', pending);
    mkdirSync(join(dir, 'pending.json.next'));
    const store = new DocStore(p);
    const input = { title: 'A', slug: 'promised', convenor: { id: 'f', email: pending.email, isMember: true } };
    await expect(store.create('a', input, Date.now(), 'pending')).rejects.toThrow();
    expect(await p.readDocLog('a')).toEqual([]);
    expect(await p.getStash('pending')).toEqual(pending);
    expect(store.servesSlug('promised')).toBeNull();
    rmdirSync(join(dir, 'pending.json.next'));
    await store.create('a', input, Date.now(), 'pending');
    expect(store.servesSlug('promised')).toEqual({ id: 'a' });
  });

  it.each([false, true])('recovers an interrupted file creation with durable genesis=%s', async (committed) => {
    const dir = mkdtempSync(join(tmpdir(), 'draft-creation-recover-'));
    const p = new FilePersistence(dir);
    const pending = { text: 'draft', slug: 'promised', email: 'a@example.org', expMs: Date.now() + 60_000 };
    await p.createDoc('a');
    const s = ConstitutionSession.open({ title: 'A', slug: 'promised',
      convenor: { id: 'f', email: pending.email, isMember: true } }, Date.now());
    const last = s.logEntries().at(-1)!;
    const journal = join(dir, 'docs', 'a', 'creation-claim.json');
    writeFileSync(journal, JSON.stringify({ key: 'pending', before: pending, seq: last.seq, hash: last.hash }));
    await p.putStash('pending', { ...pending, docId: 'a' });
    if (committed) await p.appendDocLog('a', s.logEntries());
    const recovered = new FilePersistence(dir);
    expect(await recovered.getStash('pending')).toEqual(committed ? { ...pending, docId: 'a' } : pending);
    expect(existsSync(journal)).toBe(false);
    const cold = new DocStore(recovered);
    await cold.loadAll();
    expect(cold.servesSlug('promised')).toEqual(committed ? { id: 'a' } : null);
  });

  it('shares namespace safety with pending creation, expiry and claim transfer', async () => {
    await creationClaimContract(new FilePersistence(mkdtempSync(join(tmpdir(), 'draft-claims-'))));
  });
  it('refuses competing HTTP changes and births, then adopts and keeps unrelated writes and ticks working', async () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'draft-address-http-'));
    const p = new FilePersistence(dataDir);
    let bo = '', cy = '';
    for (const id of ['first', 'second']) {
      const built = buildConstituted({ slug: id, endsAtMs: Date.now() + 86_400_000 });
      bo = built.bo; cy = built.cy;
      built.s.relinquish(3, 'link', 'assent');
      await p.createDoc(id);
      const people = [...built.s.memberRecords().values()].map((m) => ({ personId: m.person, ...built.s.people.get(m.person)! }));
      await p.appendDocLog(id, built.s.logEntries(), people);
    }
    const cfg = { port: 0, dataDir, baseUrl: 'http://127.0.0.1',
      designDir: join(import.meta.dirname, '..', '..', '..', 'design'),
      resendApiKey: null, mailFrom: 'test <t@example.org>', mailOff: false,
      secret: 'test-secret', store: 'file' as const, databaseUrl: null,
      trustProxy: false, buildSha: null, notifyEmail: null, engineTuning: { cooldownMs: 0 } };
    const host = await createDraftServer(cfg, p);
    await new Promise<void>((r) => host.server.listen(0, '127.0.0.1', r));
    cfg.baseUrl = `http://127.0.0.1:${(host.server.address() as AddressInfo).port}`;
    const cookie = (id: string, member: string) => `${cookieName(id)}=${host.auth.cookieFor(id, member, Date.now())}`;
    const post = (path: string, body: unknown, seat?: string) => fetch(cfg.baseUrl + path, {
      method: 'POST', headers: { 'content-type': 'application/json', ...(seat ? { cookie: seat } : {}) }, body: JSON.stringify(body) });
    const cmd = (id: string, member: string, name: string, args: unknown) => post(`/api/d/${id}/cmd`, { cmd: name, args }, cookie(id, member));
    try {
      // The imported fixture has only a constitution log. Its first commit
      // boots the engine, as the real Begin command does for a new room.
      for (const id of ['first', 'second']) expect((await cmd(id, 'ada', 'set-setting',
        { setting: 'title', value: { text: id } })).status).toBe(200);
      const proposal = { payload: { kind: 'set', setting: 'link', value: { slug: 'shared' } } };
      const results = await Promise.all(['first', 'second'].map((id) => cmd(id, bo, 'open-motion', proposal)));
      expect(results.map((r) => r.status).sort()).toEqual([200, 400]);
      const winner = results[0]!.status === 200 ? 'first' : 'second';
      const loser = winner === 'first' ? 'second' : 'first';
      expect((await cmd(loser, 'ada', 'set-setting', { setting: 'link', value: { slug: 'shared' } })).status).toBe(400);
      expect((await post('/api/docs', { title: 'Third', slug: 'shared', email: 'third@example.org', isMember: true })).status).toBe(409);
      const automatic = await post('/api/docs', { title: 'Shared', email: 'auto@example.org', isMember: true });
      expect((await automatic.json() as { slug: string }).slug).toBe('shared-2');
      expect(host.store.servesSlug('shared')).toBeNull();
      type Side = { id: string; setting?: { settingId: string; value: { slug?: string } } };
      const view = await (await fetch(`${cfg.baseUrl}/api/d/${winner}/view`, { headers: { cookie: cookie(winner, cy) } })).json() as {
        raceCards: Array<{ a: Side; b: Side }> };
      const card = view.raceCards.find((c) => c.a.setting?.settingId === 'link' || c.b.setting?.settingId === 'link')!;
      expect(card, JSON.stringify(view.raceCards)).toBeTruthy();
      const vote = await cmd(winner, cy, 'judge-race', { a: card.a.id, b: card.b.id,
        outcome: card.a.setting?.value.slug === 'shared' ? 'a' : 'b' });
      expect(vote.status, await vote.text()).toBe(200);
      expect(host.store.servesSlug('shared')).toEqual({ id: winner });
      for (const id of ['first', 'second']) {
        const changed = await cmd(id, 'ada', 'set-setting', { setting: 'title', value: { text: 'Still working' } });
        expect(changed.status, await changed.text()).toBe(200);
      }
      await host.tick(Date.now() + 60_000);
      expect(host.store.byId(winner)!.stalled).not.toBe(true);
      expect(host.store.byId(loser)!.stalled).not.toBe(true);
    } finally { await host.close(); }
  });

  it.each(['held', 'withdrawn', 'adopted', 'crown-refused', 'closed'] as const)('handles the %s lifecycle without releasing history', async (outcome) => {
    const { store, doc, bo } = await room();
    const motion = doc.cs.openMotion(3, bo, { kind: 'set', setting: 'link', value: { slug: 'reserved' } });
    await store.persist(doc);
    if (outcome === 'withdrawn') doc.cs.withdrawMotion(4, bo, motion);
    else if (outcome === 'held') doc.cs.adjudicateOrdinaryMotion(4, motion, 'held');
    else if (outcome === 'closed') {
      // The bridge reports the ordinary race's held outcome at the close.
      doc.cs.adjudicateOrdinaryMotion(1_000_000, motion, 'held');
      doc.cs.tick(1_000_000);
    } else {
      doc.cs.adjudicateOrdinaryMotion(4, motion, 'carried');
      await store.persist(doc);
      expect(doc.cs.motionRecords().get(motion)!.status).toBe('awaiting-crown');
      expect(store.slugTaken('reserved')).toBe(true);
      const question = [...doc.cs.crownQuestionRecords().values()].find((q) => q.motion === motion)!;
      doc.cs.answerCrownQuestion(5, question.id, outcome === 'adopted' ? 'accept' : 'reject');
    }
    await store.persist(doc);
    expect(store.slugTaken('reserved')).toBe(outcome === 'adopted');
    expect(store.servesSlug('reserved')).toEqual(outcome === 'adopted' ? { id: 'a' } : null);
    expect(store.servesSlug('hollow-oak')).toEqual({ id: 'a' });
  });

  it('does not strand a reservation when its proposal fails to save', async () => {
    const { p, store, doc, bo } = await room();
    const append = p.appendDocLog.bind(p);
    p.appendDocLog = async () => { throw new Error('store unavailable'); };
    doc.cs.openMotion(3, bo, { kind: 'set', setting: 'link', value: { slug: 'reserved' } });
    await expect(store.persist(doc)).rejects.toThrow('store unavailable');
    store.rewind(doc);
    expect(store.slugTaken('reserved')).toBe(false);
    p.appendDocLog = append;
    doc.cs.setSetting(4, 'title', { text: 'Still editable' });
    await store.persist(doc);
    expect(doc.cs.settingState('title').value).toEqual({ text: 'Still editable' });
  });

  it('does not release a live claim when another proposal ends', async () => {
    const { store, doc, bo, cy } = await room();
    const first = doc.cs.openMotion(3, bo, { kind: 'set', setting: 'link', value: { slug: 'first' } });
    const second = doc.cs.openMotion(3, cy, { kind: 'set', setting: 'link', value: { slug: 'second' } });
    await store.persist(doc);
    // Identical open proposals are already refused by §9.6 (R-103).
    expect(() => doc.cs.openMotion(4, cy, { kind: 'set', setting: 'link', value: { slug: 'first' } })).toThrow('already put');
    doc.cs.withdrawMotion(5, bo, first);
    await store.persist(doc);
    expect(store.slugTaken('first')).toBe(false);
    expect(store.slugTaken('second')).toBe(true);
    doc.cs.adjudicateOrdinaryMotion(6, second, 'held');
    await store.persist(doc);
    expect(store.slugTaken('second')).toBe(false);
  });

  it('retains a shared reservation until the last open proposal ends, even in an old duplicate log', async () => {
    const { p, store, doc, bo, cy } = await room();
    const first = doc.cs.openMotion(3, bo, { kind: 'set', setting: 'link', value: { slug: 'shared' } });
    await store.persist(doc);
    // Modern commands refuse identical proposals. Replay may still contain
    // older duplicates: claim reconciliation must count every live motion.
    const log = doc.cs.logEntries();
    const opened = log.find((e) => e.event.type === 'motion-opened' && e.event.motion === first)!;
    expect(opened.event.type).toBe('motion-opened');
    if (opened.event.type !== 'motion-opened') throw new Error('missing motion');
    const event = { ...opened.event, motion: 'mo-legacy', by: cy };
    const prevHash = log[log.length - 1]!.hash;
    await p.appendDocLog('a', [{ ...opened, seq: log.length, event, prevHash, hash: chainHash(prevHash, event) }]);
    const cold = new DocStore(p);
    await cold.loadAll();
    const restored = cold.byId('a')!;
    restored.cs.withdrawMotion(4, bo, first);
    await cold.persist(restored);
    expect(cold.slugTaken('shared')).toBe(true);
    restored.cs.withdrawMotion(5, cy, 'mo-legacy');
    await cold.persist(restored);
    expect(cold.slugTaken('shared')).toBe(false);
  });

  it('reserves without routing, survives restart, and releases on withdrawal', async () => {
    const { p, store, doc, bo } = await room();
    const motion = doc.cs.openMotion(3, bo, { kind: 'set', setting: 'link', value: { slug: 'reserved' } });
    await store.persist(doc);
    expect(store.slugTaken('reserved')).toBe(true);
    expect(store.servesSlug('reserved')).toBeNull();
    expect(uniqueSlug('Reserved', (slug) => store.slugTaken(slug))).toBe('reserved-2');
    expect(() => store.assertSlugsAvailable('other', ['reserved'])).toThrow('that address is taken');
    const cold = new DocStore(p);
    await cold.loadRegistry();
    expect(cold.slugTaken('reserved')).toBe(true);
    const restored = (await cold.open('a'))!;
    restored.cs.withdrawMotion(4, bo, motion);
    await cold.persist(restored);
    expect(cold.slugTaken('reserved')).toBe(false);
    expect(cold.slugTaken('hollow-oak')).toBe(true);
  });
});
