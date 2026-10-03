import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { Session, makeConstitution } from '../src/session.js';
import { decodeState, encodeState, SnapshotShapeError } from '../src/snapshot.js';
import { makeRng, type Rng } from '../src/rng.js';
import type { LogEntry, Participant } from '../src/types.js';
import { differential, stored } from './snapshot-differential.js';

// synchronous and long, like memo-differential: let vitest's heartbeat through
afterEach(() => new Promise<void>((done) => { setTimeout(done, 0); }));

/**
 * **Snapshot + tail equals full replay, byte for byte, at every K**
 * (plan-scaling.md Stage 3, its acceptance; the plan's invariant 4).
 *
 * For each log: one full replay, reading its own state at every entry
 * (`replay`'s `after`); then, at every K-th entry, the snapshot taken there is
 * put through the store's encoding (JSON) and restored over the log up to the
 * next K-th entry and up to the end. Each restore must hold exactly what the
 * full replay holds at the same entry: the whole fold (`snapshot()`, every
 * field) and everything the engine publishes (`picture`), the latter read
 * cold, since a restored session starts with an empty memo and fit cache.
 */

const HOUR = 3600_000;
const SEATS = 5;
const LINES = 12;
const people: Participant[] = Array.from({ length: SEATS }, (_, i) => ({ id: `p${i + 1}`, handle: `P${i + 1}` }));
const TEXT = Array.from({ length: LINES }, (_, i) => `Clause ${i + 1}: the club does a thing.`).join('\n') + '\n';

function open(seed: string, overrides: Record<string, unknown> = {}): Session {
  return Session.open({
    text: TEXT, roster: people,
    constitution: makeConstitution({
      windowStartMs: 0, windowEndMs: 30 * HOUR, rngSeed: seed,
      adoptionThresholdStart: 0.6, adoptionThresholdEnd: 0.9,
      tokenGrant: 6, tokenCap: 10, tokenDripMinutes: 20, cooldownMs: 20 * 60_000,
      quorum: { form: 'count', n: 2 }, ...overrides,
    }),
    settings: { s1: { n: 1 }, s2: { n: 2 } },
  }, 0);
}

/** One random act on the room: judge, propose, withdraw, co-sign, move a
 *  standing, lapse or revive, amend, tick — memo-differential's mix. */
function act(s: Session, n: number, t: number, rng: Rng): void {
  const who = people[rng.int(SEATS)]!.id;
  const roll = rng.int(100);
  const races = s.races();
  if (roll < 46 && races.length > 0) {
    const race = races[rng.int(races.length)]!;
    let card = null;
    try { card = s.askOn(who, race.id); } catch { card = null; }
    if (card !== null) { s.judge(t, who, card.aId, card.bId, (['a', 'b', 'tie'] as const)[rng.int(3)]!); return; }
  }
  if (roll < 70) {
    const line = rng.int(LINES);
    s.submitCandidate(t, { author: who, rationale: `r${n}`, patch: { baseVersion: s.currentVersion(),
      hunks: [{ start: line, end: line + 1, lines: [`Clause ${line + 1}: revision ${n} by ${who}.`] }] } });
    return;
  }
  if (roll < 78) {
    s.submitCandidate(t, { author: who, rationale: `m${n}`,
      setting: { settingId: rng.int(2) === 0 ? 's1' : 's2', value: { n: 100 + n } } });
    return;
  }
  if (roll < 84) {
    const mine = s.allCandidates().filter((c) => c.author === who && c.state === 'live');
    if (mine.length > 0) { s.withdraw(t, mine[rng.int(mine.length)]!.id); return; }
  }
  if (roll < 88) {
    const others = s.allCandidates().filter((c) => c.state === 'live' && c.author !== who);
    if (others.length > 0) { s.coSign(t, who, others[rng.int(others.length)]!.id); return; }
  }
  if (roll < 91) { s.setStanding(t, rng.int(2) === 0 ? 's1' : 's2', { n: 500 + n }); return; }
  if (roll < 94) {
    const entry = people[rng.int(SEATS)]!.id;
    if (s.allCandidates().length % 2 === 0) s.suspendParticipant(t, entry); else s.resumeParticipant(t, entry);
    return;
  }
  if (roll < 96) {
    s.amend(t, rng.int(2) === 0 ? { adoptionThresholdEnd: 0.8 + rng.int(15) / 100 }
      : { tokenDripMinutes: 10 + rng.int(30) });
    return;
  }
  s.tick(t);
}

/** A seeded room's log: `steps` acts, then the clock run past the close. */
function roomLog(seed: string, steps: number, overrides: Record<string, unknown> = {}): LogEntry[] {
  const s = open(seed, overrides);
  const rng = makeRng(`snapshot/${seed}`);
  let t = 1000;
  for (let n = 0; n < steps; n++) {
    t += 1 + rng.int(9 * 60_000);
    try { act(s, n, t, rng); } catch { /* a refusal writes nothing */ }
  }
  s.tick(31 * HOUR);
  return structuredClone(s.log);
}

const golden = (name: string): LogEntry[] => (JSON.parse(readFileSync(
  fileURLToPath(new URL(`./golden/${name}`, import.meta.url)), 'utf8')) as { log: LogEntry[] }).log;

describe('the fold as plain data (snapshot.ts)', () => {
  it('round-trips the shapes the fold holds, shared references and order included', () => {
    const shared = { n: 1, list: [1, 2] };
    const value = {
      a: shared, b: [shared, shared], m: new Map<unknown, unknown>([['z', shared], ['a', new Set([3, 1, 2])]]),
      odd: [-Infinity, Infinity, NaN, -0, undefined, null, 'x', true],
      keyed: { undefinedKept: undefined, z: 1, a: 2 },
    };
    const back = decodeState(JSON.parse(JSON.stringify(encodeState(value)))) as typeof value;
    expect(back).toEqual(value);
    expect(back.b[0]).toBe(back.a);
    expect((back.m.get('z'))).toBe(back.a);
    expect(Object.is(back.odd[3], -0)).toBe(true);
    expect('undefinedKept' in back.keyed).toBe(true);
    expect(Object.keys(back.keyed)).toEqual(['undefinedKept', 'z', 'a']);
    expect([...(back.m.get('a') as Set<number>)]).toEqual([3, 1, 2]);
    // a cycle, too
    const cyc: { self?: unknown } = {};
    cyc.self = cyc;
    const c = decodeState(encodeState(cyc)) as { self: unknown };
    expect(c.self).toBe(c);
  });

  it('refuses what it cannot carry, naming where', () => {
    class Thing { x = 1; }
    expect(() => encodeState({ a: new Thing() })).toThrow(SnapshotShapeError);
    expect(() => encodeState({ a: () => 1 })).toThrow(/\$\.a/);
    expect(() => encodeState({ a: Object.defineProperty({}, 'g', { get: () => 1, enumerable: true }) }))
      .toThrow(/accessor/);
    expect(() => encodeState({ a: Object.freeze({ k: 1 }) })).toThrow(/frozen/);
    expect(() => encodeState({ a: 1n })).toThrow(/bigint/);
  });

  it('a `__proto__` key stays a key', () => {
    const o = JSON.parse('{"__proto__": {"polluted": true}}') as Record<string, unknown>;
    const back = decodeState(encodeState(o)) as Record<string, unknown>;
    expect(Object.getPrototypeOf(back)).toBe(Object.prototype);
    expect(Object.keys(back)).toEqual(['__proto__']);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe('Session.restore refuses a snapshot that does not stand on the log', () => {
  const log = roomLog('refuse', 60);
  const snap = stored(Session.replay(structuredClone(log.slice(0, 30))).snapshot());

  it('a log shorter than the snapshot', () => {
    expect(() => Session.restore(snap, structuredClone(log.slice(0, 20)))).toThrow(/does not stand/);
  });
  it('a log whose entry at the snapshot differs', () => {
    const other = roomLog('other', 60);
    expect(() => Session.restore(snap, structuredClone(other))).toThrow(/does not stand/);
  });
  it('a broken chain in the prefix it does not fold', () => {
    const torn = structuredClone(log);
    (torn[5]!.event as { t: number }).t += 1;
    expect(() => Session.restore(snap, torn)).toThrow(/hash chain broken at seq 5/);
  });
  it('fields that are not this code\'s', () => {
    const fields = decodeState(snap.state) as Record<string, unknown>;
    delete fields.candidates;
    expect(() => Session.restore({ ...snap, state: encodeState(fields) }, structuredClone(log)))
      .toThrow(/not this code/);
  });
});

describe('snapshot + tail equals full replay, byte for byte, at every K (Stage 3)', () => {
  const KS = [1, 3, 10, 50, 100];

  it('the golden log pre-q1534', () => {
    expect(differential(golden('pre-q1534.json'), KS)).toBeGreaterThan(20);
  });
  it('the golden log pre-q1538', () => {
    expect(differential(golden('pre-q1538.json'), KS)).toBeGreaterThan(10);
  });
  for (const seed of ['moon', 'oak']) {
    it(`a long seeded room, closed: ${seed}`, () => {
      const log = roomLog(seed, 160);
      expect(log.length).toBeGreaterThan(150);
      expect(log.at(-1)!.event.type === 'closed' || log.some((e) => e.event.type === 'closed')).toBe(true);
      expect(differential(log, KS)).toBeGreaterThan(300);
    }, 180_000);
  }
  it('a room whose silences abstain as the clock moves', () => {
    const log = roomLog('abstain', 120, { abstainAfterMs: 40 * 60_000 });
    expect(differential(log, [1, 7, 50])).toBeGreaterThan(100);
  }, 180_000);
});
