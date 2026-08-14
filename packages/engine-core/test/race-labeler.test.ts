import { describe, expect, it } from 'vitest';
import {
  RaceLabeler,
  contestedText,
  excerptOf,
  fallbackRaceLabel,
  nearestHeading,
  type LabelableRace,
} from '../src/race-labeler.js';
import type {
  OracleCandidate,
  RaceContext,
  RaceDescription,
  SemanticOracle,
} from '../src/oracle.js';

const DOC = [
  '# Clubhouse Charter',
  '',
  '## Meetings',
  'Meetings happen when someone calls one.',
  'Minutes are optional.',
  '',
  '## Money',
  'Dues are five pounds a month.',
].join('\n');

const HEADINGLESS = [
  'Meetings happen when someone calls one.',
  'Dues are five pounds a month.',
].join('\n');

const race: LabelableRace = {
  id: 'r:c1',
  members: ['c1', 'c2'],
  contested: [{ start: 3, end: 4 }],
};

const candidates: OracleCandidate[] = [
  {
    id: 'c1',
    text: 'Meetings happen on the first Tuesday of each month.',
    rationale: 'A fixed rhythm beats ad-hoc scheduling.',
  },
  {
    id: 'c2',
    text: 'Meetings happen only when a member demands one in writing.',
    rationale: 'Meetings are a cost; make them prove themselves.',
  },
];

/** Inline oracle stub with a describeRace capability (cf. dedup-gate tests). */
function describeOracle(
  answer: RaceDescription | null | (() => RaceDescription | null),
): SemanticOracle & { calls: number; lastGround?: string; lastContext?: RaceContext } {
  return {
    calls: 0,
    async checkEquivalence() {
      return { duplicateOf: null, confidence: 0, reason: 'stub' };
    },
    async describeRace(groundText, _candidates, context) {
      this.calls++;
      this.lastGround = groundText;
      this.lastContext = context;
      return typeof answer === 'function' ? answer() : answer;
    },
  };
}

/** Phase-1 oracle: checkEquivalence only, no describeRace capability. */
const equivalenceOnly: SemanticOracle = {
  async checkEquivalence() {
    return { duplicateOf: null, confidence: 0, reason: 'stub' };
  },
};

describe('deterministic fallback primitives', () => {
  it('finds the nearest heading above the contested span', () => {
    expect(nearestHeading(DOC, [{ start: 3, end: 4 }])).toBe('Meetings');
    expect(nearestHeading(DOC, [{ start: 7, end: 8 }])).toBe('Money');
  });

  it('a heading on the span start line counts as nearest', () => {
    expect(nearestHeading(DOC, [{ start: 6, end: 7 }])).toBe('Money');
  });

  it('returns null on a heading-less document or empty footprint', () => {
    expect(nearestHeading(HEADINGLESS, [{ start: 1, end: 2 }])).toBeNull();
    expect(nearestHeading(DOC, [])).toBeNull();
  });

  it('clamps an insertion at end-of-document into range', () => {
    const lines = DOC.split('\n').length;
    expect(nearestHeading(DOC, [{ start: lines, end: lines }])).toBe('Money');
  });

  it('renders multi-span contested text with a gap mark', () => {
    expect(contestedText(DOC, [{ start: 3, end: 4 }, { start: 7, end: 8 }])).toBe(
      'Meetings happen when someone calls one.\n…\nDues are five pounds a month.',
    );
  });

  it('excerpts the first non-empty line, collapsed and truncated', () => {
    expect(excerptOf('\n  Dues are   five pounds. \nMore.')).toBe('Dues are five pounds.');
    const long = 'x'.repeat(100);
    expect(excerptOf(long, 20)).toHaveLength(20);
    expect(excerptOf(long, 20).endsWith('…')).toBe(true);
  });
});

describe('fallbackRaceLabel', () => {
  it('combines nearest heading and ground excerpt, with no type opinion', () => {
    expect(fallbackRaceLabel(DOC, race.contested)).toEqual({
      name: 'Meetings — “Meetings happen when someone calls one.”',
      type: null,
      source: 'fallback',
    });
  });

  it('stands on the excerpt alone for a heading-less document', () => {
    expect(fallbackRaceLabel(HEADINGLESS, [{ start: 1, end: 2 }]).name).toBe(
      '“Dues are five pounds a month.”',
    );
  });

  it('uses the heading alone for an insertion under one', () => {
    // Span [5,5): pure insertion on the blank line under "Meetings".
    expect(fallbackRaceLabel(DOC, [{ start: 5, end: 5 }]).name).toBe('Meetings');
  });

  it('degrades to a line position for an insertion into a heading-less document', () => {
    expect(fallbackRaceLabel(HEADINGLESS, [{ start: 2, end: 2 }]).name).toBe('line 3');
  });
});

describe('RaceLabeler', () => {
  it('serves the fallback when no oracle is configured', async () => {
    const labeler = new RaceLabeler();
    const label = labeler.labelFor(race, DOC);
    expect(label.source).toBe('fallback');
    expect(label.type).toBeNull();
    expect(await labeler.refresh(race, DOC, candidates)).toEqual(label);
  });

  it('serves the fallback when the oracle lacks the describeRace capability', async () => {
    const labeler = new RaceLabeler(equivalenceOnly);
    const label = await labeler.refresh(race, DOC, candidates);
    expect(label.source).toBe('fallback');
  });

  it('stores a well-formed oracle label and serves it from then on', async () => {
    const oracle = describeOracle({ name: 'meeting cadence', type: 'substantive' });
    const labeler = new RaceLabeler(oracle);
    const refreshed = await labeler.refresh(race, DOC, candidates);
    expect(refreshed).toEqual({
      name: 'meeting cadence',
      type: 'substantive',
      source: 'oracle',
    });
    // labelFor is sync and serves the stored advisory label.
    expect(labeler.labelFor(race, DOC)).toEqual(refreshed);
    expect(oracle.calls).toBe(1);
  });

  it('hands the oracle the contested ground text and its location', async () => {
    const oracle = describeOracle({ name: 'meeting cadence', type: 'substantive' });
    const labeler = new RaceLabeler(oracle);
    await labeler.refresh(race, DOC, candidates);
    expect(oracle.lastGround).toBe('Meetings happen when someone calls one.');
    expect(oracle.lastContext?.documentText).toBe(DOC);
    expect(oracle.lastContext?.contested).toEqual([{ start: 3, end: 4 }]);
  });

  it('an oracle failure degrades to the fallback and never throws', async () => {
    const oracle = describeOracle(() => {
      throw new Error('transport down');
    });
    const labeler = new RaceLabeler(oracle);
    const label = await labeler.refresh(race, DOC, candidates);
    expect(label.source).toBe('fallback');
    expect(oracle.calls).toBe(1);
  });

  it('a failed refresh never removes an existing stored label', async () => {
    let fail = false;
    const oracle = describeOracle(() => {
      if (fail) throw new Error('transport down');
      return { name: 'meeting cadence', type: 'substantive' };
    });
    const labeler = new RaceLabeler(oracle);
    const first = await labeler.refresh(race, DOC, candidates);
    fail = true;
    expect(await labeler.refresh(race, DOC, candidates)).toEqual(first);
  });

  it('rejects a malformed oracle answer (empty name or unknown type)', async () => {
    const blank = new RaceLabeler(describeOracle({ name: '   ', type: 'substantive' }));
    expect((await blank.refresh(race, DOC, candidates)).source).toBe('fallback');
    const badType = new RaceLabeler(
      describeOracle({ name: 'meeting cadence', type: 'editorial' as never }),
    );
    expect((await badType.refresh(race, DOC, candidates)).source).toBe('fallback');
    const noOpinion = new RaceLabeler(describeOracle(null));
    expect((await noOpinion.refresh(race, DOC, candidates)).source).toBe('fallback');
  });

  it('drops a stored label when the race membership changes', async () => {
    const oracle = describeOracle({ name: 'meeting cadence', type: 'substantive' });
    const labeler = new RaceLabeler(oracle);
    await labeler.refresh(race, DOC, candidates);
    const grown: LabelableRace = { ...race, members: ['c1', 'c2', 'c3'] };
    // The old name may describe a different dispute now: fallback until re-labeled.
    expect(labeler.labelFor(grown, DOC).source).toBe('fallback');
  });

  it('sanitizes oracle names: whitespace collapsed, length capped', async () => {
    const oracle = describeOracle({
      name: '  meeting \n  cadence   and a very long tail of words  ',
      type: 'copy-edit',
    });
    const labeler = new RaceLabeler(oracle, { nameMaxChars: 20 });
    const label = await labeler.refresh(race, DOC, candidates);
    expect(label.name.length).toBeLessThanOrEqual(20);
    expect(label.name.startsWith('meeting cadence')).toBe(true);
    expect(label.name.endsWith('…')).toBe(true);
  });
});
