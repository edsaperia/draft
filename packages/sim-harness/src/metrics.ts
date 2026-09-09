/**
 * Run metrics (SPEC §13.2): throughput, stability, and — thanks to the
 * scenario's latent utility model — welfare against ground truth, which
 * no live cohort could measure.
 *
 * Welfare ratio = (achieved − incumbent) / (optimal − incumbent), over
 * the roster's summed utilities: 1.0 means the session found the
 * utilitarian-best text, 0 means it left the incumbent standing, < 0
 * means it made things worse.
 */

import type { Session } from '../../engine-core/src/index.js';
import {
  assignmentWelfare,
  optimalAssignment,
  type Assignment,
  type Scenario,
} from './scenario.js';

export interface IssueOutcome {
  issue: string;
  finalText: string;
  matchedAlternative: boolean;
  isOptimal: boolean;
  adoptions: number;
}

export interface Metrics {
  edgeComparisons: number;
  diagonalComparisons: number;
  candidates: number;
  adoptions: number;
  /** Issues adopted more than once: early call later displaced. */
  overturnedIssues: number;
  issues: IssueOutcome[];
  issuesResolvedOptimally: number;
  welfareAchieved: number;
  welfareOptimal: number;
  welfareIncumbent: number;
  welfareRatio: number;
  backlogSize: number;
  finalThreshold: number;
  /**
   * The serving's own numbers (Q1178's A/B, 2026-09-09). A turn is one
   * persona action in the runner; an idle turn is one that reached the
   * card draw and drew nothing — the bout ends there. A candidate is never
   * judged when no comparison by anybody but its author ever named it.
   */
  turns: number;
  idleTurns: number;
  /** Simulated ms of the first `adopted` event; null when nothing adopted. */
  firstAdoptionMs: number | null;
  candidatesNeverJudged: number;
  participation: Record<string, {
    judgments: number; drafts: number; turns: number; idleTurns: number; tokensLeft: number }>;
  finalText: string;
  rollingHash: string;
}

export function computeMetrics(
  session: Session,
  scenario: Scenario,
  participation: Map<string, { judgments: number; drafts: number; turns: number; idleTurns: number }>,
): Metrics {
  const finalText = session.finalRender().text;
  const finalLines = finalText.split('\n');

  let edge = 0;
  let diagonal = 0;
  let candidates = 0;
  const adoptionsPerIssue = new Map<string, number>();
  let adoptions = 0;
  let firstAdoptionMs: number | null = null;
  // text candidates by author, and the ones somebody else's judgment named:
  // a submission precedes any comparison naming it, so one pass suffices
  const authorOf = new Map<string, string>();
  const judgedByOthers = new Set<string>();
  for (const entry of session.log) {
    const e = entry.event;
    if (e.type === 'comparison') {
      if (e.kind === 'edge') edge++;
      else diagonal++;
      for (const id of [e.aId, e.bId]) {
        if (authorOf.has(id) && authorOf.get(id) !== e.participantId) judgedByOthers.add(id);
      }
    } else if (e.type === 'candidate-submitted') {
      candidates++;
      if (e.patch) authorOf.set(e.id, e.author);
    } else if (e.type === 'adopted') {
      adoptions++;
      if (firstAdoptionMs === null) firstAdoptionMs = e.t;
      // Attribute by line number, not by matching text against the alternatives
      // menu — LLM drafts are almost always off-menu, which left adoptions
      // unattributed and reported overturns as 0 on runs that had several.
      const hunk = session.getCandidate(e.candidateId).patch?.hunks[0];
      const issue = hunk
        ? scenario.issues.find((i) => i.line === hunk.start)
        : undefined;
      if (issue) {
        adoptionsPerIssue.set(issue.key, (adoptionsPerIssue.get(issue.key) ?? 0) + 1);
      }
    }
  }

  // Assignments: welfare is a property of the whole document, because
  // couplings make issue values interdependent. Off-menu final text scores
  // as the incumbent (labeled unmatched below).
  const achieved: Assignment = new Map();
  const incumbentAssignment: Assignment = new Map();
  const optimal = optimalAssignment(scenario);
  const issues: IssueOutcome[] = [];
  let optimalCount = 0;
  for (const issue of scenario.issues) {
    const line = finalLines[issue.line] ?? '';
    const matched = issue.alternatives.find((a) => a.text === line);
    achieved.set(issue.key, matched ?? issue.alternatives[0]!);
    incumbentAssignment.set(issue.key, issue.alternatives[0]!);
    const isOptimal = matched !== undefined && matched.text === optimal.get(issue.key)!.text;
    if (isOptimal) optimalCount++;
    issues.push({
      issue: issue.key,
      finalText: line,
      matchedAlternative: matched !== undefined,
      isOptimal,
      adoptions: adoptionsPerIssue.get(issue.key) ?? 0,
    });
  }
  const welfareAchieved = assignmentWelfare(scenario, achieved);
  const welfareOptimal = assignmentWelfare(scenario, optimal);
  const welfareIncumbent = assignmentWelfare(scenario, incumbentAssignment);
  const span = welfareOptimal - welfareIncumbent;
  const welfareRatio = span > 1e-9 ? (welfareAchieved - welfareIncumbent) / span : 1;

  const participationOut: Metrics['participation'] = {};
  for (const [id, p] of participation) {
    participationOut[id] = {
      ...p,
      tokensLeft: session.balance(id, session.constitution.windowEndMs),
    };
  }

  return {
    edgeComparisons: edge,
    diagonalComparisons: diagonal,
    candidates,
    adoptions,
    overturnedIssues: [...adoptionsPerIssue.values()].filter((n) => n > 1).length,
    issues,
    issuesResolvedOptimally: optimalCount,
    welfareAchieved,
    welfareOptimal,
    welfareIncumbent,
    welfareRatio,
    backlogSize: session.backlog().length,
    finalThreshold: session.adoptionThreshold(),
    turns: [...participation.values()].reduce((a, p) => a + p.turns, 0),
    idleTurns: [...participation.values()].reduce((a, p) => a + p.idleTurns, 0),
    firstAdoptionMs,
    candidatesNeverJudged: [...authorOf.keys()].filter((id) => !judgedByOthers.has(id)).length,
    participation: participationOut,
    finalText,
    rollingHash: session.rollingHash(),
  };
}

export function formatMetrics(m: Metrics): string {
  const lines: string[] = [];
  lines.push(
    `judgments: ${m.edgeComparisons} edge + ${m.diagonalComparisons} diagonal · ` +
      `candidates: ${m.candidates} · adoptions: ${m.adoptions} (overturned issues: ${m.overturnedIssues})`,
  );
  const offMenu = m.issues.filter((i) => !i.matchedAlternative).length;
  lines.push(
    `welfare ratio: ${m.welfareRatio.toFixed(2)} ` +
      `(achieved ${m.welfareAchieved.toFixed(2)} / optimal ${m.welfareOptimal.toFixed(2)} / ` +
      `incumbent ${m.welfareIncumbent.toFixed(2)}) · ` +
      `optimal issues: ${m.issuesResolvedOptimally}/${m.issues.length} · backlog: ${m.backlogSize}` +
      (offMenu > 0
        ? ` · NOTE: ${offMenu} off-menu outcome(s) unscored (welfare counts known alternatives only)`
        : ''),
  );
  for (const issue of m.issues) {
    const tag = issue.isOptimal ? 'optimal' : issue.matchedAlternative ? 'settled' : 'off-menu';
    lines.push(`  ${issue.issue.padEnd(12)} [${tag}] ${issue.finalText}`);
  }
  const parts = Object.entries(m.participation)
    .map(([id, p]) => `${id}: ${p.judgments}j/${p.drafts}d/${p.tokensLeft.toFixed(1)}t`)
    .join(' · ');
  lines.push(`participation: ${parts}`);
  return lines.join('\n');
}
