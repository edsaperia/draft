/**
 * The `People` split (PRODUCTION.md decision 436, landed under decision 1253
 * on 2026-09-08): identity lives in rows beside the log, never in it.
 *
 * Four claims, each its own group. **No event carries a person's fields** —
 * scanned over every event two whole walks emit, by the literal strings they
 * used. **Erasing a row breaks no hash** — the log replays to the same chain
 * and the person reads as erased. **Email is unique through the rows** — the
 * check that used to walk the roster's own fields now walks the rows, and a
 * removed member re-invited is the same person. **`identity-set` records the
 * act** — the flags Q645 needs, with the values on the row.
 */
import { describe, expect, it } from 'vitest';
import { EngineBridge } from '../src/engine-bridge.js';
import { stableStringify } from '../src/hash.js';
import { InMemoryPeople } from '../src/people.js';
import { ConstitutionSession } from '../src/session.js';
import { view } from '../src/view.js';
import { goldenWalk } from './golden/walk.js';
import { buildConstituted } from './helpers.js';

const open = (people?: InMemoryPeople) => ConstitutionSession.open({
  title: 'Hollow Oak Club Charter',
  slug: 'hollow-oak',
  convenor: { id: 'ada', email: 'Ada@example.org', isMember: true, name: 'Ada Lovelace' },
}, 0, people);

describe('no event carries a person’s fields', () => {
  // the strings the two walks give people: every address, every name, every
  // picture — if any of them is in any event, the split has a hole
  const PII = ['ada@example.org', 'bo@example.org', 'cy@example.org', 'dee@example.org',
    'eve@example.org', 'Ada', 'Bo', 'Cy', 'Eve', 'e🦊', 'e🦉', 'e🦡', 'dead@example.org',
    'Ash Bellamy', '@example.org', '@'];

  const scan = (s: ConstitutionSession): string[] => {
    const hits: string[] = [];
    for (const entry of s.logEntries()) {
      const bytes = stableStringify(entry.event);
      for (const p of PII) {
        // whole-token match for the short names, so 'Bo' does not trip on
        // 'Bob' in some setting id; the addresses and glyphs match anywhere
        const re = p.length <= 3 && !/[@🦊🦉🦡]/u.test(p)
          ? new RegExp(`"${p}"`) : new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'u');
        if (re.test(bytes)) hits.push(`seq ${entry.seq} (${entry.event.type}): ${p}`);
      }
    }
    return hits;
  };

  it('over the golden walk — invitations, identity, an application, a motion', () => {
    expect(scan(goldenWalk())).toEqual([]);
  });

  it('over a constituted room with an invite motion, a dead mail and a resend', () => {
    // the founder keeps ✉️'s pen so the direct invite lands after the start;
    // 🪪 at `proposal` keeps the invite *motion* a motion
    const { s, bo, cy } = buildConstituted({ admission: { price: 'proposal' },
      doors: { invite: { unilateral: true, assent: false } } });
    const dead = s.invite(3, 'dead@example.org');
    s.mailGaveUp(4, ['dead@example.org']);
    s.resendInvite(5, dead, 'ada');
    s.setIdentity(5, bo, { name: 'Ash Bellamy', picture: 'e🦊' });
    s.openMotion(6, cy, { kind: 'invite', email: 'eve@example.org' }, 'she keeps bees');
    expect(scan(s)).toEqual([]);
    // …and the motion's payload names the row, which holds the address
    const motion = [...s.motionRecords().values()].find((m) => m.payload.kind === 'invite')!;
    const person = (motion.payload as { person: string }).person;
    expect(s.people.get(person)).toEqual({ email: 'eve@example.org', name: null, picture: null });
    // the view resolves the address onto the wire, and serves null once the row is gone
    const wire = () => view(s, bo).motions.find((m) => m.id === motion.id)!.payload as
      { kind: string; person: string; email: string | null };
    expect(wire()).toEqual({ kind: 'invite', person, email: 'eve@example.org' });
    (s.people as InMemoryPeople).erase(person);
    expect(wire()).toEqual({ kind: 'invite', person, email: null });
  });

  it('nor does the engine’s own log: the bridge hands the engine ids as handles', () => {
    // the engine log is a hash chain too, and until 2026-09-08 the bridge
    // seeded each participant's `handle` with their name or address
    const { s, bo, cy } = buildConstituted({ admission: { price: 'proposal' },
      applications: { apply: true } });
    s.setIdentity(3, bo, { name: 'Ash Bellamy', picture: 'e🦊' });
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'people' });
    bridge.openSetMotion(4, cy, 'ending', { endsAtMs: 2_000_000 }, 'later is better');
    const eve = s.startApplication(5, 'eve@example.org');
    s.verifyApplication(5, eve);
    s.submitApplication(6, eve, { name: 'Eve', words: 'I keep bees.' });
    bridge.sync(6);
    const bytes = JSON.stringify(bridge.engine.log);
    expect(bytes).not.toContain('@example.org');
    expect(bytes).not.toContain('Ash Bellamy');
    // the quoted value, not the bare letters: `explorationEvery` is tuning
    expect(bytes).not.toMatch(/"Eve"/);
    expect(bytes).toContain('"handle":"' + bo + '"');
  });

  it('the `created` event names the founder’s row and carries the answered flags only', () => {
    const s = open();
    const created = s.logEntries()[0]!.event;
    expect(created).toEqual({ type: 'created', t: 0, title: 'Hollow Oak Club Charter',
      slug: 'hollow-oak', convenor: { id: 'ada', person: 'p-1', isMember: true, nameSet: true } });
    expect(s.people.get('p-1')).toEqual({ email: 'Ada@example.org', name: 'Ada Lovelace', picture: null });
    expect(s.convenorRecord()).toMatchObject({ person: 'p-1', email: 'Ada@example.org',
      name: 'Ada Lovelace', picture: null, nameSet: true, pictureSet: false, erased: false });
  });
});

describe('erasing a row breaks no hash', () => {
  it('replays to the identical chain, the person reading as erased throughout', () => {
    const s = goldenWalk();
    const bo = [...s.memberRecords().values()].find((m) => m.name === 'Bo')!;
    const people = s.people as InMemoryPeople;
    expect(people.erase(bo.person)).toBe(true);
    expect(people.erase(bo.person)).toBe(false);

    // the live session sees it on the very next read — no event, no re-fold
    expect(s.memberRecords().get(bo.id)).toMatchObject(
      { erased: true, email: null, name: null, picture: null, nameSet: true, pictureSet: true });
    const before = s.rollingHash();

    const again = ConstitutionSession.replay([...s.logEntries()], people);
    expect(again.verifyChain()).toBe(true);
    expect(again.rollingHash()).toBe(before);
    expect(again.logEntries()).toEqual(s.logEntries());
    expect(again.memberRecords().get(bo.id)).toMatchObject({ erased: true, email: null, name: null });
    // the room is unchanged in every respect but the name: E, the electorate,
    // the standing answers all count them still
    expect(again.E()).toBe(s.E());
    expect(again.motionElectorate()).toContain(bo.id);
    // and the register says so rather than showing a gap
    const row = view(again, 'ada').members.find((m) => m.id === bo.id)!;
    expect(row).toMatchObject({ erased: true, email: null, name: null, picture: null });
  });

  it('a session handed no rows at all reads everybody as erased and still chains', () => {
    const s = goldenWalk();
    const bare = ConstitutionSession.replay([...s.logEntries()]);
    expect(bare.rollingHash()).toBe(s.rollingHash());
    expect([...bare.memberRecords().values()].every((m) => m.erased)).toBe(true);
    expect(bare.convenorRecord().erased).toBe(true);
  });

  it('an erased applicant reads erased, words and status intact', () => {
    const s = goldenWalk();
    const eve = [...s.applicantRecords().values()][0]!;
    expect(eve).toMatchObject({ email: 'eve@example.org', name: 'Eve', words: 'I keep bees.' });
    (s.people as InMemoryPeople).erase(eve.person);
    expect(s.applicantRecords().get(eve.id)).toMatchObject(
      { erased: true, email: null, name: null, picture: null, words: 'I keep bees.', status: eve.status });
  });

  it('the dead-mail card drops an address whose row is gone', () => {
    const { s, bo } = buildConstituted({ admission: { price: 'pen' } });
    const dead = s.invite(3, 'dead@example.org');
    const alsoDead = s.invite(3, 'gone@example.org');
    s.mailGaveUp(4, ['dead@example.org', 'gone@example.org']);
    expect(view(s, bo).owedMailGiveUps[0]!.addresses).toEqual(['dead@example.org', 'gone@example.org']);
    (s.people as InMemoryPeople).erase(s.memberRecords().get(dead)!.person);
    expect(view(s, bo).owedMailGiveUps[0]!.addresses).toEqual(['gone@example.org']);
    expect(s.memberRecords().get(alsoDead)!.mailGaveUp).toBe(true);
  });
});

describe('email is unique through the rows (§9.7½)', () => {
  it('an address on the membership is refused, case-blind', () => {
    const s = open();
    s.invite(1, 'bo@example.org');
    expect(() => s.invite(2, 'bo@example.org')).toThrow(/already on the membership/);
    expect(() => s.invite(2, 'BO@example.org')).toThrow(/already on the membership/);
    expect(() => s.invite(2, 'ada@example.org')).toThrow(/already on the membership/);
  });

  it('a removed member re-invited is the same person: one row, the id reused', () => {
    const { s } = buildConstituted({ doors: { remove: { unilateral: true, assent: false },
      invite: { unilateral: true, assent: false } } });
    const dee = s.invite(3, 'dee@example.org');
    s.arrive(3, dee);
    const person = s.memberRecords().get(dee)!.person;
    s.setIdentity(4, dee, { name: 'Dee' });
    s.remove(5, dee);
    const again = s.invite(6, 'dee@example.org');
    expect(again).not.toBe(dee);
    expect(s.memberRecords().get(again)!.person).toBe(person);
    expect(s.memberRecords().get(again)!.name).toBe('Dee');
    expect((s.people as InMemoryPeople).entries().filter(([, r]) => r.email === 'dee@example.org'))
      .toHaveLength(1);
  });

  it('person ids are minted like member ids and rebuilt by replay', () => {
    const s = open();
    const bo = s.invite(1, 'bo@example.org');
    const cy = s.invite(1, 'cy@example.org');
    expect(s.memberRecords().get(bo)!.person).toBe('p-2');
    expect(s.memberRecords().get(cy)!.person).toBe('p-3');
    const again = ConstitutionSession.replay([...s.logEntries()], s.people);
    const dee = again.invite(2, 'dee@example.org');
    expect(again.memberRecords().get(dee)!.person).toBe('p-4');
  });

  it('an application from an address already applying is refused; a refused one may try again', () => {
    const { s } = buildConstituted({ applications: { apply: true }, admission: { price: 'proposal' } });
    const first = s.startApplication(3, 'eve@example.org');
    expect(() => s.startApplication(4, 'eve@example.org')).toThrow(/already underway/);
    expect(() => s.startApplication(4, 'bo@example.org')).toThrow(/already on the membership/);
    const person = s.applicantRecords().get(first)!.person;
    expect(s.people.get(person)).toEqual({ email: 'eve@example.org', name: null, picture: null });
  });
});

describe('identity-set records the act; the row holds the answer (Q645)', () => {
  it('a name and a picture are two flags, and null is a real answer', () => {
    const s = open();
    const bo = s.invite(1, 'bo@example.org');
    s.arrive(1, bo);
    s.setIdentity(2, bo, { name: 'Bo' });
    s.setIdentity(3, bo, { picture: null });
    const events = s.logEntries().filter((e) => e.event.type === 'identity-set').map((e) => e.event);
    expect(events).toEqual([
      { type: 'identity-set', t: 2, member: bo, nameSet: true },
      { type: 'identity-set', t: 3, member: bo, pictureSet: true },
    ]);
    expect(s.memberRecords().get(bo)).toMatchObject(
      { name: 'Bo', picture: null, nameSet: true, pictureSet: true });
    expect(view(s, bo).identity).toEqual({ name: 'Bo', picture: null, nameSet: true, pictureSet: true });
  });

  it('a clerk’s answers land on the founder’s row like anybody’s', () => {
    const s = ConstitutionSession.open({ title: 'T', slug: 't',
      convenor: { id: 'ada', email: 'ada@example.org', isMember: false } }, 0);
    s.setIdentity(1, 'ada', { name: 'Ada', picture: 'e🦉' });
    expect(s.convenorRecord()).toMatchObject({ name: 'Ada', picture: 'e🦉', nameSet: true, pictureSet: true });
    expect(s.people.get(s.convenorRecord().person)).toEqual({ email: 'ada@example.org', name: 'Ada', picture: 'e🦉' });
  });

  it('an application’s name and picture go to the row, the words to the log', () => {
    const s = goldenWalk();
    const submitted = s.logEntries().find((e) => e.event.type === 'application-submitted')!.event;
    expect(submitted).toEqual({ type: 'application-submitted', t: 15, applicant: 'ap-1', words: 'I keep bees.' });
    const eve = s.applicantRecords().get('ap-1')!;
    expect(eve).toMatchObject({ name: 'Eve', picture: 'e🦡', email: 'eve@example.org' });
  });
});

describe('InMemoryPeople', () => {
  it('creates on first set, merges after, finds by address case-blind, erases', () => {
    const p = new InMemoryPeople();
    expect(p.get('p-1')).toBeNull();
    p.set('p-1', { email: 'Ada@example.org' });
    expect(p.get('p-1')).toEqual({ email: 'Ada@example.org', name: null, picture: null });
    p.set('p-1', { name: 'Ada' });
    p.set('p-1', { picture: 'e🦉' });
    expect(p.get('p-1')).toEqual({ email: 'Ada@example.org', name: 'Ada', picture: 'e🦉' });
    expect(p.byEmail('ada@EXAMPLE.org')).toBe('p-1');
    expect(p.byEmail('bo@example.org')).toBeNull();
    // a copy, never the row itself
    const got = p.get('p-1')!;
    got.name = 'X';
    expect(p.get('p-1')!.name).toBe('Ada');
    expect(p.erase('p-1')).toBe(true);
    expect(p.get('p-1')).toBeNull();
    expect(p.byEmail('ada@example.org')).toBeNull();
  });

  it('round-trips through entries()', () => {
    const p = new InMemoryPeople();
    p.set('p-1', { email: 'a@x.org', name: 'A' });
    p.set('p-2', { email: 'b@x.org' });
    const q = new InMemoryPeople(p.entries());
    expect(q.entries()).toEqual(p.entries());
  });
});
