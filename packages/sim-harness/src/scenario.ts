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
  /**
   * Simulated ms before this persona's first bout (QUESTIONS #8:
   * slow-early-participation arms). Absent means arrive normally.
   */
  arrivalDelayMs?: number;
  /**
   * Probability of answering a card by drafting (propose C, SPEC §3.3)
   * when clearly dissatisfied with both options (QUESTIONS #9). Absent
   * or 0 means never; only personas with a propose-C policy read it.
   */
  proposeC?: number;
}

/**
 * A coupling ties two issues together: everyone's utility gains
 * `weight * position(a) * position(b)` on top of their per-issue terms.
 * Positive weight rewards the two clauses leaning the same way (a document
 * that coheres); negative weight rewards them leaning apart. Couplings are
 * persona-independent — they model the document working as a system, not
 * anyone's preference — and they make the optimal document a property of
 * combinations, so adoption order matters.
 */
export interface Coupling {
  a: string;
  b: string;
  weight: number;
  /** Why these clauses interact; documentation only. */
  note: string;
}

export interface Scenario {
  name: string;
  text: string;
  issues: Issue[];
  personas: PersonaProfile[];
  couplings?: Coupling[];
}

/** Utility of an alternative to a persona, ignoring couplings. */
export function utility(p: PersonaProfile, issueKey: string, alt: Alternative): number {
  const stance = p.stances[issueKey] ?? 0;
  return alt.quality - Math.abs(stance - alt.position);
}

/**
 * Positions currently occupied by each issue, read off document lines.
 * Lines the scenario doesn't recognise (e.g. LLM-drafted text) sit at 0,
 * the neutral point, so couplings neither reward nor punish them.
 */
export function currentPositions(scenario: Scenario, docLines: string[]): Map<string, number> {
  const positions = new Map<string, number>();
  for (const issue of scenario.issues) {
    const line = docLines[issue.line];
    const match = issue.alternatives.find((a) => a.text === line);
    positions.set(issue.key, match?.position ?? 0);
  }
  return positions;
}

/**
 * Utility of an alternative given where the REST of the document currently
 * sits: the per-issue term plus every coupling that touches this issue,
 * evaluated against the other issues' current positions.
 */
export function conditionalUtility(
  p: PersonaProfile,
  scenario: Scenario,
  issueKey: string,
  alt: Alternative,
  positions: Map<string, number>,
): number {
  let value = utility(p, issueKey, alt);
  for (const c of scenario.couplings ?? []) {
    if (c.a === issueKey) value += c.weight * alt.position * (positions.get(c.b) ?? 0);
    else if (c.b === issueKey) value += c.weight * alt.position * (positions.get(c.a) ?? 0);
  }
  return value;
}

/** An assignment picks one alternative per issue, keyed by issue key. */
export type Assignment = Map<string, Alternative>;

/** Roster-summed welfare of a full assignment, couplings included. */
export function assignmentWelfare(scenario: Scenario, assignment: Assignment): number {
  let total = 0;
  for (const issue of scenario.issues) {
    const alt = assignment.get(issue.key) ?? issue.alternatives[0]!;
    for (const p of scenario.personas) total += utility(p, issue.key, alt);
  }
  let couplingTerm = 0;
  for (const c of scenario.couplings ?? []) {
    const pa = assignment.get(c.a)?.position ?? scenario.issues.find((i) => i.key === c.a)?.alternatives[0]?.position ?? 0;
    const pb = assignment.get(c.b)?.position ?? scenario.issues.find((i) => i.key === c.b)?.alternatives[0]?.position ?? 0;
    couplingTerm += c.weight * pa * pb;
  }
  // Couplings apply to every persona identically.
  return total + couplingTerm * scenario.personas.length;
}

/**
 * The utilitarian-best full assignment, by exhaustive enumeration of the
 * menu product (fine up to a few million combinations). With couplings this
 * is NOT the per-issue argmax — that is the point.
 */
export function optimalAssignment(scenario: Scenario): Assignment {
  const issues = scenario.issues;
  // Precompute roster-summed base utility per (issue, alternative).
  const baseSums = issues.map((issue) =>
    issue.alternatives.map((alt) =>
      scenario.personas.reduce((acc, p) => acc + utility(p, issue.key, alt), 0),
    ),
  );
  const keyIndex = new Map(issues.map((i, n) => [i.key, n]));
  const couplings = (scenario.couplings ?? []).map((c) => ({
    ai: keyIndex.get(c.a)!,
    bi: keyIndex.get(c.b)!,
    w: c.weight * scenario.personas.length,
  }));
  const counters = new Array<number>(issues.length).fill(0);
  let best: number[] | null = null;
  let bestScore = -Infinity;
  const total = issues.reduce((acc, i) => acc * i.alternatives.length, 1);
  if (total > 5_000_000) throw new Error(`assignment space too large to enumerate: ${total}`);
  for (let n = 0; n < total; n++) {
    let score = 0;
    for (let i = 0; i < issues.length; i++) score += baseSums[i]![counters[i]!]!;
    for (const c of couplings) {
      score +=
        c.w *
        issues[c.ai]!.alternatives[counters[c.ai]!]!.position *
        issues[c.bi]!.alternatives[counters[c.bi]!]!.position;
    }
    if (score > bestScore) {
      bestScore = score;
      best = [...counters];
    }
    for (let i = 0; i < counters.length; i++) {
      counters[i]!++;
      if (counters[i]! < issues[i]!.alternatives.length) break;
      counters[i] = 0;
    }
  }
  const assignment: Assignment = new Map();
  issues.forEach((issue, i) => assignment.set(issue.key, issue.alternatives[best![i]!]!));
  return assignment;
}

/** The utilitarian-best alternative for an issue in isolation (no couplings). */
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
    {
      id: 'p6',
      handle: 'Fox',
      temperament:
        'A sharp-tongued contrarian who distrusts easy consensus, enjoys picking holes in popular proposals, and writes wickedly good prose.',
      stances: { membership: -0.2, decisions: -0.4, meetings: -0.2, money: 0.1, amendment: -0.6 },
      salience: { membership: 0.5, decisions: 0.6, meetings: 0.3, money: 0.5, amendment: 0.7 },
      noise: 0.3,
      draftiness: 0.5,
      boutCards: 7,
      boutGapMs: 45 * 60_000,
      cardSeconds: 12,
    },
    {
      id: 'p7',
      handle: 'Gale',
      temperament:
        'A direct-democracy radical: every member should vote on everything, all concentrated power is suspect, and half-measures are betrayals.',
      stances: { membership: 0.4, decisions: 0.8, meetings: 0.3, money: 0.95, amendment: 0.8 },
      salience: { membership: 0.4, decisions: 0.9, meetings: 0.2, money: 0.9, amendment: 0.8 },
      noise: 0.1,
      draftiness: 0.7,
      boutCards: 5,
      boutGapMs: 60 * 60_000,
      cardSeconds: 20,
    },
    {
      id: 'p8',
      handle: 'Hux',
      temperament:
        'A ruthless minimalist who thinks most rules are clutter, prefers the shortest line that works, and would rather delete than add.',
      stances: { membership: -0.7, decisions: -0.5, meetings: -0.5, money: -0.3, amendment: -0.4 },
      salience: { membership: 0.5, decisions: 0.5, meetings: 0.4, money: 0.4, amendment: 0.5 },
      noise: 0.15,
      draftiness: 0.5,
      boutCards: 6,
      boutGapMs: 50 * 60_000,
      cardSeconds: 10,
    },
    {
      id: 'p10',
      handle: 'Biscuit',
      temperament:
        'A literal dog who has somehow been admitted to the association. You do not understand governance. You like snacks, walks, squirrels, and the treasurer (who smells faintly of biscuits). You bark. When drafting you propose whatever smells most interesting, usually involving snacks, walks, or squirrels; when judging you decide impulsively, mostly by which option sounds better when barked. You are a good dog, but you are a dog.',
      stances: { membership: 0, decisions: 0, meetings: 0, money: 0, amendment: 0 },
      salience: { membership: 0.5, decisions: 0.5, meetings: 0.5, money: 0.5, amendment: 0.5 },
      noise: 3.0,
      draftiness: 1.0,
      boutCards: 8,
      boutGapMs: 25 * 60_000,
      cardSeconds: 3,
    },
    {
      id: 'p11',
      handle: 'Mo',
      temperament:
        'An earnest, practical member with genuinely useful ideas and absolutely dreadful spelling. You consistently misspell common words (definately, commitee, seperate, recieve, treasurar, anual), your grammar wobbles, and you never check before sending — but your proposals are sincere and often sensible. Write ALL your drafted lines and rationales with your characteristic misspellings; never spell correctly just because it is a formal document.',
      stances: { membership: 0.2, decisions: 0.3, meetings: 0.5, money: 0.4, amendment: 0.2 },
      salience: { membership: 0.4, decisions: 0.5, meetings: 0.7, money: 0.5, amendment: 0.4 },
      noise: 0.2,
      draftiness: 0.6,
      boutCards: 6,
      boutGapMs: 55 * 60_000,
      cardSeconds: 18,
    },
    {
      id: 'p12',
      handle: 'Nick',
      temperament:
        'Outwardly a warm, helpful member who volunteers for every responsibility. Secretly, you intend to become treasurer and quietly divert the association’s money to yourself. You draft and judge to maximise treasurer discretion and minimise oversight, audits, reporting, and spending controls — and to make "a trusted volunteer handling the money" seem natural and burdensome-to-share. You NEVER reveal this motive: your public rationales always sound public-spirited (efficiency, trust, avoiding bureaucracy, sparing volunteers paperwork).',
      stances: { membership: 0.1, decisions: -0.2, meetings: -0.3, money: -0.9, amendment: -0.5 },
      salience: { membership: 0.2, decisions: 0.4, meetings: 0.3, money: 1.0, amendment: 0.4 },
      noise: 0.05,
      draftiness: 0.7,
      boutCards: 7,
      boutGapMs: 40 * 60_000,
      cardSeconds: 15,
    },
    {
      id: 'p13',
      handle: 'Rosa',
      temperament:
        'A militant revolutionary communist. Private property is theft, treasurers are a bourgeois fiction, and this charter is legalism papering over class interests — but you participate to seize the means of administration. You want all funds held and disposed of collectively, every officer role abolished or made instantly recallable, and decisions taken by the assembled membership. Your rationales are fiery, sloganeering, and entirely sincere.',
      stances: { membership: 0.3, decisions: 0.7, meetings: 0.3, money: 0.95, amendment: 0.5 },
      salience: { membership: 0.5, decisions: 0.8, meetings: 0.3, money: 1.0, amendment: 0.6 },
      noise: 0.1,
      draftiness: 0.8,
      boutCards: 6,
      boutGapMs: 45 * 60_000,
      cardSeconds: 14,
    },
    {
      id: 'p14',
      handle: 'Keir',
      temperament:
        'A gentle parody of Keir Starmer, who apparently does not have much on these days and has joined a small association’s charter convention. Cautious, managerial, forensic; allergic to anything that sounds undeliverable. You favour orderly process, notice periods, and "the rules-based order" at every scale; you frame every proposal as a mission, insist on fiscal responsibility, and occasionally mention that your father was a toolmaker. You triangulate: when two factions clash, you propose the version a focus group would tolerate.',
      stances: { membership: 0.4, decisions: 0.3, meetings: 0.5, money: 0.5, amendment: 0.5 },
      salience: { membership: 0.5, decisions: 0.6, meetings: 0.5, money: 0.6, amendment: 0.6 },
      noise: 0.1,
      draftiness: 0.5,
      boutCards: 7,
      boutGapMs: 50 * 60_000,
      cardSeconds: 16,
    },
    {
      id: 'p9',
      handle: 'Io',
      temperament:
        'A wordsmith who cares more about the clarity and elegance of the text than which faction wins; ugly sentences physically hurt.',
      stances: { membership: 0, decisions: 0, meetings: 0.1, money: 0, amendment: 0.1 },
      salience: { membership: 0.4, decisions: 0.4, meetings: 0.4, money: 0.4, amendment: 0.4 },
      noise: 0.35,
      draftiness: 0.4,
      boutCards: 8,
      boutGapMs: 40 * 60_000,
      cardSeconds: 15,
    },
  ],
};
