/**
 * Tests for the deferred-questions evidence machinery (QUESTIONS #8, #9,
 * #10, #13): propose-C personas, roster events, the token audit, and the
 * care-map variants. All scripted and deterministic.
 */

import { describe, expect, it } from 'vitest';
import { ScriptedPersona } from '../src/persona.js';
import { ProposeCPersona } from '../src/propose-c-persona.js';
import { charterScenario, type Scenario } from '../src/scenario.js';
import { clubhouseScenario } from '../src/clubhouse.js';
import { careMapScenario, computeCareMap, truthIndifference } from '../src/care-map.js';
import { auditTokens } from '../src/token-audit.js';
import { runSession } from '../src/runner.js';

const HOURS = 3600_000;

const slice8: Scenario = {
  ...clubhouseScenario,
  name: 'clubhouse-8',
  personas: clubhouseScenario.personas.slice(0, 8),
};

describe('propose-C personas (QUESTIONS #9)', () => {
  const run = (propensity: number) => {
    const scenario: Scenario = {
      ...slice8,
      personas: slice8.personas.map((p) => ({ ...p, proposeC: propensity })),
    };
    return runSession({
      scenario,
      windowMs: 8 * HOURS,
      seed: 'propose-c-test',
      makePersona: (profile, rng) => new ProposeCPersona(profile, scenario, rng),
    });
  };

  it('a positive propensity produces composer entries and C-drafts, deterministically', async () => {
    const a = await run(0.8);
    const b = await run(0.8);
    expect(a.session.rollingHash()).toBe(b.session.rollingHash());
    const entries = a.session.log.filter((l) => l.event.type === 'composer-opened');
    expect(entries.length).toBeGreaterThan(0);
    // Every composer entry carries the forfeited pair (SPEC §3.3).
    for (const l of entries) {
      const e = l.event as Extract<typeof l.event, { type: 'composer-opened' }>;
      expect(e.forfeited).toBeDefined();
    }
  }, 60_000);

  it('propensity 0 never opens the composer', async () => {
    const { session } = await run(0);
    expect(session.log.filter((l) => l.event.type === 'composer-opened')).toHaveLength(0);
  }, 60_000);
});

describe('roster events (QUESTIONS #10, SPEC §9.3)', () => {
  const rosa = clubhouseScenario.personas.find((p) => p.id === 'p13')!;

  it('a mid-session joiner participates and a removed member stops, deterministically', async () => {
    const go = () =>
      runSession({
        scenario: slice8,
        windowMs: 8 * HOURS,
        seed: 'roster-test',
        rosterEvents: [
          { atMs: 4 * HOURS, kind: 'join', profile: rosa },
          { atMs: 4 * HOURS, kind: 'remove', participantId: 'p5' },
        ],
        makePersona: (profile, rng) => new ScriptedPersona(profile, slice8, rng),
      });
    const a = await go();
    const b = await go();
    expect(a.session.rollingHash()).toBe(b.session.rollingHash());

    // Joiner acted; the log records both convenor acts.
    expect(a.metrics.participation['p13']!.judgments).toBeGreaterThan(0);
    const types = a.session.log.map((l) => l.event.type);
    expect(types).toContain('participant-added');
    expect(types).toContain('participant-removed');

    // The removed member casts nothing after removal.
    const removedSeq = a.session.log.find(
      (l) => l.event.type === 'participant-removed',
    )!.seq;
    const after = a.session.log
      .slice(removedSeq + 1)
      .filter(
        (l) => 'participantId' in l.event && l.event.participantId === 'p5',
      );
    expect(after).toHaveLength(0);
  }, 60_000);

  it('no roster events leaves the run byte-identical to the plain path', async () => {
    const go = (withEmpty: boolean) =>
      runSession({
        scenario: charterScenario,
        windowMs: 24 * HOURS,
        seed: 'roster-inert',
        ...(withEmpty ? { rosterEvents: [] } : {}),
        makePersona: (profile, rng) => new ScriptedPersona(profile, charterScenario, rng),
      });
    const a = await go(false);
    const b = await go(true);
    expect(a.session.rollingHash()).toBe(b.session.rollingHash());
  }, 60_000);
});

describe('token audit (QUESTIONS #8)', () => {
  it('replays ledgers to the exact session balances and cross-checks', async () => {
    const { session } = await runSession({
      scenario: charterScenario,
      windowMs: 24 * HOURS,
      seed: 'audit-test',
      makePersona: (profile, rng) => new ScriptedPersona(profile, charterScenario, rng),
    });
    const audit = auditTokens(session, [12 * HOURS]);
    expect(audit.consistent).toBe(true);
    for (const p of charterScenario.personas) {
      const a = audit.perParticipant.get(p.id)!;
      expect(a.finalBalance).toBeCloseTo(
        session.balance(p.id, session.constitution.windowEndMs),
        9,
      );
      expect(a.snapshots.has(12 * HOURS)).toBe(true);
      expect(a.wastedDrip).toBeGreaterThanOrEqual(0);
    }
  }, 60_000);
});

describe('care-map variants (QUESTIONS #13)', () => {
  it('the oracle calls the engineered issues correctly', () => {
    // motto/newsletter: everyone indifferent across the whole menu.
    expect(truthIndifference(careMapScenario, 'motto', 'all')).toBe(1);
    expect(truthIndifference(careMapScenario, 'newsletter', 'all')).toBe(1);
    // chair: nobody is indifferent to a 0.8 quality jump.
    expect(truthIndifference(careMapScenario, 'chair', 'all')).toBe(0);
    // archive: the rival pair is a tie for the four midpoint personas
    // only; incumbent-involving pairs are ties for nobody.
    expect(truthIndifference(careMapScenario, 'archive', 'incumbent')).toBe(0);
    expect(truthIndifference(careMapScenario, 'archive', 'all')).toBeCloseTo(4 / 24, 9);
  });

  it('a run produces attributable indifference under both variants', async () => {
    const { session } = await runSession({
      scenario: careMapScenario,
      windowMs: 8 * HOURS,
      seed: 'care-test',
      makePersona: (profile, rng) => new ScriptedPersona(profile, careMapScenario, rng),
    });
    const rows = computeCareMap(session, careMapScenario);
    expect(rows.map((r) => r.issue)).toEqual(
      careMapScenario.issues.map((i) => i.key),
    );
    const totalJudged = rows.reduce((a, r) => a + r.allN, 0);
    expect(totalJudged).toBeGreaterThan(20);
    // Variant (b) can only see more than variant (a), never less.
    for (const r of rows) {
      expect(r.allN).toBeGreaterThanOrEqual(r.incN);
      expect(r.allTies).toBeGreaterThanOrEqual(r.incTies);
    }
  }, 60_000);
});
