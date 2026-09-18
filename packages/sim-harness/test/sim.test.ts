import { describe, expect, it, vi } from 'vitest';
import { Session } from '../../engine-core/src/index.js';
import { ScriptedPersona } from '../src/persona.js';
import { charterScenario } from '../src/scenario.js';
import { runSession } from '../src/runner.js';
import { ALPHA_PRESET_OVERRIDES, ALPHA_PRESET_CELL } from '../src/alpha-preset-values.js';

/**
 * **The cap calibration** (SPEC §4.2, R-051): *"A calibration test holds the
 * cap high enough that no simulated room reaches it."* The mark on an adoption
 * makes a non-converged fit **visible**; this makes it **rare**, so a cap set
 * too low is a red run rather than a line in a record nobody reads.
 *
 * The claim is about every fit the room produces, not only the ones that go on
 * to adopt — a race that hits the cap and never adopts is exactly the case an
 * adoption-side assertion cannot see — so the observation point is the fit
 * itself. The mock delegates to the real `fitDavidson` and records how it
 * stopped; not one production number changes.
 */
// `vi.hoisted`, because `vi.mock` is lifted above the imports and its factory
// runs while they load — a plain `const` up here would still be in its temporal
// dead zone by the time the first fit is recorded.
const { stops } = vi.hoisted(() => ({ stops: [] as string[] }));
vi.mock('../../engine-core/src/ranking/davidson.js', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../engine-core/src/ranking/davidson.js')>();
  return {
    ...real,
    fitDavidson: (...args: Parameters<typeof real.fitDavidson>) => {
      const fit = real.fitDavidson(...args);
      stops.push(fit.stop);
      return fit;
    },
  };
});

const HOURS = 3600_000;
const MINUTES = 60_000;

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

  it('respects the token economy: nobody mints tokens', async () => {
    const { session, metrics } = await run('economy');
    for (const [, p] of Object.entries(metrics.participation)) {
      expect(p.tokensLeft).toBeGreaterThanOrEqual(0);
    }
    // **The bound on drafts is not the grant, and since Q1440 it is nowhere
    // near one** (2026-09-18). This test asserted `drafts <= 14` — grant 4
    // plus up to ten drips — on the reasoning that a stake leaves the wallet
    // and only some of it comes back. §7's refund is a *performance* refund,
    // `stake × min(w/0.5, 1.5)`, so a candidate the room ever rated above the
    // current text pays its stake back whole or better; before Q1440 that
    // hardly mattered, because a losing candidate stayed in the field until
    // T=0 and its author's token stayed in it. Now it is closed the moment
    // the room has refused it, the stake comes back and the same persona
    // proposes again: this run goes from 14 candidates to 413, of which 262
    // adopt, and 412.11 of the 413 staked tokens are refunded. **Nobody mints
    // tokens and no ledger goes negative — §7's own invariant is intact — but
    // drafting is no longer bounded by the grant at all.** That is a finding
    // for the record rather than a number to re-pin, so what is asserted here
    // is the invariant itself plus the shape of the run, and a change back to
    // a bounded regime shows up as a red test rather than as silence.
    expect(session.allCandidates().length).toBeGreaterThan(14);
    const refunded = session.allCandidates()
      .reduce((a, c) => a + (c.exit?.refund ?? 0), 0);
    expect(refunded).toBeLessThanOrEqual(session.allCandidates().length * 1.5);
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

describe('the cap calibration (SPEC §4.2, R-051)', () => {
  it('no fit in a simulated room reaches the iteration cap', async () => {
    const { clubhouseScenario } = await import('../src/clubhouse.js');
    stops.length = 0;
    // the alpha operating point, founded from the preset's own numbers rather
    // than a copy of them: three fixed seeds, because this is calibration and
    // not coverage, and `sim.test.ts` runs on 30–60 second timeouts
    const scenario = { ...clubhouseScenario,
      personas: clubhouseScenario.personas.slice(0, ALPHA_PRESET_CELL.roster) };
    for (let i = 0; i < 3; i++) {
      await runSession({
        scenario,
        windowMs: ALPHA_PRESET_CELL.minutes * MINUTES,
        seed: `preset-${i}`,
        constitutionOverrides: ALPHA_PRESET_OVERRIDES,
        makePersona: (profile, rng) => new ScriptedPersona(profile, scenario, rng),
      });
    }
    // and the long room the rest of this file runs, which produces far more
    // evidence per race and is where a cap would bite first
    await run('cap-calibration');

    // **The count is what makes this a test.** If the mock ever stops
    // intercepting — a path that resolves differently, a future build step —
    // the assertion below passes over zero observations and this becomes a
    // green line that checks nothing.
    expect(stops.length).toBeGreaterThan(50);
    // `no-ascent` IS convergence here (perfect separation is the ordinary
    // case), so the cap is the one stop that means the optimiser was cut off
    // with the gradient still moving
    expect(stops.filter((s) => s === 'max-iterations')).toEqual([]);
  }, 120_000);
});
