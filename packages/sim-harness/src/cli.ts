/**
 * Sim CLI.
 *
 *   npm run sim -w @draft/sim-harness -- [--mode scripted|llm|subscription]
 *       [--seeds N] [--hours H] [--seed S] [--dedup] [--verbose] [--json]
 *
 * scripted: deterministic personas from the scenario's latent utilities.
 * llm: claude-haiku-4-5 personas via the Claude API (needs an API key).
 * subscription: the same personas via headless Claude Code (Agent SDK),
 *   billed to the local Claude subscription. Local use only.
 * --dedup: opt-in advisory dedup-gate on submissions (SPEC §5.1). In
 *   scripted mode: exact + edit-distance only. In llm/subscription modes
 *   the matching oracle transport adds LLM equivalence.
 */

import { DedupGate } from '../../engine-core/src/index.js';
import { loadDotenv } from './env.js';
import { LlmOracle, SubscriptionOracle } from './oracles.js';
import { ScriptedPersona } from './persona.js';
import { LlmPersona } from './llm-persona.js';
import { SubscriptionPersona, probeSubscription } from './subscription-persona.js';
import { SubscriptionCommentator } from './commentator.js';
import { charterScenario } from './scenario.js';
import { clubhouseScenario } from './clubhouse.js';
import { runSession } from './runner.js';
import { formatMetrics, type Metrics } from './metrics.js';

interface Args {
  mode: 'scripted' | 'llm' | 'subscription';
  scenario: 'charter' | 'clubhouse';
  seeds: number;
  hours: number;
  seed: string;
  model: string;
  verbose: boolean;
  json: boolean;
  commentary: boolean;
  dedup: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    mode: 'scripted',
    scenario: 'charter',
    seeds: 1,
    hours: 72,
    seed: 'draft',
    model: 'claude-haiku-4-5',
    verbose: false,
    json: false,
    commentary: false,
    dedup: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--mode') {
      const v = argv[++i];
      args.mode = v === 'llm' ? 'llm' : v === 'subscription' ? 'subscription' : 'scripted';
    }
    else if (a === '--scenario') args.scenario = argv[++i] === 'clubhouse' ? 'clubhouse' : 'charter';
    else if (a === '--seeds') args.seeds = Number(argv[++i]) || 1;
    else if (a === '--hours') args.hours = Number(argv[++i]) || 72;
    else if (a === '--seed') args.seed = argv[++i] ?? 'draft';
    else if (a === '--model') args.model = argv[++i] ?? 'claude-haiku-4-5';
    else if (a === '--verbose') args.verbose = true;
    else if (a === '--json') args.json = true;
    else if (a === '--commentary') args.commentary = true;
    else if (a === '--dedup') args.dedup = true;
  }
  return args;
}

async function main(): Promise<void> {
  loadDotenv();
  const args = parseArgs(process.argv.slice(2));
  const scenario = args.scenario === 'clubhouse' ? clubhouseScenario : charterScenario;
  const all: Metrics[] = [];

  // Fail fast: persona-level fallbacks (indifferent/pass) would otherwise
  // silently turn an auth failure into a session where nothing happens.
  if (args.mode === 'llm') {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    try {
      await new Anthropic().messages.create({
        model: args.model,
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
    console.log('probing subscription auth (one headless Claude Code call)...');
    const failure = await probeSubscription(args.model);
    if (failure === null) console.log('auth ok.');
    if (failure !== null) {
      console.error(
        'Subscription mode needs a logged-in Claude Code (or CLAUDE_CODE_OAUTH_TOKEN from `claude setup-token`).',
      );
      console.error(failure);
      process.exitCode = 1;
      return;
    }
  }

  // The dedup-gate is advisory and stateless, so one instance serves every
  // run. Scripted mode gets no oracle: exact + edit-distance only.
  const dedupGate = args.dedup
    ? new DedupGate(
        args.mode === 'llm'
          ? new LlmOracle({ model: args.model })
          : args.mode === 'subscription'
            ? new SubscriptionOracle({ model: args.model })
            : undefined,
      )
    : null;

  if (!args.json) {
    const model = args.mode === 'scripted' ? '' : ` · model ${args.model}`;
    const dedup = args.dedup ? ' · dedup-gate on' : '';
    console.log(
      `scenario "${scenario.name}" · mode ${args.mode}${model} · window ${args.hours}h${dedup}`,
    );
    console.log(`\nstarting document:`);
    for (const line of scenario.text.split('\n')) console.log(`  | ${line}`);
    console.log(`\nroster:`);
    for (const p of scenario.personas) {
      console.log(`  ${p.id} ${p.handle} — ${p.temperament}`);
    }
    console.log('');
  }

  for (let i = 0; i < args.seeds; i++) {
    const seed = args.seeds === 1 ? args.seed : `${args.seed}-${i}`;
    const commentator =
      args.commentary && args.mode !== 'scripted'
        ? new SubscriptionCommentator(scenario, args.hours, args.model, (line) =>
            console.log(line),
          )
        : null;
    const onProgress = (line: string): void => {
      if (args.verbose) console.log(line);
      commentator?.observe(line);
    };
    const result = await runSession({
      scenario,
      windowMs: args.hours * 3600_000,
      seed,
      makePersona: (profile, rng) =>
        args.mode === 'llm'
          ? new LlmPersona(profile, { model: args.model })
          : args.mode === 'subscription'
            ? new SubscriptionPersona(profile, { model: args.model })
            : new ScriptedPersona(profile, scenario, rng),
      ...(args.verbose || commentator ? { onProgress } : {}),
      ...(dedupGate ? { dedupGate } : {}),
    });
    await commentator?.flush();
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
        const text = c.patch?.hunks[0]?.lines.join(' / ') ?? '';
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
