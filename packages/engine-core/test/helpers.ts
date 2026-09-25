import type { Participant } from '../src/types.js';

export const TEXT = 'The club meets on Tuesdays.\n';

export function roster(n: number): Participant[] {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, handle: `P${i + 1}` }));
}

/**
 * **A leader waits until it is measured against its rivals** (Q1538 → why:
 * R-142). For tests whose subject is something else: each of `who`, in turn,
 * answers every pair the leader still waits on, for the leader, until it
 * leaves play or they run out. Returns the last timestamp used.
 */
export function measureAgainstRivals(
  s: {
    races(t?: number): Array<{ members: string[]; measureShort: string[] }>;
    getCandidate(id: string): { state: string };
    judge(t: number, participantId: string, aId: string, bId: string, outcome: 'a' | 'b' | 'tie'): unknown;
  },
  leader: string,
  who: readonly string[],
  t: number,
): number {
  for (const p of who) {
    if (s.getCandidate(leader).state !== 'live') break;
    const race = s.races(t).find((r) => r.members.includes(leader));
    if (race === undefined) break;
    for (const key of race.measureShort) {
      if (s.getCandidate(leader).state !== 'live') break;
      const [a, b] = key.split('|') as [string, string];
      if (a !== leader && b !== leader) continue;
      s.judge((t += 10), p, leader, a === leader ? b : a, 'a');
    }
  }
  return t;
}
