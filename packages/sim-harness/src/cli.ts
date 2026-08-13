/**
 * Sim CLI.
 *
 *   npm run sim -w @draft/sim-harness -- [--mode scripted|llm|subscription]
 *       [--seeds N] [--hours H] [--seed S] [--verbose] [--json]
 *
 * scripted: deterministic personas from the scenario's latent utilities.
 * llm: claude-haiku-4-5 personas via the Claude API (needs an API key).
 * subscription: the same personas via headless Claude Code (Agent SDK),
 *   billed to the local Claude subscription. Local use only.
 */

import { loadDotenv } from './env.js';
import { ScriptedPersona } from './persona.js';
import { LlmPersona } from './llm-persona.js';
import { SubscriptionPersona, probeSubscription } from './subscription-persona.js';
import { charterScenario } from './scenario.js';
import { runSession } from './runner.js';
import { formatMetrics, type Metrics } from './metrics.js';

interface Args {
  mode: 'scripted' | 'llm' | 'subscription';
  seeds: number;
  hours: number;
  seed: string;
  verbose: boolean;
  json: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    mode: 'scripted',
    seeds: 1,
    hours: 72,
    seed: 'draft',
    verbose: false,
    json: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--mode') {
      const v = argv[++i];
      args.mode = v === 'llm' ? 'llm' : v === 'subscription' ? 'subscription' : 'scripted';
    }
    else if (a === '--seeds') args.seeds = Number(argv[++i]) || 1;
    else if (a === '--hours') args.hours = Number(argv[++i]) || 72;
    else if (a === '--seed') args.seed = argv[++i] ?? 'draft';
    else if (a === '--verbose') args.verbose = true;
    else if (a === '--json') args.json = true;
  }
  return args;
}

async function main(): Promise<void> {
  loadDotenv();
  const args = parseArgs(process.argv.slice(2));
  const scenario = charterScenario;
  const all: Metrics[] = [];

  // Fail fast: persona-level fallbacks (indifferent/pass) would otherwise
  // silently turn an auth failure into a session where nothing happens.
  if (args.mode === 'llm') {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    try {
      await new Anthropic().messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 8,
        messages: [{ role: 'user', content: 'Say OK.' }],
      });
    } catch (err) {
      console.error(
        'LLM mode needs Claude API credentials (ANTHROPIC_API_KEY or an `ant auth login` profile).',
      );
      console.error(String(err));
      process.exitCode = 1;
      return;
    }
  } else if (args.mode === 'subscription') {
    const failure = await probeSubscription();
    if (failure !== null) {
      console.error(
        'Subscription mode needs a logged-in Claude Code (or CLAUDE_CODE_OAUTH_TOKEN from `claude setup-token`).',
      );
      console.error(failure);
      process.exitCode = 1;
      return;
    }
  }

  for (let i = 0; i < args.seeds; i++) {
    const seed = args.seeds === 1 ? args.seed : `${args.seed}-${i}`;
    const result = await runSession({
      scenario,
      windowMs: args.hours * 3600_000,
      seed,
      makePersona: (profile, rng) =>
        args.mode === 'llm'
          ? new LlmPersona(profile)
          : args.mode === 'subscription'
            ? new SubscriptionPersona(profile)
            : new ScriptedPersona(profile, scenario, rng),
      ...(args.verbose ? { onProgress: (line: string) => console.log(line) } : {}),
    });
    all.push(result.metrics);
    if (args.json) {
      console.log(JSON.stringify(result.metrics, null, 2));
    } else {
      console.log(`\n=== run "${seed}" (${args.mode}, ${args.hours}h window) ===`);
      console.log(formatMetrics(result.metrics));
      // The record is co-equal with the text (SPEC §1): every candidate, its
      // author, fate, and words.
      console.log('candidates:');
      for (const c of result.session.allCandidates()) {
        const text = c.patch.hunks[0]?.lines.join(' / ') ?? '';
        console.log(`  ${c.id} [${c.state}] ${c.author}: "${text}" — ${c.rationale}`);
      }
    }
  }

  if (all.length > 1 && !args.json) {
    const mean = (f: (m: Metrics) => number): string =>
      (all.reduce((acc, m) => acc + f(m), 0) / all.length).toFixed(2);
    console.log(`\n=== ${all.length} runs: mean welfare ratio ${mean((m) => m.welfareRatio)}, ` +
      `mean adoptions ${mean((m) => m.adoptions)}, ` +
      `mean optimal issues ${mean((m) => m.issuesResolvedOptimally)}/${scenario.issues.length} ===`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
