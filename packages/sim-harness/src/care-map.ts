/**
 * Care-map evidence (SPEC §3.2, QUESTIONS #13): the care map is built
 * from indifference, and the open question is which indifference counts —
 * (a) only judgments on incumbent-involving pairs, or (b) all judgments
 * in the race, rival pairs included. This module computes BOTH variants
 * per issue from a run's log, plus a ground-truth oracle from the
 * scripted personas' known utility models, so the variants can be scored
 * against what the roster actually doesn't care about.
 *
 * Also here: `careMapScenario`, a document engineered with heterogeneous
 * care — spans nobody minds about (pure rewording), spans half the room
 * minds about (camp splits with an indifferent other half), and spans
 * everybody minds about — so the two variants have room to disagree.
 */

import type { Session } from '../../engine-core/src/index.js';
import { TIE_THRESHOLD } from './persona.js';
import { utility, type Scenario } from './scenario.js';

export interface CareMapIssueRow {
  issue: string;
  /** Variant (a): ties / judgments on incumbent-involving pairs. */
  incTies: number;
  incN: number;
  /** Variant (b): ties / all edge judgments in the issue's race. */
  allTies: number;
  allN: number;
  /**
   * Ground truth: share of (persona, alternative-pair) combinations the
   * utility model calls indifferent (|Δu| < tie threshold, couplings and
   * noise excluded), over every pair in the issue's menu.
   */
  truthAll: number;
  /** Same oracle restricted to pairs involving the incumbent text. */
  truthInc: number;
}

const INC_PREFIX = 'inc:';

/**
 * Both care-map variants per issue, read off the log. Judgments are
 * attributed to issues by the candidate's submitted line (every scenario
 * here patches whole single lines, so line indices are stable across
 * adoptions). Uses the raw judgment stream — the care map is an ambient
 * heat measure, not a posterior, so superseded judgments still count as
 * moments of expressed indifference.
 */
export function computeCareMap(session: Session, scenario: Scenario): CareMapIssueRow[] {
  const issueOfLine = new Map(scenario.issues.map((i) => [i.line, i.key]));
  const issueOfCandidate = new Map<string, string>();
  const rows = new Map<string, CareMapIssueRow>(
    scenario.issues.map((i) => [
      i.key,
      {
        issue: i.key,
        incTies: 0,
        incN: 0,
        allTies: 0,
        allN: 0,
        truthAll: truthIndifference(scenario, i.key, 'all'),
        truthInc: truthIndifference(scenario, i.key, 'incumbent'),
      },
    ]),
  );

  for (const entry of session.log) {
    const e = entry.event;
    if (e.type === 'candidate-submitted') {
      const line = e.patch.hunks[0]?.start;
      const key = line === undefined ? undefined : issueOfLine.get(line);
      if (key !== undefined) issueOfCandidate.set(e.id, key);
    } else if (e.type === 'comparison' && e.kind === 'edge') {
      const issues = new Set(
        [e.aId, e.bId]
          .filter((id) => !id.startsWith(INC_PREFIX))
          .map((id) => issueOfCandidate.get(id)),
      );
      if (issues.size !== 1) continue; // unattributable or cross-issue
      const [key] = issues;
      const row = key === undefined ? undefined : rows.get(key);
      if (!row) continue;
      const tie = e.outcome === 'tie';
      const involvesIncumbent =
        e.aId.startsWith(INC_PREFIX) || e.bId.startsWith(INC_PREFIX);
      row.allN++;
      if (tie) row.allTies++;
      if (involvesIncumbent) {
        row.incN++;
        if (tie) row.incTies++;
      }
    }
  }
  return scenario.issues.map((i) => rows.get(i.key)!);
}

/**
 * The oracle: how indifferent is the roster about this issue, by the
 * latent utility model? Counts (persona, alternative-pair) combinations
 * with |Δu| below the personas' own tie threshold. `scope` narrows to
 * pairs involving the incumbent (alternatives[0]).
 */
export function truthIndifference(
  scenario: Scenario,
  issueKey: string,
  scope: 'all' | 'incumbent',
): number {
  const issue = scenario.issues.find((i) => i.key === issueKey);
  if (!issue) throw new Error(`unknown issue ${issueKey}`);
  let ties = 0;
  let n = 0;
  for (const p of scenario.personas) {
    for (let i = 0; i < issue.alternatives.length; i++) {
      for (let j = i + 1; j < issue.alternatives.length; j++) {
        if (scope === 'incumbent' && i !== 0) continue;
        n++;
        const du =
          utility(p, issueKey, issue.alternatives[i]!) -
          utility(p, issueKey, issue.alternatives[j]!);
        if (Math.abs(du) < TIE_THRESHOLD) ties++;
      }
    }
  }
  return n === 0 ? 0 : ties / n;
}

/** Spearman rank correlation with average ranks for ties. */
export function spearman(xs: number[], ys: number[]): number {
  if (xs.length !== ys.length || xs.length < 2) return NaN;
  const rank = (vs: number[]): number[] => {
    const idx = vs.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const ranks = new Array<number>(vs.length).fill(0);
    let i = 0;
    while (i < idx.length) {
      let j = i;
      while (j + 1 < idx.length && idx[j + 1]!.v === idx[i]!.v) j++;
      const avg = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) ranks[idx[k]!.i] = avg;
      i = j + 1;
    }
    return ranks;
  };
  const rx = rank(xs);
  const ry = rank(ys);
  const mean = (vs: number[]): number => vs.reduce((a, b) => a + b, 0) / vs.length;
  const mx = mean(rx);
  const my = mean(ry);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let k = 0; k < rx.length; k++) {
    num += (rx[k]! - mx) * (ry[k]! - my);
    dx += (rx[k]! - mx) ** 2;
    dy += (ry[k]! - my) ** 2;
  }
  const den = Math.sqrt(dx * dy);
  return den === 0 ? NaN : num / den;
}

// ---------------------------------------------------------------------------
// The heterogeneous-care scenario: six issues spanning cold to hot.

const H = {
  title: '# The Society Handbook',
  motto: 'The society keeps a motto: do good things well.',
  newsletter: 'The newsletter goes out when there is news.',
  funds: 'Funds are held in the biscuit tin on the shelf.',
  chair: 'The chair is whoever shouts loudest at the annual meeting.',
  archive: 'The archive lives in whichever cupboard has room.',
  snacks: 'Snacks at meetings are whatever turns up.',
};
const H_LINES = Object.values(H);
const hLine = (text: string): number => H_LINES.indexOf(text);

/** Shared bout rhythm defaults; per-persona overrides below. */
const rhythm = (
  draftiness: number,
  boutCards: number,
  boutGapMin: number,
  cardSeconds: number,
) => ({ draftiness, boutCards, boutGapMs: boutGapMin * 60_000, cardSeconds });

export const careMapScenario: Scenario = {
  name: 'care-map',
  text: H_LINES.join('\n'),
  issues: [
    {
      // COLD by design: rewordings with tiny quality deltas and identical
      // positions. Someone will draft them (any positive delta triggers
      // the scripted drafter), and everyone should shrug.
      key: 'motto',
      line: hLine(H.motto),
      alternatives: [
        { text: H.motto, position: 0, quality: 0.5, rationale: '' },
        {
          text: 'The society keeps a motto: make good things, well.',
          position: 0,
          quality: 0.53,
          rationale: 'Slightly snappier wording for the same motto.',
        },
        {
          text: 'Our motto: do good things, and do them well.',
          position: 0,
          quality: 0.52,
          rationale: 'Reads more naturally aloud.',
        },
      ],
    },
    {
      // COLD: same trick, even smaller spread.
      key: 'newsletter',
      line: hLine(H.newsletter),
      alternatives: [
        { text: H.newsletter, position: -0.02, quality: 0.5, rationale: '' },
        {
          text: 'The newsletter goes out whenever there is news to share.',
          position: 0.02,
          quality: 0.52,
          rationale: 'A friendlier sentence, nothing more.',
        },
      ],
    },
    {
      // HOT and CONTESTED: two camps pull opposite ways on real stakes.
      key: 'funds',
      line: hLine(H.funds),
      alternatives: [
        { text: H.funds, position: 0, quality: 0.15, rationale: '' },
        {
          text: 'Funds are kept in a society bank account with two signatories.',
          position: 0.8,
          quality: 0.6,
          rationale: 'Two signatures and a statement beat a tin on a shelf.',
        },
        {
          text: 'Funds stay in cash, spent by whoever ran the last errand, on trust.',
          position: -0.8,
          quality: 0.55,
          rationale: 'The tin works because we trust each other. Keep it human.',
        },
      ],
    },
    {
      // HOT CONSENSUS: a plainly better line everyone prefers.
      key: 'chair',
      line: hLine(H.chair),
      alternatives: [
        { text: H.chair, position: 0, quality: 0.1, rationale: '' },
        {
          text: 'The chair is elected annually at the annual meeting by show of hands.',
          position: 0.1,
          quality: 0.9,
          rationale: 'An election is fairer than a shouting match.',
        },
      ],
    },
    {
      // CAMP SPLIT: half the roster cares and splits; the other half sits
      // at the exact midpoint, indifferent between the rivals — but NOT
      // indifferent to the incumbent, which they mildly prefer. This is
      // where variants (a) and (b) should genuinely diverge.
      key: 'archive',
      line: hLine(H.archive),
      alternatives: [
        { text: H.archive, position: 0, quality: 0.3, rationale: '' },
        {
          text: 'The archive is catalogued and kept in the locked cabinet.',
          position: 0.6,
          quality: 0.55,
          rationale: 'Paper history deserves a lock and a list.',
        },
        {
          text: 'The archive is scanned and kept online, and the paper recycled.',
          position: -0.6,
          quality: 0.55,
          rationale: 'Scans are searchable and cupboards are finite.',
        },
      ],
    },
    {
      // MILD: a small quality bump just above the tie threshold — mostly
      // preferred, sometimes shrugged at under noise.
      key: 'snacks',
      line: hLine(H.snacks),
      alternatives: [
        { text: H.snacks, position: 0, quality: 0.4, rationale: '' },
        {
          text: 'Snacks at meetings rotate alphabetically by surname.',
          position: 0.05,
          quality: 0.5,
          rationale: 'A rota means snacks actually turn up.',
        },
      ],
    },
  ],
  personas: [
    // q1–q4 care about funds (+) and split on archive; q5–q8 sit at the
    // archive midpoint and lean the other way on funds.
    {
      id: 'q1',
      handle: 'Nia',
      temperament: 'A record-keeper who wants money and history in order.',
      stances: { motto: 0, newsletter: 0, funds: 0.7, chair: 0.1, archive: 0.7, snacks: 0.1 },
      salience: { motto: 0.2, newsletter: 0.2, funds: 0.9, chair: 0.5, archive: 0.7, snacks: 0.3 },
      noise: 0.1,
      ...rhythm(0.6, 6, 40, 20),
    },
    {
      id: 'q2',
      handle: 'Ola',
      temperament: 'A digitiser: everything scanned, nothing in cupboards.',
      stances: { motto: 0, newsletter: 0, funds: 0.7, chair: 0, archive: -0.7, snacks: 0 },
      salience: { motto: 0.2, newsletter: 0.3, funds: 0.8, chair: 0.5, archive: 0.8, snacks: 0.2 },
      noise: 0.15,
      ...rhythm(0.5, 5, 50, 15),
    },
    {
      id: 'q3',
      handle: 'Pia',
      temperament: 'A formalist on money, a paper romantic on the archive.',
      stances: { motto: 0.05, newsletter: 0, funds: 0.8, chair: 0.1, archive: 0.7, snacks: 0.1 },
      salience: { motto: 0.3, newsletter: 0.2, funds: 0.9, chair: 0.6, archive: 0.6, snacks: 0.2 },
      noise: 0.1,
      ...rhythm(0.5, 7, 35, 15),
    },
    {
      id: 'q4',
      handle: 'Quill',
      temperament: 'Wants the club run properly and the archive online.',
      stances: { motto: 0, newsletter: 0.05, funds: 0.6, chair: 0.05, archive: -0.7, snacks: 0 },
      salience: { motto: 0.2, newsletter: 0.2, funds: 0.7, chair: 0.5, archive: 0.7, snacks: 0.3 },
      noise: 0.2,
      ...rhythm(0.4, 6, 45, 12),
    },
    {
      id: 'q5',
      handle: 'Rue',
      temperament: 'Trusts the tin and does not mind where the archive lives.',
      stances: { motto: 0, newsletter: 0, funds: -0.7, chair: 0.1, archive: 0, snacks: 0.05 },
      salience: { motto: 0.2, newsletter: 0.3, funds: 0.8, chair: 0.5, archive: 0.3, snacks: 0.4 },
      noise: 0.15,
      ...rhythm(0.5, 6, 40, 15),
    },
    {
      id: 'q6',
      handle: 'Sol',
      temperament: 'Informal about money; shrugs at filing questions.',
      stances: { motto: 0, newsletter: 0, funds: -0.8, chair: 0, archive: 0, snacks: 0 },
      salience: { motto: 0.2, newsletter: 0.2, funds: 0.9, chair: 0.4, archive: 0.3, snacks: 0.3 },
      noise: 0.1,
      ...rhythm(0.6, 5, 55, 18),
    },
    {
      id: 'q7',
      handle: 'Tam',
      temperament: 'A mostly-lurking judge with mild views everywhere.',
      stances: { motto: 0, newsletter: 0, funds: -0.6, chair: 0.05, archive: 0, snacks: 0.05 },
      salience: { motto: 0.3, newsletter: 0.3, funds: 0.6, chair: 0.4, archive: 0.3, snacks: 0.4 },
      noise: 0.25,
      ...rhythm(0.2, 9, 35, 8),
    },
    {
      id: 'q8',
      handle: 'Uzi',
      temperament: 'Keeps the peace, keeps the cash informal, skips filing fights.',
      stances: { motto: 0.05, newsletter: 0, funds: -0.7, chair: 0.1, archive: 0, snacks: 0 },
      salience: { motto: 0.2, newsletter: 0.2, funds: 0.7, chair: 0.5, archive: 0.2, snacks: 0.3 },
      noise: 0.15,
      ...rhythm(0.4, 7, 45, 12),
    },
  ],
};
