/**
 * **The snapshot differential** (plan-scaling.md Stage 3, invariant 4), shared
 * by the engine's own test and the server's over boot-guard's fixed set.
 *
 * For one log: one full replay, reading its own state at every point it will
 * be compared at (`replay`'s `after`); then at every K-th entry the snapshot
 * taken there, put through the store's encoding (JSON), is restored over the
 * log up to the next K-th entry and up to the end. Each restore must hold
 * exactly what the full replay holds at that entry: the whole fold
 * (`snapshot()`, every field, byte for byte) and everything the engine
 * publishes (`picture`), read cold, since a restored session starts with an
 * empty memo and fit cache.
 */
import { expect } from 'vitest';
import { Session } from '../src/session.js';
import type { EngineSnapshot } from '../src/session.js';
import type { LogEntry } from '../src/types.js';

export const stored = (snap: EngineSnapshot): EngineSnapshot =>
  JSON.parse(JSON.stringify(snap)) as EngineSnapshot;

/** Every seat the log names. */
function seatsOf(s: Session): string[] {
  const ids = new Set<string>();
  for (const { event: e } of s.log) {
    if (e.type === 'opened') for (const p of e.roster) ids.add(p.id);
    else if (e.type === 'participant-added') ids.add(e.participant.id);
  }
  return [...ids];
}

/** Everything the engine publishes, read cold. */
export function picture(s: Session): unknown {
  Session.memo.off = true;
  const tryIt = (f: () => unknown): unknown => { try { return f(); } catch (e) { return (e as Error).message; } };
  try {
    const t = s.log.at(-1)!.event.t;
    const standings = Object.keys((s.log[0]!.event as { settings?: object }).settings ?? {});
    return {
      document: s.document(), version: s.currentVersion(), races: tryIt(() => s.races(t)),
      judgments: s.judgments(), candidates: s.allCandidates(), floor: tryIt(() => s.adoptionFloor()),
      backlog: tryIt(() => s.backlog(t)), standings: standings.map((k) => s.standing(k)), closed: s.closed,
      seats: seatsOf(s).map((id) => ({ balance: tryIt(() => s.balance(id, t)), hand: tryIt(() => s.feed(id, 8, t)) })),
    };
  } finally { Session.memo.off = false; }
}

/** The differential over one log at each K; returns how many restores it checked.
 *  `full`, where false, compares to the next K-th entry only, never to the end
 *  (a convention's 5,000 entries make every restore-to-the-end quadratic). */
export function differential(log: LogEntry[], ks: number[], full = true): number {
  const truth = new Map<number, { snap: string; pic: string; raw: EngineSnapshot }>();
  const points = new Set<number>([log.length]);
  for (const k of ks) for (let p = k; p < log.length; p += k) { points.add(p); points.add(Math.min(p + k, log.length)); }
  Session.replay(structuredClone(log), (s, folded) => {
    if (!points.has(folded)) return;
    const raw = s.snapshot();
    truth.set(folded, { snap: JSON.stringify(raw), pic: JSON.stringify(picture(s)), raw: stored(raw) });
  });
  let checked = 0;
  for (const k of ks) {
    for (let p = k; p < log.length; p += k) {
      const from = truth.get(p)!.raw;
      const ends = full ? [Math.min(p + k, log.length), log.length] : [Math.min(p + k, log.length)];
      for (const to of new Set(ends)) {
        const r = Session.restore(stored(from), structuredClone(log.slice(0, to)));
        expect(JSON.stringify(r.snapshot()), `K=${k} from ${p} to ${to}`).toBe(truth.get(to)!.snap);
        expect(JSON.stringify(picture(r)), `K=${k} from ${p} to ${to}`).toBe(truth.get(to)!.pic);
        checked++;
      }
    }
  }
  return checked;
}
