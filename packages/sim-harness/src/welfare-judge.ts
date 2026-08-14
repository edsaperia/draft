/**
 * The welfare judge (QUESTIONS #29, decided 2026-08-13): scores LLM-run
 * outcomes whose final lines are off the scenario's alternatives menu.
 *
 * Approach: the judge does NOT invent utilities. For each off-menu final
 * line it estimates latent coordinates — position on the issue's axis and
 * craft quality — calibrated against the menu alternatives (whose
 * coordinates are known anchors). Welfare is then computed by the same
 * ground-truth machinery as scripted runs: stances, couplings, enumerated
 * optimum. The judge translates text into the model; the math stays honest.
 *
 * Judge model: claude-fable-5 (Ed, 2026-08-13) — one call per off-menu
 * line, cheap relative to the run being scored. Subscription transport,
 * local use only. LLM-judge welfare is a sanity check on realism runs;
 * scripted welfare remains the calibration gold standard.
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import {
  assignmentWelfare,
  optimalAssignment,
  type Alternative,
  type Assignment,
  type Issue,
  type Scenario,
} from './scenario.js';

export const JUDGE_MODEL = 'claude-fable-5';

const PLACEMENT_SCHEMA = {
  type: 'object',
  properties: {
    position: { type: 'number', minimum: -1, maximum: 1 },
    quality: { type: 'number', minimum: 0, maximum: 1 },
    reasoning: { type: 'string' },
  },
  required: ['position', 'quality', 'reasoning'],
  additionalProperties: false,
} as const;

const SYSTEM = `You calibrate a latent opinion-space model for a group-drafting simulator. Each contested issue in a document has an axis (roughly: -1 = informal / discretionary / open, +1 = formal / collective / controlled) and each candidate line has two coordinates: "position" — where it sits on that axis — and "quality" — how well-crafted and workable the line is as governance prose, independent of where it leans (clarity, enforceability, absence of loopholes and vagueness; a beautifully drafted extreme line has high quality, a mushy moderate one has low quality). You will be shown the issue's known alternatives with their coordinates as anchors, then a new line. Estimate the new line's coordinates on the same scale, interpolating relative to the anchors. Judge only the text given; do not reward length.`;

function placementPrompt(issue: Issue, line: string): string {
  const anchors = issue.alternatives
    .map((a) => `- position ${a.position}, quality ${a.quality}: "${a.text}"`)
    .join('\n');
  return `Issue: ${issue.key}

Anchor alternatives (known coordinates):
${anchors}

New line to place on the same scale:
"${line}"

Estimate its position (-1..1) and quality (0..1).`;
}

export interface JudgedLine {
  issue: string;
  finalText: string;
  onMenu: boolean;
  position: number;
  quality: number;
  reasoning: string;
}

export interface JudgedWelfare {
  lines: JudgedLine[];
  achieved: number;
  optimal: number;
  incumbent: number;
  ratio: number;
  issuesAtOrAboveOptimal: number;
}

async function placeLine(issue: Issue, line: string, model: string): Promise<{ position: number; quality: number; reasoning: string }> {
  for await (const message of query({
    prompt: placementPrompt(issue, line),
    options: {
      model,
      systemPrompt: SYSTEM,
      allowedTools: [],
      maxTurns: 3,
      settingSources: [],
      outputFormat: { type: 'json_schema', schema: PLACEMENT_SCHEMA as unknown as Record<string, unknown> },
    },
  })) {
    if (message.type === 'result') {
      if (message.subtype === 'success') {
        const m = message as typeof message & { structured_output?: unknown };
        const out = (m.structured_output ?? JSON.parse(message.result)) as {
          position: number;
          quality: number;
          reasoning: string;
        };
        return out;
      }
      throw new Error(`judge query failed: ${message.subtype}`);
    }
  }
  throw new Error('judge: no result message');
}

/**
 * Score a final document against the scenario's latent model, judging
 * off-menu lines onto the scale. Progress lines go to onProgress.
 */
export async function judgeWelfare(
  scenario: Scenario,
  finalLines: string[],
  model: string = JUDGE_MODEL,
  onProgress?: (line: string) => void,
): Promise<JudgedWelfare> {
  const assignment: Assignment = new Map();
  const judged: JudgedLine[] = [];
  for (const issue of scenario.issues) {
    const line = finalLines[issue.line] ?? '';
    const match = issue.alternatives.find((a) => a.text === line);
    if (match) {
      assignment.set(issue.key, match);
      judged.push({
        issue: issue.key, finalText: line, onMenu: true,
        position: match.position, quality: match.quality, reasoning: 'exact menu match',
      });
      onProgress?.(`${issue.key}: on-menu (position ${match.position}, quality ${match.quality})`);
      continue;
    }
    const placed = await placeLine(issue, line, model);
    const alt: Alternative = { text: line, position: placed.position, quality: placed.quality, rationale: '' };
    assignment.set(issue.key, alt);
    judged.push({ issue: issue.key, finalText: line, onMenu: false, ...placed });
    onProgress?.(
      `${issue.key}: judged position ${placed.position.toFixed(2)}, quality ${placed.quality.toFixed(2)} — ${placed.reasoning}`,
    );
  }

  const optimal = optimalAssignment(scenario);
  const incumbentAssignment: Assignment = new Map(
    scenario.issues.map((i) => [i.key, i.alternatives[0]!]),
  );
  const achievedW = assignmentWelfare(scenario, assignment);
  const optimalW = assignmentWelfare(scenario, optimal);
  const incumbentW = assignmentWelfare(scenario, incumbentAssignment);
  const span = optimalW - incumbentW;

  // Per-issue: does the judged line match or beat the menu-optimal choice
  // for that issue (in roster base utility, ignoring couplings)?
  let atOrAbove = 0;
  for (const issue of scenario.issues) {
    const mine = assignment.get(issue.key)!;
    const best = optimal.get(issue.key)!;
    const sum = (alt: Alternative): number =>
      scenario.personas.reduce(
        (acc, p) => acc + alt.quality - Math.abs((p.stances[issue.key] ?? 0) - alt.position),
        0,
      );
    if (sum(mine) >= sum(best) - 1e-9) atOrAbove++;
  }

  return {
    lines: judged,
    achieved: achievedW,
    optimal: optimalW,
    incumbent: incumbentW,
    ratio: span > 1e-9 ? (achievedW - incumbentW) / span : 1,
    issuesAtOrAboveOptimal: atOrAbove,
  };
}
