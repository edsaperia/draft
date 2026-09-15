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

/**
 * **Churn on one drafting site** (Q1362, R-116): the whole history of what
 * stood there, read from the engine's log alone — the `opened` event's text
 * for the first incumbent, then one entry per `adopted` event on that site.
 *
 * The site is the patch's own span, `start:end` on the document's line space,
 * **not** a scenario issue: `overturnedIssues` above already counts issues,
 * and it can only count the ones the scenario named. A peer status quo is a
 * claim about the mechanism, so the mechanism's own footprint is what it is
 * measured on. The key assumes a patch's span is stable across adoptions,
 * which holds for every scenario in this harness (single-line substitutions,
 * `persona.ts:159`); a scenario whose patches inserted lines would need the
 * key rebased with the document.
 */
export interface SiteChurn {
  /** `start:end`, joined by commas for a multi-hunk patch. */
  site: string;
  /** What the document opened with on this site. */
  opened: string;
  /** Every adoption on it, in order. */
  adopted: SiteAdoption[];
  /** Adoptions after the first — the document changing its mind on this site. */
  flips: number;
  /** Adoptions whose text had stood on this site before: it came back. */
  reversions: number;
}

/** One adoption on a site, with the evidence the engine decided it on. */
export interface SiteAdoption {
  /** Simulated ms. */
  t: number;
  /**
   * The engine's posterior P(leader beats the current text) at the moment it
   * adopted. It no longer gates anything (R-114) — the leader is the top of
   * the ranking and there is no bar — but it is still recorded, and it is the
   * only way to ask, off a log the new rule produced, *which of these would
   * the retired bar have stopped*.
   */
  p: number;
  /** The wording this adoption put on the site. */
  text: string;
  /** Set when that wording had stood on this site before: it came back. */
  reversion: boolean;
}

export interface Metrics {
  edgeComparisons: number;
  diagonalComparisons: number;
  candidates: number;
  adoptions: number;
  /** Issues adopted more than once: early call later displaced. */
  overturnedIssues: number;
  /**
   * **The churn pair** (Q1362 (a)'s recorded cost, R-116). `flips` is every
   * adoption on a site after its first, summed over sites: how often the
   * document changed its mind anywhere. `reversions` is the sharper one —
   * an adoption returning a site to wording that had stood there before,
   * which is the *8–7 out, 7–8 back* oscillation a peer status quo was
   * expected to buy. The cooldown and the floor are the only brakes on
   * either, so both are reported, neither is asserted.
   */
  flips: number;
  reversions: number;
  /** Per-site detail behind the two counts above; sites with an adoption only. */
  churn: SiteChurn[];
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
  // Churn: the site's whole standing history, seeded from the document the
  // session opened with so the first adoption has an incumbent to be measured
  // against. Read off the log, never off the scenario.
  let openedLines: string[] = [];
  const sites = new Map<string, SiteChurn>();
  for (const entry of session.log) {
    const e = entry.event;
    if (e.type === 'opened') {
      openedLines = e.text.split('\n');
    } else if (e.type === 'comparison') {
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
      const patch = session.getCandidate(e.candidateId).patch;
      const hunk = patch?.hunks[0];
      const issue = hunk
        ? scenario.issues.find((i) => i.line === hunk.start)
        : undefined;
      if (issue) {
        adoptionsPerIssue.set(issue.key, (adoptionsPerIssue.get(issue.key) ?? 0) + 1);
      }
      // A setting candidate has no patch and so no site (Q390) — settings
      // race, but they do not churn a footprint.
      if (patch) {
        const key = patch.hunks.map((h) => `${h.start}:${h.end}`).join(',');
        const text = patch.hunks.map((h) => h.lines.join('\n')).join('\n');
        let site = sites.get(key);
        if (!site) {
          site = {
            site: key,
            opened: patch.hunks
              .map((h) => openedLines.slice(h.start, h.end).join('\n'))
              .join('\n'),
            adopted: [],
            flips: 0,
            reversions: 0,
          };
          sites.set(key, site);
        }
        const stood = [site.opened, ...site.adopted.map((a) => a.text)];
        const reversion = stood.includes(text);
        site.adopted.push({ t: e.t, p: e.p, text, reversion });
        site.flips = site.adopted.length - 1;
        if (reversion) site.reversions++;
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

  const churn: SiteChurn[] = [...sites.values()];

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
    flips: churn.reduce((a, c) => a + c.flips, 0),
    reversions: churn.reduce((a, c) => a + c.reversions, 0),
    churn,
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
  lines.push(`churn: ${m.flips} flip(s) · ${m.reversions} reversion(s) over ${m.churn.length} site(s)`);
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
