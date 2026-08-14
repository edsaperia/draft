import { describe, expect, it } from 'vitest';
import { RaceLabeler, type RaceContext } from '../../engine-core/src/index.js';
import { MockOracle, ScriptedOracle, scriptedRaceType } from '../src/oracles.js';

const DOC = [
  '# Charter',
  '',
  '## Meetings',
  'Meetings happen when someone calls one.',
].join('\n');

const context: RaceContext = { documentText: DOC, contested: [{ start: 3, end: 4 }] };
const GROUND = 'Meetings happen when someone calls one.';

const cand = (id: string, text: string) => ({ id, text, rationale: '' });

describe('ScriptedOracle race descriptions (deterministic, no network)', () => {
  const oracle = new ScriptedOracle();

  it('names from the nearest heading when the document has one', async () => {
    const description = await oracle.describeRace(
      GROUND,
      [cand('c1', 'Meetings happen monthly, first Tuesday.')],
      context,
    );
    expect(description?.name).toBe('Meetings');
  });

  it('falls back to a ground excerpt on a heading-less document', async () => {
    const description = await oracle.describeRace(GROUND, [cand('c1', 'Different.')], {
      documentText: GROUND,
      contested: [{ start: 0, end: 1 }],
    });
    expect(description?.name).toBe(GROUND); // short enough to survive untruncated
  });

  it('has no opinion on an empty candidate set', async () => {
    expect(await oracle.describeRace(GROUND, [], context)).toBeNull();
  });

  it('is deterministic: identical inputs, identical description', async () => {
    const candidates = [cand('c1', 'Meetings happen monthly, first Tuesday.')];
    const first = await oracle.describeRace(GROUND, candidates, context);
    const second = await oracle.describeRace(GROUND, candidates, context);
    expect(second).toEqual(first);
  });
});

describe('scriptedRaceType heuristic', () => {
  it('typo-distance rewrites are copy-edits', () => {
    expect(
      scriptedRaceType(GROUND, [
        cand('c1', 'Meetings happen when someone calls one'), // dropped period
        cand('c2', 'Meetings happen whenever someone calls one.'),
      ]),
    ).toBe('copy-edit');
  });

  it('a same-shape rewrite of the meaning is substantive', () => {
    expect(
      scriptedRaceType(GROUND, [
        cand('c1', 'Meetings happen on the first Tuesday of each month.'),
      ]),
    ).toBe('substantive');
  });

  it('insertions, deletions, and line-count changes are structural', () => {
    expect(scriptedRaceType('', [cand('c1', '## Quiet Hours')])).toBe('structural');
    expect(scriptedRaceType(GROUND, [cand('c1', '')])).toBe('structural');
    expect(
      scriptedRaceType(GROUND, [cand('c1', 'Meetings happen monthly.\nMinutes are kept.')]),
    ).toBe('structural');
  });

  it('editing a heading line is structural', () => {
    expect(scriptedRaceType('## Meetings', [cand('c1', '## Gatherings')])).toBe('structural');
  });

  it('the weightiest change present wins across mixed candidates', () => {
    // One typo fix, one two-line restructure: structural.
    expect(
      scriptedRaceType(GROUND, [
        cand('c1', 'Meetings happen when someone calls one'),
        cand('c2', 'Meetings happen monthly.\nMinutes are kept.'),
      ]),
    ).toBe('structural');
    // One typo fix, one rewrite: substantive (not every candidate is a typo fix).
    expect(
      scriptedRaceType(GROUND, [
        cand('c1', 'Meetings happen when someone calls one'),
        cand('c2', 'Meetings are abolished entirely, forever.'),
      ]),
    ).toBe('substantive');
  });
});

describe('transports through the RaceLabeler', () => {
  const race = { id: 'r:c1', members: ['c1'], contested: [{ start: 3, end: 4 }] };

  it('a ScriptedOracle label is stored and served as advisory metadata', async () => {
    const labeler = new RaceLabeler(new ScriptedOracle());
    const label = await labeler.refresh(race, DOC, [
      cand('c1', 'Meetings happen on the first Tuesday of each month.'),
    ]);
    expect(label).toEqual({ name: 'Meetings', type: 'substantive', source: 'oracle' });
    expect(labeler.labelFor(race, DOC)).toEqual(label);
  });

  it('a MockOracle describe rule surfaces; its default is no opinion', async () => {
    const ruled = new RaceLabeler(
      new MockOracle(undefined, () => ({ name: 'meeting cadence', type: 'substantive' })),
    );
    expect((await ruled.refresh(race, DOC, [cand('c1', 'x')])).name).toBe('meeting cadence');

    const silent = new RaceLabeler(new MockOracle());
    const label = await silent.refresh(race, DOC, [cand('c1', 'x')]);
    expect(label.source).toBe('fallback'); // nearest-heading + excerpt fallback
    expect(label.type).toBeNull();
  });
});
