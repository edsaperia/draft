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
          next.api.submit(t, proposal);
          next.drafts++;
          acted = true;
          const text = proposal.patch.hunks[0]?.lines.join(' / ') ?? '';
          config.onProgress?.(
            `[${fmt(t)}] ${profile.handle} drafts: "${text}" — ${proposal.rationale.slice(0, 80)}`,
          );
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
          const choice = await next.persona.judge(card);
          next.api.judge(t, card, choice);
          next.judgments++;
          acted = true;
          const summary =
            choice === 'indifferent'
              ? 'indifferent'
              : `prefers "${(card[choice].changes[0]?.after ?? '').slice(0, 60)}"`;
          config.onProgress?.(
            `[${fmt(t)}] ${profile.handle} judges (${card.kind}): ${summary}`,
          );
        } catch {
          // Pair became stale between fetch and judge: skip.
        }
      }
    }

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
