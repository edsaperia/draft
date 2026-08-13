/**
 * Diagnostic: run one draft-decision call for Ash exactly as the
 * subscription persona would, but with nothing swallowed — print every
 * message the Agent SDK yields, including errors and the raw result.
 * `npx tsx src/probe-draft.ts`
 */
import { query } from '@anthropic-ai/claude-agent-sdk';
import { makeConstitution, ParticipantApi, Session } from '../../engine-core/src/index.js';
import { charterScenario } from './scenario.js';
import { DRAFT_SCHEMA, draftPrompt, personaSystemPrompt } from './persona-prompts.js';

const constitution = makeConstitution({
  windowStartMs: 0,
  windowEndMs: 6 * 3600_000,
  rngSeed: 'probe',
});
const session = Session.open(
  {
    text: charterScenario.text,
    roster: charterScenario.personas.map((p) => ({ id: p.id, handle: p.handle })),
    constitution,
  },
  0,
);
const api = new ParticipantApi(session, 'p1');
const ash = charterScenario.personas[0]!;

const prompt = draftPrompt(api, 1000);
console.log('--- draft prompt ---\n' + prompt + '\n--------------------');

// Ask for the decision plus a reason so a genuine pass explains itself.
const schema = {
  ...DRAFT_SCHEMA,
  properties: {
    ...DRAFT_SCHEMA.properties,
    reason: { type: 'string', description: 'One sentence: why draft or why pass.' },
  },
  required: [...DRAFT_SCHEMA.required, 'reason'],
};

for await (const message of query({
  prompt,
  options: {
    model: 'claude-haiku-4-5',
    systemPrompt: personaSystemPrompt(ash),
    allowedTools: [],
    maxTurns: 3,
    settingSources: [],
    outputFormat: { type: 'json_schema', schema },
  },
})) {
  if (message.type !== 'result') continue;
  if (message.subtype !== 'success') {
    console.log('FAILED:', message.subtype);
    break;
  }
  const m = message as typeof message & { structured_output?: unknown };
  console.log('structured_output present:', m.structured_output !== undefined);
  const decision = m.structured_output ?? JSON.parse(message.result);
  console.log('DECISION:', JSON.stringify(decision, null, 2));
}
