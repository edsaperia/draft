/**
 * **One real run of the demo bots on Claude, by hand** (design/DEMO.md Stage
 * 5) — `npm run demo-bots-smoke -- <base>`. **Spends real money** (a few
 * cents on Haiku), so it is never run by CI and refuses to start without
 * `DRAFT_DEMO_ANTHROPIC_KEY` in its own environment — the same key the server
 * was booted with:
 *
 *   DRAFT_DEMO_KEY=walk DRAFT_DEMO_ANTHROPIC_KEY=sk-ant-… npm run server
 *   DRAFT_DEMO_ANTHROPIC_KEY=sk-ant-… npm run demo-bots-smoke -- http://127.0.0.1:8140
 *
 * It builds a busy document with the phase ladder, points the bots at it,
 * runs three Haiku bots at *frantic* for sixty seconds with the heartbeat
 * beating, pauses them, and prints what they did and what it cost — the
 * number to hold against the Console's usage for the workspace (DEMO.md §6).
 * `--model=claude-sonnet-5` or `claude-opus-5-5` runs the same on another
 * model; `--seconds=` and `--count=` change the run.
 */
import { createHmac } from 'node:crypto';
import { assertServerBuild, walkBase } from './lib/assert-server.mjs';
import { arg, post, say, sleep } from './lib/walk.mjs';

if (!process.env.DRAFT_DEMO_ANTHROPIC_KEY) {
  console.error('demo-bots-smoke: set DRAFT_DEMO_ANTHROPIC_KEY (this run spends real money) — ' +
    'and boot the server with the same key and DRAFT_DEMO_KEY');
  process.exit(2);
}
const BASE = walkBase(process.argv, process.env, 'http://127.0.0.1:8140');
const KEY = arg('key', process.env.DRAFT_DEMO_KEY || 'walk');
const MODEL = arg('model', 'claude-haiku-4-5');
const SECONDS = Number(arg('seconds', '60'));
const COUNT = Number(arg('count', '3'));
await assertServerBuild(BASE, 'demo-bots-smoke');

const exp = Date.now() + 86_400_000;
const demo = `draft_demo=${exp}.${createHmac('sha256', KEY).update(`draft-demo.${exp}`).digest('base64url')}`;
const readout = async () => (await fetch(`${BASE}/api/demo/bots`, { headers: { cookie: demo } })).json();

const s0 = await readout();
if (s0.brain !== 'claude') {
  console.error(`demo-bots-smoke: the server's bots think with '${s0.brain}', not Claude — ` +
    'boot it with DRAFT_DEMO_ANTHROPIC_KEY and without DRAFT_DEMO_STUB');
  process.exit(2);
}
const lr = await post(BASE, '/api/dev/ladder', { to: 'session' });
if (!lr.ok) { console.error(await lr.text()); process.exit(1); }
const { slug } = await lr.json();
await post(BASE, '/api/dev/demo-target', { slug }, demo);
say(`document ${BASE}/d/${slug} — ${COUNT} bots on ${MODEL} for ${SECONDS} s`);
const go = await post(BASE, '/api/demo/bots', { action: 'start', count: COUNT, pace: 'frantic', model: MODEL }, demo);
if (!go.ok) { console.error((await go.json()).error); process.exit(1); }
const end = Date.now() + SECONDS * 1000;
while (Date.now() < end) {
  await sleep(10_000);
  await post(BASE, '/api/demo/heartbeat', {}, demo);
  const s = await readout();
  say(`  ${Math.round((end - Date.now()) / 1000)} s left · ${s.calls} calls · $${s.runUsd}`);
}
await post(BASE, '/api/demo/bots', { action: 'pause' }, demo);
await sleep(3_000); // calls in flight land and are priced
const s = await readout();
say('\nwhat they did:');
for (const line of s.recent) say(`  ${line}`);
say(`\nacts ${JSON.stringify(s.acts)}`);
say(`calls ${s.calls} · tokens in ${s.tokens.input} out ${s.tokens.output} ` +
  `cache read ${s.tokens.cacheRead} cache write ${s.tokens.cacheWrite}`);
say(`cost $${s.totalUsd} on ${MODEL} — hold it against the Console's usage for the workspace`);
