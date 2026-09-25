/**
 * Writes `pre-q1538.json` — run once, by the engine as it stood on main at
 * b3f3ec4e, before a leader waited on its rivals (Q1538). Kept beside the
 * golden so the fixture's provenance is readable; never run by the suite.
 *
 *   npx tsx packages/engine-core/test/golden/make-pre-q1538.ts
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Session, makeConstitution } from '../../src/session.js';

const HOUR = 3600_000;
const s = Session.open({
  text: '# Charter\nMembership is open to anyone.\nDecisions are made by consensus.',
  roster: Array.from({ length: 5 }, (_, i) => ({ id: `p${i + 1}`, handle: `P${i + 1}` })),
  constitution: makeConstitution({
    windowStartMs: 0, windowEndMs: 100 * HOUR, rngSeed: 'pre-q1538', cooldownMs: 0,
    quorum: { form: 'count', n: 3 },
  }),
}, 0);
const patch = (text: string) =>
  ({ baseVersion: s.currentVersion(), hunks: [{ start: 1, end: 2, lines: [text] }] });
const X = s.submitCandidate(1000, { author: 'p1', rationale: 'x', patch: patch('Membership is open to members.') }).id;
const Y = s.submitCandidate(2000, { author: 'p2', rationale: 'y', patch: patch('Membership is open to all.') }).id;
const cur = s.races(2000)[0]!.incumbentId;
// X is approved to its floor against the current text; X against Y is never asked
s.judge(3000, 'p3', X, cur, 'a');
s.judge(4000, 'p4', X, cur, 'a');
const types = s.log.map((e) => e.event.type);
if (!types.includes('adopted')) throw new Error('the fixture must adopt X with Y unmeasured');
const summary = {
  hash: s.rollingHash(),
  states: Object.fromEntries(s.allCandidates().map((c) => [c.id, c.state])),
  judgments: s.judgments(),
  document: s.document(),
  types,
  ids: { X, Y },
};
writeFileSync(fileURLToPath(new URL('./pre-q1538.json', import.meta.url)),
  JSON.stringify({ log: s.log, summary }, null, 1) + '\n');
console.log('wrote pre-q1538.json', summary.states, types.join(' '));
