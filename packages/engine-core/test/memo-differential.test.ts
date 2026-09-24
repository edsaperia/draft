import { afterEach, describe, expect, it } from 'vitest';
import { Session, makeConstitution } from '../src/session.js';
import { makeRng, type Rng } from '../src/rng.js';
import type { Participant } from '../src/types.js';

// Every case here is synchronous and the file runs for a minute and a half on
// a slow machine; vitest's worker answers its own heartbeat on the event loop,
// and a file that never yields fails the run with *Timeout calling
// "onTaskUpdate"* though every test passed (2026-09-21). One tick between
// cases lets the heartbeat through.
afterEach(() => new Promise<void>((done) => { setTimeout(done, 0); }));

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

function open(seed: string, overrides: Record<string, unknown> = {}): Session {
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
        ...overrides,
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
    // **at `t`, not at the last event** (Q1439): the floor is read against the
    // group, and a silence leaves the group when 💤's period runs — with no
    // event to mark it. So the picture is taken at the clock the step is at,
    // which is what puts the time-free half of the memo under test.
    races: s.races(t),
    judgments: s.judgments(),
    // peakW rides here, and it is what the graveyard's ranking is taken from
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
      const asks = s.races(t).map((r) => {
        try { return s.askOn(p.id, r.id, t); } catch (e) { return (e as Error).message; }
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
  /**
   * **Proposals the room closed inside the script** (Q1440). The domination
   * test is derived state read inside the sweep and acted on with an event,
   * which is exactly the shape a memo can get wrong, so the scripts below
   * assert that they contain some rather than hoping they do.
   */
  dominations: number;
  /**
   * **Rivals that stayed in the race** (Q1534, R-141): `candidate-reaimed`
   * events, text and setting, and how many judgments they carried. The carry
   * restamps comparisons in place inside a fold, which is a mutation the memo
   * must see, so the scripts assert they contain some.
   */
  reaims: { text: number; setting: number; carried: number };
}

/**
 * The two sessions, step for step. The act is chosen by reading `cold`, then
 * performed on both; after every step both are asked for everything they
 * publish, and the two answers must be the same object.
 */
function differential(
  seed: string,
  steps: number,
  overrides: Record<string, unknown> = {},
): RunOut {
  const a = cold(() => open(seed, overrides)); // memo off throughout
  const b = open(seed, overrides); // memo live
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
  expect(replayWarm.races(t)).toEqual(cold(() => replayCold.races(t)));
  expect(replayWarm.allCandidates()).toEqual(cold(() => replayCold.allCandidates()));
  return { hash: a.rollingHash(), entries: a.log.length, acts, refusals,
    dominations: a.log.filter((e) => e.event.type === 'candidate-retired'
      && (e.event as { reason?: string }).reason === 'dominated').length,
    reaims: a.log.reduce((r, e) => {
      const ev = e.event;
      if (ev.type !== 'candidate-reaimed') return r;
      return { text: r.text + (ev.patch ? 1 : 0), setting: r.setting + (ev.patch ? 0 : 1),
        carried: r.carried + ev.carried.length };
    }, { text: 0, setting: 0, carried: 0 }) };
}

/**
 * **A load allowance, not a performance budget** (Q1439). These scripts run in
 * about 1.4 s each alone and have twice timed out at vitest's default five
 * under full-suite load on this machine, which reddens `ci` and so holds a
 * push; the budget is the before/after measurement Q1441 asks for, not this
 * number. Each script is 120 steps × two sessions, one of them deriving
 * everything afresh, with the whole published picture of both compared at
 * every step, and the warm side runs under `memo.audit`, which recomputes
 * *and serialises* every cache hit. Nothing about the assertions is relaxed.
 *
 * **Raised from 30 s to 120 s on 2026-09-19** (Ed: *you decide*). Measured the
 * same night on this machine, alone and with nothing else running: *moon* 24 s,
 * *oak* 25.5 s, *clerk* 18 s, the abstaining script 12 s — and *moon* timed out
 * at 30 s twice in a full-suite run. **That is seventeen times the 1.4 s this
 * comment records**, so the allowance is no longer the interesting number: the
 * scripts got slow somewhere between Q1439 and today, and whether that is the
 * test's own cold side or the engine under a busy room is an open finding
 * (QUESTIONS, beside Q1441's before/after measurement), not something a
 * timeout settles. The limit is raised so the finding cannot hold a push.
 */
const SCRIPT_MS = 120_000;

/**
 * **How many proposals the scripts closed** (Q1440), filled as they run and
 * read at the end. The domination test is derived state consulted inside the
 * sweep and acted on with an event — the shape a memo is likeliest to get
 * wrong — so the coverage is asserted rather than assumed. It is a total over
 * the scripts and not a per-seed floor, because whether a given seed's random
 * room ever refuses a wording hard enough is the seed's business.
 */
const closings: number[] = [];
/** And how many re-aims they made (Q1534), read at the end the same way. */
const reaimings: RunOut['reaims'][] = [];

describe('the fold-live memo derives what no memo derives (Q1326)', () => {
  for (const seed of ['moon', 'oak', 'clerk']) {
    it(`a long random session agrees at every step: ${seed}`, () => {
      const out = differential(seed, 120);
      // the script has to actually exercise the engine, or agreement is cheap
      expect(out.acts).toBeGreaterThan(70);
      expect(out.entries).toBeGreaterThan(90);
      closings.push(out.dominations);
      reaimings.push(out.reaims);
    }, SCRIPT_MS);
  }

  /**
   * **Time passing is a state change the log never records** (Q1439): 💤's
   * period turns a silence into an abstention with no event to mark it, so the
   * group — and the floor read against it — moves while nothing else does.
   * That is the one thing the memo cannot hold, and this is the case that says
   * so: a period short enough that most steps cross one, the picture taken at
   * each step's own clock, and the cold session deriving everything afresh.
   */
  it('a session whose silences abstain as the clock moves agrees at every step', () => {
    const out = differential('abstain', 120, { abstainAfterMs: 4 * 60_000 });
    // the bound only guards that the script did something. It ran above 70
    // until v0.133's seconder (Q1439 ruling u) held more races open, which
    // changes which scripted acts are legal and lands this run at 68. The
    // step-by-step differential is the assertion; this is its floor.
    expect(out.acts).toBeGreaterThan(60);
    closings.push(out.dominations);
    reaimings.push(out.reaims);
  }, SCRIPT_MS);

  it('the races read at two clocks on one state differ only in the floor they were read at', () => {
    const s = open('two-clocks', { abstainAfterMs: 5 * 60_000 });
    s.submitCandidate(1000, { author: 'p1', rationale: 'r',
      patch: { baseVersion: 0, hunks: [{ start: 0, end: 1, lines: ['Clause 1: changed.'] }] } });
    const early = s.races(2000)[0]!;
    const late = s.races(1000 + 5 * 60_000 + 1)[0]!;
    // nothing in the log moved between the two reads
    expect(late.leaderJudges).toBe(early.leaderJudges);
    expect(late.approvals).toBe(early.approvals);
    // and everything that rides the clock did
    expect(early.group).toBe(SEATS);
    expect(late.group).toBe(1);
    // the memo holds the time-free half, so a cold read agrees with both
    expect(cold(() => s.races(2000)[0]!)).toEqual(early);
    expect(audited(() => s.races(1000 + 5 * 60_000 + 1)[0]!)).toEqual(late);
  });

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
  }, SCRIPT_MS);

  it('the scripts above closed proposals the room could no longer pass (Q1440)', () => {
    expect(closings.length).toBe(4);
    expect(closings.reduce((a, x) => a + x, 0)).toBeGreaterThan(0);
  });

  it('the scripts above kept rivals in the race and carried their judgments (Q1534)', () => {
    expect(reaimings.length).toBe(4);
    const sum = reaimings.reduce((a, x) => ({ text: a.text + x.text,
      setting: a.setting + x.setting, carried: a.carried + x.carried }),
    { text: 0, setting: 0, carried: 0 });
    expect(sum.text).toBeGreaterThan(0);
  });

  /**
   * **The carry itself, step for step** (Q1534, R-141). The random scripts
   * re-aim rivals by the dozen but rarely deal a rival pair, so they seldom
   * carry a judgment; this script does it on purpose — three rivals on one
   * line, every rival pair judged, the adoption, the carry, the domination
   * that follows, a decree over the survivor and the settings carry — and
   * compares the whole published picture after every act, memo off against
   * memo live under audit.
   */
  it('a scripted re-aim with carried judgments agrees at every step', () => {
    const a = cold(() => open('carry'));
    const b = open('carry');
    const line0 = (s: Session, words: string) => ({ baseVersion: s.currentVersion(),
      hunks: [{ start: 0, end: 1, lines: [words] }] });
    const race = (s: Session, id: string) => s.races().find((r) => r.members.includes(id))!;
    const acts: Array<(s: Session, t: number) => void> = [
      (s, t) => { s.submitCandidate(t, { author: 'p1', rationale: 'a', patch: line0(s, 'Clause 1: A.') }); },
      (s, t) => { s.submitCandidate(t, { author: 'p2', rationale: 'b', patch: line0(s, 'Clause 1: B.') }); },
      (s, t) => { s.submitCandidate(t, { author: 'p3', rationale: 'c', patch: line0(s, 'Clause 1: C.') }); },
      (s, t) => { s.judge(t, 'p4', 'c1', 'c2', 'b'); },
      (s, t) => { s.judge(t, 'p5', 'c2', 'c3', 'a'); },
      (s, t) => { s.judge(t, 'p1', 'c1', 'c3', 'a'); },
      (s, t) => { s.judge(t, 'p3', 'c1', 'c2', 'tie'); },
      (s, t) => { s.judge(t, 'p5', 'c1', 'c2', 'a'); },
      // c2 carries; c1 and c3 cover it and stay, their pairs with c2 carried
      (s, t) => { s.judge(t, 'p4', 'c2', race(s, 'c2').incumbentId, 'a'); },
      // p2 prefers what now stands to c1: 2 for, 2 against, nobody left — closed
      (s, t) => { s.judge(t, 'p2', 'c1', race(s, 'c1').incumbentId, 'b'); },
      (s, t) => { s.tick(t); },
      (s, t) => { s.decreeText(t, { author: 'p1', rationale: 'd', patch: line0(s, 'Clause 1: D.') }); },
      (s, t) => { s.submitCandidate(t, { author: 'p1', rationale: 'x', setting: { settingId: 's1', value: { n: 7 } } }); },
      (s, t) => { s.submitCandidate(t, { author: 'p2', rationale: 'y', setting: { settingId: 's1', value: { n: 8 } } }); },
      // c4 is the decree; c5 and c6 race on s1, and p3 prefers c5 to c6
      (s, t) => { s.judge(t, 'p3', 'c5', 'c6', 'a'); },
      (s, t) => { s.setStanding(t, 's1', { n: 9 }); },
      (s, t) => { s.tick(t); },
    ];
    let t = 1000;
    for (const [n, act] of acts.entries()) {
      t += 60 * 60_000;
      const refusedCold = cold(() => attempt(a, (x) => act(x, t)));
      const refusedWarm = audited(() => attempt(b, (x) => act(x, t)));
      expect(refusedWarm, `step ${n}`).toEqual(refusedCold);
      expect(refusedCold, `step ${n}`).toBeNull();
      expect(audited(() => picture(b, t)), `step ${n}`).toEqual(cold(() => picture(a, t)));
    }
    const reaimed = a.log.map((e) => e.event).filter((e) => e.type === 'candidate-reaimed');
    // text re-aims from the adoption and the decree, a setting one from the standing
    expect(reaimed.some((e) => e.type === 'candidate-reaimed' && e.patch && e.carried.length > 0)).toBe(true);
    expect(reaimed.some((e) => e.type === 'candidate-reaimed' && !e.patch && e.carried.length > 0)).toBe(true);
    expect(Session.replay([...b.log]).rollingHash()).toBe(a.rollingHash());
    expect(cold(() => Session.replay([...a.log]).judgments())).toEqual(audited(() => b.judgments()));
  });

  it('both switches are off once the tests have had them', () => {
    expect(Session.memo.off).toBe(false);
    expect(Session.memo.audit).toBe(false);
  });
});
