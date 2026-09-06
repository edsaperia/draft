/**
 * A log written before v0.99 still replays (Q1196, 2026-09-06; R-088).
 *
 * §9.5 carried a sign-out (holding / abstaining) and a freeze until Ed
 * retired both — quorum is the adoption floor and only that — so a log
 * written before that day may hold `signed-out`, `frozen` and `thawed`
 * events. Each stays in the event union and replays as a **no-op**: the
 * member record has no field for a sign-out to set and the session no flag
 * for a freeze to raise, and a no-op leaves the hash chain exactly as it
 * was written.
 *
 * **Why this file and not `founding-v0.jsonl`.** Since Q767 `freeze.ts`
 * derives that fixture from *today's* walk, and today's walk signs nobody
 * out; a fixture proving a legacy event has to carry the event in bytes
 * that still chain. Built rather than committed, for `legacy-ids.test.ts`'s
 * reason: what is frozen here is the *claim* — old events in, a loaded
 * session out — not the bytes.
 */
import { describe, expect, it } from 'vitest';
import { chainHash } from '../src/hash.js';
import { ConstitutionSession } from '../src/session.js';
import type { ConstitutionEvent, LogEntry } from '../src/types.js';
import { view } from '../src/view.js';
import { goldenWalk } from './golden/walk.js';

/** Today's golden walk with the three retired events appended after the last entry, chained. */
function legacyLog(): { log: LogEntry[]; member: string } {
  const s = goldenWalk();
  const member = [...s.memberRecords().values()].find((m) => m.id !== 'ada' && m.arrivedAtT !== null)!.id;
  const log: LogEntry[] = s.logEntries().map((e) => ({ ...e }));
  let prev = log[log.length - 1]!.hash;
  const last = log[log.length - 1]!.event.t;
  const tail: ConstitutionEvent[] = [
    { type: 'signed-out', t: last + 1, member, mode: 'abstaining' },
    { type: 'frozen', t: last + 2 },
    { type: 'thawed', t: last + 3 },
  ];
  for (const event of tail) {
    const hash = chainHash(prev, event);
    log.push({ seq: log.length, hash, prevHash: prev, event });
    prev = hash;
  }
  return { log, member };
}

describe('a log carrying the retired presence events', () => {
  it('names all three — the fixture would prove nothing otherwise', () => {
    const types = legacyLog().log.map((e) => e.event.type);
    expect(types).toContain('signed-out');
    expect(types).toContain('frozen');
    expect(types).toContain('thawed');
  });

  it('replays into a loaded session with judging open and no freeze anywhere in the view', () => {
    const { log, member } = legacyLog();
    const s = ConstitutionSession.replay(log);
    expect(s.verifyChain()).toBe(true);
    expect(s.rollingHash()).toBe(log[log.length - 1]!.hash);
    expect(s.constitutedAtT).not.toBeNull();
    expect(s.canJudge()).toBe(true);
    // the sign-out set nothing: the member is in E like anybody arrived
    expect(s.motionElectorate()).toContain(member);
    expect(s.memberRecords().get(member)).not.toHaveProperty('signedOut');
    const v = view(s, member) as unknown as Record<string, unknown>;
    expect(v).not.toHaveProperty('frozen');
    expect(v).not.toHaveProperty('mustReturn');
  });

  it('replays to the same state as the walk without them', () => {
    const { log } = legacyLog();
    const withEvents = ConstitutionSession.replay(log);
    const without = goldenWalk();
    expect(withEvents.E()).toBe(without.E());
    expect(withEvents.motionElectorate()).toEqual(without.motionElectorate());
    expect(withEvents.canJudge()).toBe(without.canJudge());
  });
});
