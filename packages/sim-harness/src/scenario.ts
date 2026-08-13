/**
 * Scenarios: the sim's ground truth.
 *
 * A scenario is a starting document whose lines belong to issues; each
 * issue has alternatives (the incumbent text plus possible rewrites),
 * and each alternative has a latent position (where it sits in opinion
 * space) and quality (craft, clarity — position-independent appeal).
 * Personas hold per-issue stances and salience weights; utility of an
 * alternative = quality − distance(stance, position). That latent model
 * drives scripted personas deterministically and gives every run a
 * measurable welfare outcome no live cohort could provide.
 */

export interface Alternative {
  /** Exact line text; matching final text back to alternatives keys on this. */
  text: string;
  /** Opinion-space coordinate for this issue, in [-1, 1]. */
  position: number;
  /** Position-independent appeal, in [0, 1]. */
  quality: number;
  /** Rationale a scripted persona pins when proposing this. */
  rationale: string;
}

export interface Issue {
  key: string;
  /** Line index in the starting document this issue occupies. */
  line: number;
  /** alternatives[0] is the incumbent text. */
  alternatives: Alternative[];
}

export interface PersonaProfile {
  id: string;
  handle: string;
  /** One-line self-description; the LLM persona system prompt uses it. */
  temperament: string;
  /** stance per issue key, in [-1, 1]. */
  stances: Record<string, number>;
  /** How much each issue matters to this persona, in (0, 1]. */
  salience: Record<string, number>;
  /** Judgment noise (std dev of utility perturbation). */
  noise: number;
  /** Probability of drafting when unhappy and funded, per bout. */
  draftiness: number;
  /** Cards judged per bout. */
  boutCards: number;
  /** Mean gap between bouts, ms of simulated time. */
  boutGapMs: number;
  /** Mean seconds per card (simulated). */
  cardSeconds: number;
}

export interface Scenario {
  name: string;
  text: string;
  issues: Issue[];
  personas: PersonaProfile[];
}

/** Utility of an alternative to a persona (higher is better). */
export function utility(p: PersonaProfile, issueKey: string, alt: Alternative): number {
  const stance = p.stances[issueKey] ?? 0;
  return alt.quality - Math.abs(stance - alt.position);
}

/** The utilitarian-best alternative for an issue across a roster. */
export function bestAlternative(scenario: Scenario, issue: Issue): Alternative {
  let best = issue.alternatives[0]!;
  let bestSum = -Infinity;
  for (const alt of issue.alternatives) {
    const sum = scenario.personas.reduce((acc, p) => acc + utility(p, issue.key, alt), 0);
    if (sum > bestSum) {
      bestSum = sum;
      best = alt;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Built-in scenario: a small association charter, five issues, five personas.

const CHARTER_LINES = [
  '# Charter of the Association',
  'Membership is open to anyone who asks.',
  'Decisions are made by whoever turns up.',
  'Meetings happen when someone calls one.',
  'Money is spent by the treasurer as they see fit.',
  'This charter can be changed at any meeting.',
];

export const charterScenario: Scenario = {
  name: 'charter',
  text: CHARTER_LINES.join('\n'),
  issues: [
    {
      key: 'membership',
      line: 1,
      alternatives: [
        { text: CHARTER_LINES[1]!, position: -0.8, quality: 0.3, rationale: '' },
        {
          text: 'Membership is open to anyone vouched for by two existing members.',
          position: 0.7,
          quality: 0.6,
          rationale: 'Vouching keeps the roster accountable without gatekeeping.',
        },
        {
          text: 'Membership is granted by a simple majority vote of existing members.',
          position: 0.2,
          quality: 0.7,
          rationale: 'A vote is legible and fair; vouching favours insiders.',
        },
      ],
    },
    {
      key: 'decisions',
      line: 2,
      alternatives: [
        { text: CHARTER_LINES[2]!, position: -0.9, quality: 0.2, rationale: '' },
        {
          text: 'Decisions are made by consensus, falling back to a two-thirds vote.',
          position: 0.4,
          quality: 0.8,
          rationale: 'Consensus first, but a fallback stops one person blocking everything.',
        },
        {
          text: 'Decisions are made by simple majority of members present.',
          position: -0.1,
          quality: 0.6,
          rationale: 'Simple and fast; supermajorities entrench the status quo.',
        },
      ],
    },
    {
      key: 'meetings',
      line: 3,
      alternatives: [
        { text: CHARTER_LINES[3]!, position: -0.6, quality: 0.3, rationale: '' },
        {
          text: 'Meetings happen on the first Tuesday of each month.',
          position: 0.5,
          quality: 0.7,
          rationale: 'A fixed rhythm beats ad-hoc scheduling.',
        },
      ],
    },
    {
      key: 'money',
      line: 4,
      alternatives: [
        { text: CHARTER_LINES[4]!, position: -0.9, quality: 0.1, rationale: '' },
        {
          text: 'Spending over £100 requires approval at a meeting; the treasurer reports monthly.',
          position: 0.6,
          quality: 0.8,
          rationale: 'Oversight above a threshold; small spending stays nimble.',
        },
        {
          text: 'All spending requires prior approval at a meeting.',
          position: 0.9,
          quality: 0.4,
          rationale: 'Every pound is collective money; approve it collectively.',
        },
      ],
    },
    {
      key: 'amendment',
      line: 5,
      alternatives: [
        { text: CHARTER_LINES[5]!, position: -0.5, quality: 0.3, rationale: '' },
        {
          text: 'This charter can be amended by a two-thirds vote with a week of notice.',
          position: 0.6,
          quality: 0.8,
          rationale: 'Notice plus a supermajority stops ambush amendments.',
        },
      ],
    },
  ],
  personas: [
    {
      id: 'p1',
      handle: 'Ash',
      temperament:
        'A careful proceduralist who wants clear rules, notice periods, and oversight.',
      stances: { membership: 0.6, decisions: 0.5, meetings: 0.6, money: 0.7, amendment: 0.7 },
      salience: { membership: 0.5, decisions: 0.9, meetings: 0.3, money: 0.8, amendment: 0.7 },
      noise: 0.1,
      draftiness: 0.6,
      boutCards: 6,
      boutGapMs: 40 * 60_000,
      cardSeconds: 25,
    },
    {
      id: 'p2',
      handle: 'Bee',
      temperament:
        'An informal, trust-first organiser who dislikes bureaucracy but cares about fairness.',
      stances: { membership: -0.5, decisions: -0.2, meetings: -0.3, money: 0.2, amendment: -0.2 },
      salience: { membership: 0.8, decisions: 0.6, meetings: 0.4, money: 0.4, amendment: 0.3 },
      noise: 0.15,
      draftiness: 0.4,
      boutCards: 5,
      boutGapMs: 70 * 60_000,
      cardSeconds: 15,
    },
    {
      id: 'p3',
      handle: 'Cam',
      temperament:
        'A pragmatist who wants whatever is simplest to run and hates edge-case rules.',
      stances: { membership: 0.1, decisions: -0.1, meetings: 0.4, money: 0.4, amendment: 0.3 },
      salience: { membership: 0.4, decisions: 0.7, meetings: 0.7, money: 0.5, amendment: 0.4 },
      noise: 0.2,
      draftiness: 0.3,
      boutCards: 8,
      boutGapMs: 30 * 60_000,
      cardSeconds: 10,
    },
    {
      id: 'p4',
      handle: 'Dov',
      temperament:
        'A skeptic of concentrated power; wants collective control of money and decisions.',
      stances: { membership: 0.3, decisions: 0.3, meetings: 0.1, money: 0.9, amendment: 0.5 },
      salience: { membership: 0.3, decisions: 0.8, meetings: 0.2, money: 0.9, amendment: 0.6 },
      noise: 0.1,
      draftiness: 0.5,
      boutCards: 4,
      boutGapMs: 90 * 60_000,
      cardSeconds: 30,
    },
    {
      id: 'p5',
      handle: 'Eli',
      temperament:
        'A mostly-lurking member with mild opinions who judges more than they draft.',
      stances: { membership: 0.1, decisions: 0.1, meetings: 0.2, money: 0.3, amendment: 0.2 },
      salience: { membership: 0.3, decisions: 0.4, meetings: 0.5, money: 0.4, amendment: 0.3 },
      noise: 0.25,
      draftiness: 0.1,
      boutCards: 10,
      boutGapMs: 50 * 60_000,
      cardSeconds: 8,
    },
  ],
};
