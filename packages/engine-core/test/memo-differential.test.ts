import { describe, expect, it } from 'vitest';
import { Session, makeConstitution } from '../src/session.js';
import { makeRng, type Rng } from '../src/rng.js';
import type { Participant } from '../src/types.js';

/**
 * **The memo against no memo, step for step** (Q1326, Ed 2026-09-14: *build
 * the remaining lever now*).
 *
 * Q1324's memo was suspended for the whole of a fold, so every `races()` read
 * in the write path was uncached; Q1326 bumps the state version at every
 * mutation instead and lets the memo live inside the fold too. That is the
 * most correctness-sensitive change the engine can take — a mistake shows up
 * as a document that replays differently or a race that ranks differently,
 * neither of which announces itself — so the guard is differential rather
 * than exemplary: one long seeded script, driven twice, once with
 * `Session.memo.off` deriving everything afresh and once with the memo live,
 * and everything the engine publishes compared after **every** step.
 *
 * `memo.audit` is the same question asked from the other end: it recomputes
 * every cache hit and throws where the cache and the live state disagree, so
 * it catches a mutation that escaped its `touch()` at the read that would
 * have been wrong rather than at whatever the wrong answer eventually broke.
 * The scripts below run under it too.
 */

const HOUR = 3600_000;
const SEATS = 5;
const LINES = 16;

const people: Participant[] = Array.from({ length: SEATS }, (_, i) => ({
  id: `p${i + 1}`,
  handle: `P${i + 1}`,
}));

const TEXT =
  Array.from({ length: LINES }, (_, i) => `Clause ${i + 1}: the club does a thing.`).join('\n') +
  '\n';

function open(seed: string): Session {
  return Session.open(
    {
      text: TEXT,
      roster: people,
      constitution: makeConstitution({
        windowStartMs: 0,
        windowEndMs: 40 * HOUR,
        rngSeed: seed,
        adoptionThresholdStart: 0.6,
        adoptionThresholdEnd: 0.9,
        tokenGrant: 6,
        tokenCap: 10,
        tokenDripMinutes: 20,
        cooldownMs: 30 * 60_000,
        quorum: { form: 'count', n: 2 },
      }),
      settings: { s1: { n: 1 }, s2: { n: 2 } },
    },
    0,
  );
}

/** Derive everything afresh for the length of one call. */
function cold<T>(f: () => T): T {
  Session.memo.off = true;
  try {
    return f();
  } finally {
    Session.memo.off = false;
  }
}

/** Recompute every cache hit and throw on disagreement, for one call. */
function audited<T>(f: () => T): T {
  Session.memo.audit = true;
  try {
    return f();
  } finally {
    Session.memo.audit = false;
  }
}

/** One act, decided once and performed on each session identically. */
type Act = (s: Session) => void;

/**
 * The script: the act at step `n`, chosen by reading the session handed in —
 * always the cold one, so the memo never gets to choose what it is tested on.
 * A refusal is part of the answer, so the act does not swallow it; the runner
 * catches and compares the message.
 */
function actAt(s: Session, n: number, t: number, rng: Rng): Act {
  const who = people[rng.int(SEATS)]!.id;
  const roll = rng.int(100);
  const races = s.races();
  if (roll < 46 && races.length > 0) {
    // judge whatever the room can still ask this seat about
    const race = races[rng.int(races.length)]!;
    // a lapsed seat is asked nothing at all (§9.5a) — that is a refusal on
    // the read, not on the act, so it is not the comparison's business
    let card = null;
    try { card = s.askOn(who, race.id); } catch { card = null; }
    if (card !== null) {
      const outcome = (['a', 'b', 'tie'] as const)[rng.int(3)]!;
      return (x) => { x.judge(t, who, card.aId, card.bId, outcome); };
    }
  }
  if (roll < 70) {
    // a text proposal on one line, so races form, split and collide
    const line = rng.int(LINES);
    const words = `Clause ${line + 1}: revision ${n} by ${who}.`;
    const base = s.currentVersion();
    return (x) => {
      x.submitCandidate(t, {
        author: who,
        rationale: `r${n}`,
        patch: { baseVersion: base, hunks: [{ start: line, end: line + 1, lines: [words] }] },
      });
    };
  }
  if (roll < 78) {
    const settingId = rng.int(2) === 0 ? 's1' : 's2';
    const value = { n: 100 + n };
    return (x) => { x.submitCandidate(t, { author: who, rationale: `m${n}`, setting: { settingId, value } }); };
  }
  if (roll < 84) {
    const mine = s.allCandidates().filter((c) => c.author === who && c.state === 'live');
    if (mine.length > 0) {
      const id = mine[rng.int(mine.length)]!.id;
      return (x) => { x.withdraw(t, id); };
    }
  }
  if (roll < 88) {
    const others = s.allCandidates().filter((c) => c.state === 'live' && c.author !== who);
    if (others.length > 0) {
      const id = others[rng.int(others.length)]!.id;
      return (x) => { x.coSign(t, who, id); };
    }
  }
  if (roll < 91) {
    // the standing moves under a setting race: the ground shift (§4.4)
    const settingId = rng.int(2) === 0 ? 's1' : 's2';
    const value = { n: 500 + n };
    return (x) => { x.setStanding(t, settingId, value); };
  }
  if (roll < 94) {
    // lapse and revival (§9.5a): E moves, and with it the floor
    const entry = people[rng.int(SEATS)]!.id;
    const out = s.allCandidates().length % 2 === 0;
    return (x) => { if (out) x.suspendParticipant(t, entry); else x.resumeParticipant(t, entry); };
  }
  if (roll < 96) {
    // the bar and the drip re-anchor (§4.3, §7)
    const changes = rng.int(2) === 0
      ? { adoptionThresholdEnd: 0.8 + rng.int(15) / 100 }
      : { tokenDripMinutes: 10 + rng.int(30) };
    return (x) => { x.amend(t, changes); };
  }
  return (x) => { x.tick(t); };
}

/** Everything the engine publishes, as one comparable value. */
function picture(s: Session, t: number): unknown {
  return {
    hash: s.rollingHash(),
    entries: s.log.length,
    document: s.document(),
    version: s.currentVersion(),
    races: s.races(),
    judgments: s.judgments(),
    // peakW rides here, and it is what a refund is computed from
    candidates: s.allCandidates(),
    floor: s.adoptionFloor(),
    edges: s.totalEdgeComparisons,
    salience: [...s.salienceWeights()],
    backlog: s.backlog(t),
    bounties: s.bountyBoard(),
    standings: [s.standing('s1'), s.standing('s2')],
    closed: s.closed,
    seats: people.map((p) => {
      let balance: number | string;
      try { balance = s.balance(p.id, t); } catch (e) { balance = (e as Error).message; }
      let hand: unknown;
      try { hand = s.feed(p.id, 8, t); } catch (e) { hand = (e as Error).message; }
      const asks = s.races().map((r) => {
        try { return s.askOn(p.id, r.id); } catch (e) { return (e as Error).message; }
      });
      return { balance, hand, asks };
    }),
  };
}

/** Run one act, and hand back whatever it refused with. */
function attempt(s: Session, act: Act): string | null {
  try {
    act(s);
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}

interface RunOut {
  hash: string;
  entries: number;
  acts: number;
  refusals: number;
}

/**
 * The two sessions, step for step. The act is chosen by reading `cold`, then
 * performed on both; after every step both are asked for everything they
 * publish, and the two answers must be the same object.
 */
function differential(seed: string, steps: number): RunOut {
  const a = cold(() => open(seed)); // memo off throughout
  const b = open(seed); // memo live
  const rng = makeRng(`differential/${seed}`);
  let t = 1000;
  let acts = 0;
  let refusals = 0;
  for (let n = 0; n < steps; n++) {
    t += 1 + rng.int(9 * 60_000);
    const act = cold(() => actAt(a, n, t, rng));
    const refusedCold = cold(() => attempt(a, act));
    const refusedWarm = audited(() => attempt(b, act));
    expect(refusedWarm, `step ${n} (${seed})`).toEqual(refusedCold);
    if (refusedCold === null) acts++;
    else refusals++;
    expect(audited(() => picture(b, t)), `step ${n} (${seed})`)
      .toEqual(cold(() => picture(a, t)));
  }
  // and the log each produced replays to the same place, memo or no memo
  const replayCold = cold(() => Session.replay([...a.log]));
  const replayWarm = Session.replay([...b.log]);
  expect(b.rollingHash()).toBe(a.rollingHash());
  expect(replayWarm.rollingHash()).toBe(a.rollingHash());
  expect(replayWarm.races()).toEqual(cold(() => replayCold.races()));
  expect(replayWarm.allCandidates()).toEqual(cold(() => replayCold.allCandidates()));
  return { hash: a.rollingHash(), entries: a.log.length, acts, refusals };
}

describe('the fold-live memo derives what no memo derives (Q1326)', () => {
  for (const seed of ['moon', 'oak', 'clerk']) {
    it(`a long random session agrees at every step: ${seed}`, () => {
      const out = differential(seed, 120);
      // the script has to actually exercise the engine, or agreement is cheap
      expect(out.acts).toBeGreaterThan(70);
      expect(out.entries).toBeGreaterThan(90);
    });
  }

  it('the close, and everything after it, agrees too', () => {
    const a = cold(() => open('closing'));
    const b = open('closing');
    const rng = makeRng('differential/closing');
    let t = 1000;
    for (let n = 0; n < 60; n++) {
      t += 1 + rng.int(20 * 60_000);
      const act = cold(() => actAt(a, n, t, rng));
      cold(() => attempt(a, act));
      audited(() => attempt(b, act));
    }
    const closeT = 40 * HOUR;
    cold(() => a.tick(closeT));
    audited(() => b.tick(closeT));
    expect(b.closed).toBe(true);
    expect(audited(() => picture(b, closeT))).toEqual(cold(() => picture(a, closeT)));
    expect(audited(() => b.finalRender())).toEqual(cold(() => a.finalRender()));
  });

  it('both switches are off once the tests have had them', () => {
    expect(Session.memo.off).toBe(false);
    expect(Session.memo.audit).toBe(false);
  });
});
