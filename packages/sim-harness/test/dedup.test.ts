import { describe, expect, it } from 'vitest';
import { DedupGate } from '../../engine-core/src/index.js';
import { MockOracle } from '../src/oracles.js';
import { ScriptedPersona } from '../src/persona.js';
import { charterScenario, type Scenario } from '../src/scenario.js';
import { runSession } from '../src/runner.js';

const HOURS = 3600_000;

describe('dedup-gate with the MockOracle transport', () => {
  const live = [
    { id: 'c7', text: 'A quorum of five members is required.', rationale: 'No rump decisions.' },
  ];

  it('a MockOracle duplicate verdict surfaces via "oracle"', async () => {
    const oracle = new MockOracle((text, existing) =>
      text.includes('quorum') && existing[0]
        ? { duplicateOf: existing[0].id, confidence: 0.9, reason: 'same quorum rule' }
        : { duplicateOf: null, confidence: 0, reason: 'mock: no opinion' },
    );
    const gate = new DedupGate(oracle);
    const verdict = await gate.check(
      'Decisions need a quorum: five members present.',
      live,
      'doc',
    );
    expect(verdict).toEqual({
      kind: 'duplicate',
      of: 'c7',
      via: 'oracle',
      reason: 'same quorum rule',
    });
  });

  it('a MockOracle that throws degrades to fresh (oracle errors never block)', async () => {
    const oracle = new MockOracle(() => {
      throw new Error('transport down');
    });
    const gate = new DedupGate(oracle);
    const verdict = await gate.check(
      'Decisions need a quorum: five members present.',
      live,
      'doc',
    );
    expect(verdict).toEqual({ kind: 'fresh' });
  });
});

describe('sim regression: dedup off is byte-identical to before the gate existed', () => {
  // Rolling hash of this exact run (charter, 24h, seed "dedup-regression").
  // Guards Ed's constraint that with no gate configured the engine and
  // runner behave exactly as before — any drift here means the no-dedup
  // path changed, which is a bug regardless of intent. Re-pin only with
  // a deliberate mechanism change.
  //
  // Re-pinned 2026-08-14 for SPEC v0.8 → v0.12 (revisable judgments,
  // ground-shift locking/re-serving, rival-pair gating: Q48/Q50). The
  // rival gate alone changes the served card mix, so the event stream
  // legitimately differs from the pre-gate capture
  // (502f767efe00c5cfebdb664ec1b8a5525cf0449d25dfdd5a981d315805f6ae01).
  // Determinism verified before re-pinning: two fresh runs of this
  // config produced this hash, and Session.replay reproduces it.
  //
  // Re-pinned 2026-08-16 for the saturated → deadlocked rename. Nothing
  // about the mechanism moved: the constitution is serialised into the
  // genesis event, so renaming two of its parameters changes the genesis
  // JSON and therefore every hash in the chain after it. Worth knowing
  // that a pure vocabulary change is a chain-breaking change — receipts
  // issued before it will not verify against code after it. Both runs
  // below produced this hash identically, so the gate-silent invariant
  // the test exists to defend is untouched
  // (was 4f1ff4611d0ba18cd96919f77b5acd9ddd41a17eb3708384f8b2cd12d8dfd2db).
  //
  // Re-pinned again 2026-08-16 for SPEC v0.16 §3.3: an author's preference for
  // their own live candidate is now derived against the current incumbent
  // (Q245b), so it feeds the ranking and counts toward the floor. That changes
  // which cards the router serves and when races reach their floor, so the
  // event stream legitimately differs throughout. Both runs below produced
  // this hash identically, so the gate-silent invariant the test exists to
  // defend is untouched
  // (was bab3663b562f08bcda18234689824515f44c333c3131da0c386709e0ea5bbbc0).
  // Re-pinned 2026-08-19 (367b): the genesis event hashes the constitution,
  // which gained quorum and traded tokenDripPerTenth for tokenDripMinutes.
  // Re-pinned 2026-08-19 (Q393, §8.3a): the diagonal gate replaced the flat
  // 1-in-10 — the charter scenario runs below E live questions, so personas
  // are served (and judge) no diagonals, and the event stream legitimately
  // differs throughout. Both runs below produced this hash identically, so
  // the gate-silent invariant the test exists to defend is untouched
  // (was e8fe607a479ec4fc80ea4311132013868816183cac61d537f134a329ff996556).
  // Re-pinned 2026-08-19 (Q399, §4.2 v0.58): adoptions batch on the cooldown
  // metronome, so adoption timing — and every event after the first batch —
  // legitimately differs. The Q399 commit moved the sibling pins and missed
  // this one; bisection against a pristine tree confirmed the new hash is
  // v0.58's own, byte-identical with and without the same-day refactors
  // (was e4d17eaf4501f9d518f9df301b12e9acd2b44a4a476d1f926a50b3206dd10dd1).
  // Re-pinned 2026-08-21 (stage 8, Q503c): `adopted` and `candidate-retired`
  // events name their race (`raceId`), so every resolution event — and the
  // chain after the first — hashes differently. Both variants of this test
  // still agree with each other, which is the invariant it defends
  // (was 61cddb50bb7cfb381f51edb96c78c42d9f2074cf2f7bd535f2ec9085c17be969).
  // Re-pinned 2026-08-21 (Q467, the close, SPEC §4.6): a windowed session now
  // closes when the clock reaches its end — the sim's final tick emits the
  // close and the undecided verdicts, so the chain's tail hashes differently.
  // Both variants still agree, which is the invariant this test defends
  // (was a0e8813425676539adfb2096a79bed27ea8f1d75a92e32e3818cd31d7c6a3523).
  // Re-pinned 2026-08-27 (Q770, entry 31, SPEC §3.5a v0.78): every
  // `candidate-submitted` event now carries `disclosure` — the authorship base
  // standing at submission, which is what *a proposal keeps the privacy it was
  // made under* is read from — so the chain hashes differently from the first
  // candidate on. Both variants still agree, which is the invariant this test
  // defends (was 2bfc2e2a50bb690e34bdcddb936d53002c3419481678b32263c5d3a053638150).
  // Re-pinned 2026-08-29 (backlog 253, SPEC §3.3 v0.94): an author is never
  // served their own candidate against the incumbent, so every persona's feed
  // legitimately holds different pairs from the first submission on — and with
  // them different comparisons, different adoption timings and a different
  // chain. Both variants still agree with each other, which is the invariant
  // this test defends
  // (was 3ec36c64ff9501c0f24c7d661323fc818b6598032d9bfd30c533448f77fd66bc).
  // Re-pinned 2026-09-05 (Q1178, the unheard slots): a race a participant
  // hasn't judged that is short of the adoption floor now takes the hand's
  // leading slots, least-measured first — without it a fresh proposal in a
  // document whose hot set was full of evidenced races reached nobody
  // (`room-walk`'s finding). Every persona's feed legitimately leads with
  // different cards, so the comparisons, the adoption timings and the chain
  // all move. Both variants still agree with each other, which is the
  // invariant this test defends
  // (was 0f18a6b0eb3e0a74fb6e95ab84eec53c2e5f5f7365561617fd4252f26812e46d).
  // Re-pinned 2026-09-09 (Q1178 ruled by Ed: the least-measured slot goes,
  // the hand is v / c_p alone): the pin returns to exactly the 2026-08-29
  // value above, which is the proof that removing the slot restored `feed()`
  // byte for byte on this run. Both variants still agree with each other
  // (was dc729ecd80686db4a3c78ed725af3143bb40a481b71786b894373c422a34727f).
  // Re-pinned 2026-09-11 (Q1337, SPEC §4.2 v0.116, R-102): the adoption floor
  // counts judges of the winner, not movers on the race — a race that met F
  // on rival judgments now waits for judges of its leader, adoption timings
  // move, and the router's unheard boost lands on different races, so every
  // event after the first such race legitimately differs. Both variants
  // still agree with each other, which is the invariant this test defends
  // (was 0f18a6b0eb3e0a74fb6e95ab84eec53c2e5f5f7365561617fd4252f26812e46d).
  // Re-pinned 2026-09-14 (Q1353, SPEC §2.6/§4.6 v0.126, R-113): the close
  // files a proposal stranded by a text change as *undecided*, like a race
  // caught running. This run strands exactly one candidate (c4, on a
  // mid-session `rebase-failed`), so the chain gains one `candidate-undecided`
  // at T=0 ahead of `closed` and nothing else moves — the tail is the whole
  // diff. Both variants still agree with each other, two fresh runs produced
  // this hash and `Session.replay` reproduces it, which is the invariant this
  // test defends
  // (was af13ed609b74c053782ecdffe5b080b8218a4c217c34d0aa5e9d62438579c36c).
  // Re-pinned 2026-09-15 (Q1362, SPEC §4.2/§4.3 v0.128, R-114/R-117): the
  // status quo is a peer — a race carries when the ranking puts a candidate
  // above the current text and the floor is met, and there is no bar. Two
  // things move the chain: `DEFAULT_CONSTITUTION` pins the threshold at 0.5,
  // and the genesis event hashes the constitution; and adoption timing changes
  // throughout, since a race that had to reach 0.60 rising to 0.95 now carries
  // on a majority. Both variants below produced this hash identically, two
  // fresh runs agreed, and `Session.replay` reproduces it — which is the
  // invariant this test defends
  // (was acccf5c0e4f15604c46000c691e2cbc60e00e22a84352008c31aec9904bbb46b).
  // Re-pinned again 2026-09-15, same ruling, one commit later (70ea6c8, the
  // TIE_EPS amendment): *equal* now means equal within the fit's noise, so a
  // leader whose strength sits inside epsilon of the current text's is a tie
  // and the current text stands. That moves adoption timings on this run
  // exactly as the rule change above did, and the pin was not re-run when the
  // amendment landed — so the branch it landed on was red on this file. Four
  // fresh computations agree: both variants, a second no-gate run, and
  // `Session.replay` of the first
  // (was f4af4c582015e0680e420d78bc409d35990add2279a865e50ae73f3455b445a6).
  // Re-pinned 2026-09-17 (Q1439, SPEC §4.2/§8.2 v0.132, R-125/R-126): the
  // adoption floor counts **approvals** of the leader — its latest judgment
  // against the current text, preferring it — rather than judgments of it
  // either way, and no quorum asks for more than half the group. Adoption
  // timings move throughout this run: a race that met F on judgments against
  // its own leader now waits for people who prefer it, and the router leads
  // the unheard with the leader against the current text. Both variants below
  // produced this hash, a second no-gate run agreed and `Session.replay`
  // reproduces it — which is the invariant this test defends
  // (was 866c68f245fcf558ed9e179bc83f0c9ea586c7d6739ab748e4d98eac1ef26d63).
  // Re-pinned 2026-09-18 (Q1439 ruling s, SPEC §4.2/§8.2 v0.133, R-131): the
  // built-in minimum of ⌈E/3⌉ beneath the floor is gone — F is max(1, Q′), the
  // room's own number and nothing under it (Ed: *if the membership want a
  // smaller quorum they should be able to choose it*). The charter scenario
  // settles no quorum, so every race in this run was held to ⌈E/3⌉ and is now
  // held to one: adoption timings move from the first race on and the chain
  // differs throughout. Both variants below produced this hash, a second
  // no-gate run agreed and `Session.replay` reproduces it — which is the
  // invariant this test defends
  // (was a5fa29c1a1b97ac7a99fb4dbbfa17f16c5fa4fab47eb0255dfaab4d84adb1827).
  const PINNED = '0ce7fe0352dfe2c604ae024aac04e61f7a954e5faa043a2dab9df111d9f82eb7';

  const run = (withGate: boolean) =>
    runSession({
      scenario: charterScenario,
      windowMs: 24 * HOURS,
      seed: 'dedup-regression',
      makePersona: (profile, rng) => new ScriptedPersona(profile, charterScenario, rng),
      ...(withGate ? { dedupGate: new DedupGate() } : {}),
    });

  it('no gate: rolling hash matches the pre-gate pin', async () => {
    const { session } = await run(false);
    expect(session.rollingHash()).toBe(PINNED);
  }, 30_000);

  it('gate configured but silent (no duplicates drafted): still byte-identical', async () => {
    // The charter alternatives are textually far apart, so the gate finds
    // nothing; an advisory gate that finds nothing must change nothing.
    const { session } = await run(true);
    expect(session.rollingHash()).toBe(PINNED);
  }, 30_000);
});

describe('dedup-gate in a full scripted run', () => {
  // A scenario built to produce near-duplicates WITHOUT weakening the
  // persona logic: two personas whose best alternatives on one issue are
  // distinct strings four edits apart ("each" vs "every"). The scripted
  // persona's liveTexts check only skips exact matches, so the second
  // drafter genuinely submits — and the gate catches it.
  const dupeScenario: Scenario = {
    name: 'dupes',
    text: ['# Charter', 'Meetings happen when someone calls one.'].join('\n'),
    issues: [
      {
        key: 'meetings',
        line: 1,
        alternatives: [
          {
            text: 'Meetings happen when someone calls one.',
            position: -0.6,
            quality: 0.3,
            rationale: '',
          },
          {
            text: 'Meetings happen on the first Tuesday of each month.',
            position: 0.4,
            quality: 0.7,
            rationale: 'A fixed rhythm beats ad-hoc scheduling.',
          },
          {
            text: 'Meetings happen on the first Tuesday of every month.',
            position: 0.7,
            quality: 0.7,
            rationale: 'A fixed monthly rhythm, firmly worded.',
          },
        ],
      },
    ],
    personas: [
      {
        id: 'd1',
        handle: 'Ana',
        temperament: 'Test persona.',
        stances: { meetings: 0.4 },
        salience: { meetings: 0.8 },
        noise: 0,
        draftiness: 1,
        boutCards: 3,
        boutGapMs: 30 * 60_000,
        cardSeconds: 10,
      },
      {
        id: 'd2',
        handle: 'Bo',
        temperament: 'Test persona.',
        stances: { meetings: 0.8 },
        salience: { meetings: 0.8 },
        noise: 0,
        draftiness: 1,
        boutCards: 3,
        boutGapMs: 30 * 60_000,
        cardSeconds: 10,
      },
      // **Three who prefer the clause as it stands** (Q1439). The room used to
      // be the two drafters alone under a quorum of 99, which held the floor
      // out of reach so the original stayed live for its twin to meet. No
      // quorum may ask for more than half now (R-126), so in a room of two the
      // floor is one and the first approval carries the original away — and
      // the twin meets nothing. **A race is held open by disagreement now,
      // not by an unreachable number**, which is the whole of Q1439: these
      // three sit at the incumbent's own position, so they prefer the clause
      // as it stands, the two drafters' approvals never reach the floor of
      // three, and both candidates stay live. They never draft
      // (`draftiness: 0`), so the duplicate the gate is about is still the
      // second drafter's.
      ...[1, 2, 3].map((i) => ({
        id: `s${i}`,
        handle: `S${i}`,
        temperament: 'Test persona.',
        stances: { meetings: -0.6 },
        salience: { meetings: 0.8 },
        noise: 0,
        draftiness: 0,
        boutCards: 3,
        boutGapMs: 30 * 60_000,
        cardSeconds: 10,
      })),
    ],
  };

  it('merges support on the first duplicate and skips repeats', async () => {
    const lines: string[] = [];
    const { session } = await runSession({
      scenario: dupeScenario,
      windowMs: 12 * HOURS,
      seed: 'dupes',
      makePersona: (profile, rng) => new ScriptedPersona(profile, dupeScenario, rng),
      // Hold the floor above reach so candidates stay live and the second
      // persona's twin draft meets a live original. It froze the threshold at
      // 0.99 until v0.128, when the bar left the adoption test (Q1362, R-117).
      constitutionOverrides: { quorum: { form: 'count', n: 99 } },
      dedupGate: new DedupGate(),
      onProgress: (line) => lines.push(line),
    });

    // Only one candidate ever entered play; its twin was caught.
    expect(session.allCandidates()).toHaveLength(1);
    const c1 = session.allCandidates()[0]!;

    // First catch merges support (co-sign), later retries are skipped.
    const merged = lines.filter((l) =>
      l.includes(`drafts a duplicate of ${c1.id} (edit-distance): support merged`),
    );
    const skipped = lines.filter((l) =>
      l.includes(`drafts a duplicate of ${c1.id} (edit-distance): skipped`),
    );
    expect(merged).toHaveLength(1);
    expect(skipped.length).toBeGreaterThan(0);

    // Both personas now support the surviving candidate (SPEC §5.1).
    expect([...session.supportersOf(c1.id)].sort()).toEqual(['d1', 'd2']);

    // The gate is advisory: the log stays intact and replayable.
    expect(session.verifyChain()).toBe(true);
  }, 30_000);
});
