/**
 * Score a finished LLM run's charter with the welfare judge (Q29):
 *
 *   npm run score -w @draft/sim-harness -- --log runs/clubhouse-1.log
 *       [--scenario clubhouse|charter] [--model claude-fable-5]
 *
 * Parses the per-issue final lines from the run log's metrics block,
 * judges off-menu lines onto the latent scale, and prints the welfare
 * ratio computed by the same machinery as scripted runs.
 */

import * as fs from 'node:fs';
import { charterScenario } from './scenario.js';
import { clubhouseScenario } from './clubhouse.js';
import { JUDGE_MODEL, judgeWelfare } from './welfare-judge.js';

function parseArgs(argv: string[]): { log: string; scenario: string; model: string } {
  const args = { log: '', scenario: 'clubhouse', model: JUDGE_MODEL };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--log') args.log = argv[++i] ?? '';
    else if (a === '--scenario') args.scenario = argv[++i] ?? 'clubhouse';
    else if (a === '--model') args.model = argv[++i] ?? JUDGE_MODEL;
  }
  if (!args.log) throw new Error('usage: score --log <run log> [--scenario s] [--model m]');
  return args;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const scenario = args.scenario === 'charter' ? charterScenario : clubhouseScenario;
  const text = fs.readFileSync(args.log, 'utf8');

  // The metrics block lists each issue as:  "  <key>  [tag] <final text>"
  const byKey = new Map<string, string>();
  for (const line of text.split('\n')) {
    const m = /^ {2}(\S+)\s+\[[^\]]+\] (.*)$/.exec(line);
    if (m && scenario.issues.some((i) => i.key === m[1])) byKey.set(m[1]!, m[2]!.trim());
  }
  const missing = scenario.issues.filter((i) => !byKey.has(i.key));
  if (missing.length) {
    throw new Error(`log is missing final lines for: ${missing.map((i) => i.key).join(', ')}`);
  }
  const finalLines: string[] = scenario.text.split('\n');
  for (const issue of scenario.issues) finalLines[issue.line] = byKey.get(issue.key)!;

  console.log(`scoring ${args.log} against scenario "${scenario.name}" · judge ${args.model}\n`);
  const result = await judgeWelfare(scenario, finalLines, args.model, (line) =>
    console.log(`  ${line}`),
  );

  console.log(
    `\nwelfare ratio (judged): ${result.ratio.toFixed(2)} ` +
      `(achieved ${result.achieved.toFixed(2)} / optimal ${result.optimal.toFixed(2)} / ` +
      `incumbent ${result.incumbent.toFixed(2)})`,
  );
  console.log(
    `issues at-or-above the menu optimum: ${result.issuesAtOrAboveOptimal}/${scenario.issues.length}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
