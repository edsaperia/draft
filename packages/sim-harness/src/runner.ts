/**
 * The runner: drives a full session with personas acting on a simulated
 * clock. Personas participate in bouts (SPEC §9.3) — arrive, judge a
 * handful of cards, maybe draft, leave — with per-persona rhythms.
 * Fully deterministic in scripted mode: same seed, same rolling hash.
 */

import {
  makeConstitution,
  makeRng,
  ParticipantApi,
  Session,
  type Constitution,
  type DedupGate,
  type DedupVerdict,
  type Participant,
  type Rng,
} from '../../engine-core/src/index.js';
import type { Persona } from './persona.js';
import type { PersonaProfile, Scenario } from './scenario.js';
import { computeMetrics, type Metrics } from './metrics.js';

export interface RunConfig {
  scenario: Scenario;
  makePersona: (profile: PersonaProfile, rng: Rng) => Persona;
  /** Session window length in simulated ms. */
  windowMs: number;
  seed: string;
  constitutionOverrides?: Partial<Constitution>;
  /** Safety valve on total persona actions. */
  maxActions?: number;
  /** Called after each action with a progress line; optional. */
  onProgress?: (line: string) => void;
  /**
   * Optional advisory dedup-gate (SPEC §5.1). When set, each draft is
   * checked before submission; duplicates are not submitted — support
   * merges into the existing candidate via co-sign where possible, else
   * the draft is skipped and logged. When unset, the run is byte-identical
   * to a run before the gate existed.
   */
  dedupGate?: DedupGate;
}

export interface RunResult {
  session: Session;
  metrics: Metrics;
  actions: number;
}

interface PersonaState {
  persona: Persona;
  api: ParticipantApi;
  rng: Rng;
  nextAt: number;
  remainingInBout: number;
  draftedThisBout: boolean;
  judgments: number;
  drafts: number;
}

export async function runSession(config: RunConfig): Promise<RunResult> {
  const { scenario, windowMs, seed } = config;
  const constitution = makeConstitution({
    windowStartMs: 0,
    windowEndMs: windowMs,
    rngSeed: seed,
    cooldownMs: 5 * 60_000,
    ...config.constitutionOverrides,
  });
  const roster: Participant[] = scenario.personas.map((p) => ({
    id: p.id,
    handle: p.handle,
  }));
  const session = Session.open(
    { text: scenario.text, roster, constitution },
    0,
  );

  const rootRng = makeRng(`sim/${seed}`);
  const states: PersonaState[] = scenario.personas.map((profile) => {
    const rng = rootRng.fork(profile.id);
    return {
      persona: config.makePersona(profile, rng.fork('mind')),
      api: new ParticipantApi(session, profile.id),
      rng,
      // Stagger arrivals across the first fraction of a bout gap.
      nextAt: 1 + rng.int(Math.max(1, Math.floor(profile.boutGapMs / 2))),
      remainingInBout: 0,
      draftedThisBout: false,
      judgments: 0,
      drafts: 0,
    };
  });

  const maxActions = config.maxActions ?? 5000;
  let actions = 0;
  let seenSeq = 0;

  // Surface gazette events (adoptions, rebase fallout) in the progress log.
  const announce = (): void => {
    for (; seenSeq < session.log.length; seenSeq++) {
      const e = session.log[seenSeq]!.event;
      if (e.type === 'adopted') {
        const c = session.getCandidate(e.candidateId);
        config.onProgress?.(
          `[${fmt(e.t)}] *** ADOPTED (p=${e.p.toFixed(2)} > bar ${e.threshold.toFixed(2)}): ` +
            `"${c.patch.hunks[0]?.lines.join(' / ') ?? ''}"`,
        );
      } else if (e.type === 'rebase-failed') {
        config.onProgress?.(
          `[${fmt(e.t)}] ${e.id} needs a rebase: its ground changed under it`,
        );
      }
    }
  };

  const jitter = (rng: Rng, mean: number): number =>
    Math.max(1, Math.floor(mean * (0.5 + rng.next())));

  while (actions < maxActions) {
    // Next persona due to act.
    let next: PersonaState | null = null;
    for (const s of states) {
      if (next === null || s.nextAt < next.nextAt) next = s;
    }
    if (next === null) break;
    const t = next.nextAt;
    if (t >= windowMs) break;
    const profile = next.persona.profile;

    if (next.remainingInBout <= 0) {
      // A new bout begins.
      next.remainingInBout = Math.max(1, jitter(next.rng, profile.boutCards));
      next.draftedThisBout = false;
    }

    actions++;
    let acted = false;

    // Drafting is considered once per bout, before judging.
    if (!next.draftedThisBout) {
      next.draftedThisBout = true;
      try {
        const proposal = await next.persona.draft(next.api, t);
        if (proposal !== null) {
          // Advisory dedup-gate (SPEC §5.1): consult BEFORE submitting; the
          // runner (not the gate, not the Session) decides what a duplicate
          // verdict means. Absent or failing, the path is exactly the old one.
          let verdict: DedupVerdict = { kind: 'fresh' };
          if (config.dedupGate) {
            const patchText = proposal.patch.hunks.map((h) => h.lines.join('\n')).join('\n');
            const live = session
              .allCandidates()
              .filter((c) => c.state === 'live')
              .map((c) => ({
                id: c.id,
                text: c.patch.hunks.map((h) => h.lines.join('\n')).join('\n'),
                rationale: c.rationale,
              }));
            try {
              verdict = await config.dedupGate.check(patchText, live, session.document());
            } catch {
              // Advisory only: a gate failure never blocks a submission.
            }
          }
          if (verdict.kind === 'duplicate') {
            // Duplicates merge support (SPEC §5.1 co-sign): join the existing
            // candidate's supporters; if this participant already supports it
            // (or the candidate just left play), simply skip.
            let outcome = 'skipped';
            if (!session.supportersOf(verdict.of).has(profile.id)) {
              try {
                session.coSign(t, profile.id, verdict.of);
                outcome = 'support merged';
              } catch {
                outcome = 'skipped';
              }
            }
            acted = true;
            config.onProgress?.(
              `[${fmt(t)}] ${profile.handle} drafts a duplicate of ${verdict.of} (${verdict.via}): ${outcome}`,
            );
          } else {
            next.api.submit(t, proposal);
            next.drafts++;
            acted = true;
            const text = proposal.patch.hunks[0]?.lines.join(' / ') ?? '';
            config.onProgress?.(
              `[${fmt(t)}] ${profile.handle} drafts: "${text}" — ${proposal.rationale}`,
            );
          }
        } else {
          config.onProgress?.(
            `[${fmt(t)}] ${profile.handle} arrives, considers drafting: passes`,
          );
        }
      } catch {
        // Draft rejected (stale version, tokens, validation): skip.
      }
    }

    if (!acted) {
      const cards = next.api.nextCards(1, t);
      const card = cards[0];
      if (card) {
        try {
          const choice = await next.persona.judge(card, next.api);
          next.api.judge(t, card, choice);
          next.judgments++;
          acted = true;
          const describe = (option: typeof card.a): string => {
            const texts = option.changes.map((c) => c.after).join(' / ');
            const isIncumbent = option.changes.every((c) => c.before === c.after);
            return isIncumbent ? `keep "${texts}"` : `"${texts}"`;
          };
          const issueOf = (option: typeof card.a): string => {
            const docLines = session.document().split('\n');
            for (const c of option.changes) {
              const n = docLines.indexOf(c.before.split('\n')[0]!);
              const issue = scenario.issues.find((i) => i.line === n);
              if (issue) return issue.key;
            }
            return '?';
          };
          const tag =
            card.kind === 'diagonal'
              ? `${issueOf(card.a)} vs ${issueOf(card.b)}`
              : issueOf(card.a) !== '?'
                ? issueOf(card.a)
                : issueOf(card.b);
          const summary =
            choice === 'indifferent'
              ? `indifferent between ${describe(card.a)} and ${describe(card.b)}`
              : `prefers ${describe(card[choice])} over ${describe(
                  card[choice === 'a' ? 'b' : 'a'],
                )}`;
          config.onProgress?.(
            `[${fmt(t)}] ${profile.handle} judges [${tag}]: ${summary}`,
          );
        } catch {
          // Pair became stale between fetch and judge: skip.
        }
      }
    }

    announce();
    next.remainingInBout--;
    if (!acted || next.remainingInBout <= 0) {
      // Nothing to do, or bout over: leave until the next bout.
      next.remainingInBout = 0;
      next.nextAt = t + jitter(next.rng, profile.boutGapMs);
    } else {
      next.nextAt = t + jitter(next.rng, profile.cardSeconds * 1000);
    }
  }

  session.close(windowMs);
  const participation = new Map(
    states.map((s) => [
      s.persona.profile.id,
      { judgments: s.judgments, drafts: s.drafts },
    ]),
  );
  const metrics = computeMetrics(session, scenario, participation);
  return { session, metrics, actions };
}

function fmt(t: number): string {
  const h = Math.floor(t / 3600_000);
  const m = Math.floor((t % 3600_000) / 60_000);
  return `${h}h${String(m).padStart(2, '0')}`;
}
