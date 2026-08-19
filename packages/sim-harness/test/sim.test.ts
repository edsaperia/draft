import { describe, expect, it } from 'vitest';
import { Session } from '../../engine-core/src/index.js';
import { ScriptedPersona } from '../src/persona.js';
import { charterScenario } from '../src/scenario.js';
import { runSession } from '../src/runner.js';

const HOURS = 3600_000;

async function run(seed: string, windowHours = 72) {
  return runSession({
    scenario: charterScenario,
    windowMs: windowHours * HOURS,
    seed,
    makePersona: (profile, rng) => new ScriptedPersona(profile, charterScenario, rng),
  });
}

describe('scripted simulation', () => {
  it('runs a full session: proposals, judgments, adoptions, coherent record', async () => {
    const { session, metrics } = await run('test-1');
    expect(metrics.candidates).toBeGreaterThan(3);
    expect(metrics.edgeComparisons).toBeGreaterThan(20);
    expect(metrics.adoptions).toBeGreaterThan(0);
    // The mechanism should beat the incumbent text on aggregate welfare.
    expect(metrics.welfareRatio).toBeGreaterThan(0);
    // The log is intact and replayable to the same state.
    expect(session.verifyChain()).toBe(true);
    const replayed = Session.replay(session.log);
    expect(replayed.rollingHash()).toBe(session.rollingHash());
    expect(replayed.document()).toBe(session.document());
  }, 30_000);

  it('is deterministic: same seed, same rolling hash and metrics', async () => {
    const a = await run('determinism');
    const b = await run('determinism');
    expect(a.session.rollingHash()).toBe(b.session.rollingHash());
    expect(a.metrics).toEqual(b.metrics);
    // And a different seed genuinely diverges.
    const c = await run('determinism-2');
    expect(c.session.rollingHash()).not.toBe(a.session.rollingHash());
  }, 60_000);

  it('serves no diagonals below the volume gate (SPEC §8.3a, Q393)', async () => {
    // The charter scenario holds five issues over a fourteen-member roster,
    // so the document never reaches E live questions and prioritisation has
    // no work to do — the gate keeps every diagonal out of every feed.
    // Positive serving coverage lives in engine-core's diagonal-gate tests.
    const { metrics } = await run('salience');
    expect(metrics.diagonalComparisons).toBe(0);
  }, 30_000);

  it('respects the token economy: drafting is bounded by grants', async () => {
    const { metrics } = await run('economy');
    for (const [, p] of Object.entries(metrics.participation)) {
      // grant 4 + up to 10 drip - stakes + refunds; nobody mints tokens.
      expect(p.tokensLeft).toBeGreaterThanOrEqual(0);
      expect(p.drafts).toBeLessThanOrEqual(14);
    }
  }, 30_000);
});

describe('blind discipline through the participant API (SPEC §3.5)', () => {
  it('cards carry no standings, no direction, and sealed authorship', async () => {
    const { session } = await run('blind', 24);
    const { ParticipantApi } = await import('../../engine-core/src/index.js');
    const api = new ParticipantApi(session, 'p1');
    // Session is closed now, but rendering is still inspectable via live candidates.
    for (const option of api.liveCandidates()) {
      const keys = Object.keys(option).sort();
      // sealed default: no author key at all
      expect(keys).toEqual(['changes', 'id', 'rationale']);
    }
  }, 30_000);
});

describe('coupled scenarios (clubhouse)', () => {
  it('conditional utility adds coupling terms against current positions', async () => {
    const { conditionalUtility, currentPositions, utility } = await import('../src/scenario.js');
    const { clubhouseScenario } = await import('../src/clubhouse.js');
    const s = clubhouseScenario;
    const keys = s.issues.find((i) => i.key === 'keys')!;
    const formalKeys = keys.alternatives[1]!;
    const p = s.personas[0]!;
    // Incumbent document: guests sits at its incumbent position (-0.6).
    const positions = currentPositions(s, s.text.split('\n'));
    const base = utility(p, 'keys', formalKeys);
    const cond = conditionalUtility(p, s, 'keys', formalKeys, positions);
    // keys couples to guests (+0.35) and offices (-0.3); both incumbents are negative,
    // so a formal keys line is penalised by the guests coupling and boosted by offices.
    const expected =
      base +
      0.35 * formalKeys.position * positions.get('guests')! +
      -0.3 * formalKeys.position * positions.get('offices')!;
    expect(cond).toBeCloseTo(expected, 10);
  });

  it('couplings bite: the optimal assignment beats per-issue greedy', async () => {
    const { assignmentWelfare, bestAlternative, optimalAssignment } = await import('../src/scenario.js');
    const { clubhouseScenario } = await import('../src/clubhouse.js');
    const s = clubhouseScenario;
    const optimal = optimalAssignment(s);
    const greedy = new Map(s.issues.map((i) => [i.key, bestAlternative(s, i)]));
    expect(assignmentWelfare(s, optimal)).toBeGreaterThanOrEqual(assignmentWelfare(s, greedy));
  });

  it('runs a full deterministic clubhouse session with a sane welfare ratio', async () => {
    const { clubhouseScenario } = await import('../src/clubhouse.js');
    const go = () =>
      runSession({
        scenario: clubhouseScenario,
        windowMs: 8 * 3600_000,
        seed: 'clubhouse-test',
        makePersona: (profile, rng) => new ScriptedPersona(profile, clubhouseScenario, rng),
      });
    const a = await go();
    const b = await go();
    expect(a.metrics.rollingHash).toBe(b.metrics.rollingHash);
    expect(a.metrics.adoptions).toBeGreaterThan(0);
    expect(a.metrics.welfareRatio).toBeGreaterThan(0);
    expect(a.metrics.welfareRatio).toBeLessThanOrEqual(1.001);
  }, 120_000);
});
