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

/**
 * A convenor act on the roster (SPEC §9.3, QUESTIONS #10): a mid-session
 * join (base grant + accrued drip, capped — the engine's openLedger does
 * this) or removal (candidates stay live, judgments stay counted, F
 * recomputes from the new E). Fires when simulated time reaches atMs.
 */
export type RosterEvent =
  | { atMs: number; kind: 'join'; profile: PersonaProfile }
  | { atMs: number; kind: 'remove'; participantId: string };

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
   * Mid-session roster changes (SPEC §9.3), applied in atMs order. When
   * absent the run is byte-identical to a run before this hook existed.
   */
  rosterEvents?: RosterEvent[];
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
  const makeState = (profile: PersonaProfile, notBeforeMs: number): PersonaState => {
    const rng = rootRng.fork(profile.id);
    return {
      persona: config.makePersona(profile, rng.fork('mind')),
      api: new ParticipantApi(session, profile.id),
      rng,
      // Stagger arrivals across the first fraction of a bout gap; a
      // profile arrivalDelayMs (QUESTIONS #8) pushes the first bout out.
      nextAt:
        notBeforeMs +
        (profile.arrivalDelayMs ?? 0) +
        1 +
        rng.int(Math.max(1, Math.floor(profile.boutGapMs / 2))),
      remainingInBout: 0,
      draftedThisBout: false,
      judgments: 0,
      drafts: 0,
    };
  };
  const states: PersonaState[] = scenario.personas.map((p) => makeState(p, 0));
  const rosterEvents = [...(config.rosterEvents ?? [])].sort((a, b) => a.atMs - b.atMs);
  let rosterIdx = 0;
  let lastActionT = 0;

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
            `"${c.patch?.hunks[0]?.lines.join(' / ') ?? ''}"`,
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
    // Convenor acts due by now fire first (SPEC §9.3), stamped at their
    // own time (kept monotone against the last logged action). Any act
    // invalidates the selection above (the chosen persona may have been
    // removed; a joiner may be due sooner), so re-select.
    if (rosterIdx < rosterEvents.length && rosterEvents[rosterIdx]!.atMs <= t) {
      const ev = rosterEvents[rosterIdx++]!;
      const at = Math.max(ev.atMs, lastActionT);
      if (ev.kind === 'join') {
        session.addParticipant(at, { id: ev.profile.id, handle: ev.profile.handle });
        states.push(makeState(ev.profile, at));
        config.onProgress?.(`[${fmt(at)}] roster: ${ev.profile.handle} joins`);
      } else {
        session.removeParticipant(at, ev.participantId);
        const gone = states.find((s) => s.persona.profile.id === ev.participantId);
        if (gone) gone.nextAt = Infinity;
        config.onProgress?.(`[${fmt(at)}] roster: ${ev.participantId} removed`);
      }
      continue;
    }
    if (t >= windowMs) break;
    const profile = next.persona.profile;

    if (next.remainingInBout <= 0) {
      // A new bout begins.
      next.remainingInBout = Math.max(1, jitter(next.rng, profile.boutCards));
      next.draftedThisBout = false;
    }

    actions++;
    lastActionT = t;
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
                text: (c.patch?.hunks ?? []).map((h) => h.lines.join('\n')).join('\n'),
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
      // Propose C (SPEC §3.3, QUESTIONS #9): a persona with the policy may
      // answer the card by drafting. Since SPEC v0.16 this costs no
      // comparison — the forfeit priced a peek at mid-flight state, and the
      // briefing is now withheld from a race still being judged (§3.5) — so
      // the draft simply submits at normal stake. Personas without the
      // policy take the original path.
      if (card && next.persona.considerProposeC) {
        try {
          const proposal = await next.persona.considerProposeC(card, next.api, t);
          if (proposal !== null) {
            session.openComposer(t, profile.id);
            next.api.submit(t, proposal);
            next.drafts++;
            acted = true;
            const text = proposal.patch.hunks[0]?.lines.join(' / ') ?? '';
            config.onProgress?.(
              `[${fmt(t)}] ${profile.handle} proposes C instead of judging: "${text}" — ${proposal.rationale}`,
            );
          }
        } catch {
          // Composer opened but the draft failed (stale version, tokens):
          // nothing is owed for having opened it. Fall through.
        }
      }
      if (card && !acted) {
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
