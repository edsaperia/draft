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
  /**
   * **What the batch decided on** (Q1439): the approvals the winner held and
   * the floor it met. Both are optional on the event — absent on any log
   * written before the fields existed — and are carried through as-is rather
   * than defaulted, so a study cannot silently read a zero for *not recorded*.
   */
  approvals?: number;
  floor?: number;
}

/**
 * **A race that ran out of window short of its floor** (Q1439): the leader is
 * on top of the field — the room prefers it to the text that stands — and it
 * has not gathered F approvals. This is *the* deadlock measure under the
 * approval floor, and it is read off the engine's own `RaceView` one instant
 * before the close, because the close's final batch is the last thing that
 * could have carried it and `races()` is empty after it.
 *
 * The four numbers beside it are the diagnosis, and they are here rather than
 * summed away because they separate two very different failures. If
 * `leaderJudges` has reached the floor and `approvals` has not, the room was
 * asked and said no — a refusal, which is the rule working. If `leaderJudges`
 * is short too, the pair never reached enough people — which would be a
 * **router** finding (the leader-against-the-current-text pair failing to be
 * served), and the thing stage 5 exists to catch.
 */
export interface StrandedRace {
  raceId: string;
  /** Approvals of the leader: latest judgment against the current text, preferring it. */
  approvals: number;
  /** F at the close, read against the group. */
  floor: number;
  /** The group the leader was waiting on: approvers, opposers, and the still-awaited. */
  group: number;
  /** Distinct members whose judgment touched the leader at all — the meter's number. */
  leaderJudges: number;
  /** Of those, the ones the room actually made (a derived author preference is not one). */
  leaderMeasured: number;
  /**
   * How long the leader had been standing when the window ran out. A candidate
   * submitted in the last minutes of a session is *not* a deadlock — it is a
   * proposal at the buzzer, and counting it as one would say the rule jammed
   * where in fact the clock simply stopped.
   */
  leaderAgeMs: number;
  /** A setting race rather than a text race. */
  setting: boolean;
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
  /**
   * **Races left short of their floor when the window ran out** (Q1439), read
   * from `races()` at the close's own moment and handed in by the runner —
   * `computeMetrics` runs after the close, where there are no live races left
   * to ask. Empty on a run that was never given the snapshot.
   */
  stranded: StrandedRace[];
  /**
   * **The approvals every adoption actually carried on** (Q1439), one entry
   * per `adopted` event that recorded the number — a setting race's included,
   * since it rides the same floor. The smallest of them, and how many sat at
   * two or fewer, is how a loosening of the floor is made visible: the rule
   * can only be judged by what the room was holding when it acted, not by
   * what the rule would have permitted.
   */
  approvalsAtAdoption: number[];
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
  stranded: StrandedRace[] = [],
): Metrics {
  const finalText = session.finalRender().text;
  const finalLines = finalText.split('\n');

  let edge = 0;
  let diagonal = 0;
  let candidates = 0;
  const adoptionsPerIssue = new Map<string, number>();
  let adoptions = 0;
  let firstAdoptionMs: number | null = null;
  const approvalsAtAdoption: number[] = [];
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
      if (e.approvals !== undefined) approvalsAtAdoption.push(e.approvals);
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
        site.adopted.push({
          t: e.t, p: e.p, text, reversion,
          ...(e.approvals === undefined ? {} : { approvals: e.approvals }),
          ...(e.floor === undefined ? {} : { floor: e.floor }),
        });
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
    stranded,
    approvalsAtAdoption,
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

/**
 * **The deadlock snapshot** (Q1439), taken at the close's own `t` and *before*
 * `session.close(t)` runs its final batch — so what it returns is exactly the
 * set of races that batch is about to refuse. A pure read: `races(t)` derives
 * into the per-state-version memo and emits nothing, so a run that takes this
 * snapshot writes the same log, byte for byte, as one that does not.
 *
 * `leaderOnTop` is the filter beside the floor because a leader *below* the
 * current text is not stranded — the room looked at it and preferred what it
 * has, which is the mechanism working rather than jamming.
 */
export function strandedAtClose(session: Session, t: number): StrandedRace[] {
  return session
    .races(t)
    .filter((r) => r.leaderId !== null && r.leaderOnTop && r.approvals < r.floor)
    .map((r) => ({
      raceId: r.id,
      approvals: r.approvals,
      floor: r.floor,
      group: r.group,
      leaderJudges: r.leaderJudges,
      leaderMeasured: r.leaderMeasured,
      leaderAgeMs: t - session.getCandidate(r.leaderId as string).submittedT,
      setting: r.settingId !== undefined,
    }));
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
