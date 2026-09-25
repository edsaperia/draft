/**
 * **The demo's bots, walked on a live dev server** (design/DEMO.md Stage 4;
 * Q1535) — `npm run demo-bots-walk -- <base>`.
 *
 * Against a dev server booted with
 *   DRAFT_DEMO_KEY=walk DRAFT_DEMO_STUB=1 DRAFT_DEMO_LAPSE_MS=10000
 * (the stub model, so no walk ever calls the Claude API; a ten-second
 * heartbeat lapse so the walk need not wait two minutes). It builds a busy
 * document with the phase ladder, points the bots at it through the dev
 * target route, and drives them through the panel's own routes with the demo
 * key's cookie:
 *
 *   1. ▶️ four stub bots at *frantic*, beating, for 60 s: the logs grow by 20
 *      or more, bots judged and proposed, and **a swap stands as a live
 *      two-hunk candidate** (each slot's time written back is asserted by
 *      `demo-model.test.ts` on the PizzaCon shape; the ladder's charter has
 *      no times);
 *   2. ⏸️ by hand: no bot acts; ▶️ resumes;
 *   3. **the heartbeat lapses**: the run pauses within the lapse and a
 *      second, and no bot acts for the next ten (the host's own minute tick
 *      may still adopt a race meanwhile, which is the document, not a bot);
 *   4. **the run clock** (a shortened ten minutes, `devRunMs`) pauses a run;
 *   5. **the spend cap** (a shortened $3, `devCapUsd`) pauses a run, the
 *      stub pricing its calls as a model's.
 *
 * Stage 2–3's parts of DEMO.md's full `demo-walk` — the reset, two phones
 * pressing *Try it* — join this walk when those stages are merged beside it.
 * That the bots act through `applyCommand` alone is `demo-bots.test.ts`'s
 * assertion; this walk asserts what the room sees.
 */
import { createHmac } from 'node:crypto';
import { assertServerBuild, walkBase } from './lib/assert-server.mjs';
import { arg, post, say, sleep } from './lib/walk.mjs';

const BASE = walkBase(process.argv, process.env, 'http://127.0.0.1:8199');
const KEY = arg('key', process.env.DRAFT_DEMO_KEY || 'walk');
await assertServerBuild(BASE, 'demo-bots-walk');

const fails = [];
const check = (ok, what) => { say(`${ok ? '✓' : '✗'} ${what}`); if (!ok) fails.push(what); };
const die = (why) => { console.error(`demo-bots-walk: ${why}`); process.exit(1); };

// the demo key's cookie, minted the way demo-key.ts mints it
const exp = Date.now() + 86_400_000;
const demo = `draft_demo=${exp}.${createHmac('sha256', KEY).update(`draft-demo.${exp}`).digest('base64url')}`;

const readout = async () => {
  const r = await fetch(`${BASE}/api/demo/bots`, { headers: { cookie: demo } });
  if (r.status === 404) die('the server has no DRAFT_DEMO_KEY — boot it with DRAFT_DEMO_KEY=walk DRAFT_DEMO_STUB=1 DRAFT_DEMO_LAPSE_MS=10000');
  if (r.status === 401) die(`the server's DRAFT_DEMO_KEY is not '${KEY}' (pass --key=)`);
  return r.json();
};
const bots = async (body) => {
  const r = await post(BASE, '/api/demo/bots', body, demo);
  const j = await r.json();
  if (!r.ok) die(`${body.action} refused: ${j.error}`);
  return j.bots;
};
const beat = () => post(BASE, '/api/demo/heartbeat', {}, demo);

const first = await readout();
if (!first.claudeKey) die('no brain on this server — boot it with DRAFT_DEMO_STUB=1');

// -- a busy document: the ladder's session rung, seated as its founder
const lr = await post(BASE, '/api/dev/ladder', { to: 'session' });
if (!lr.ok) die(`the ladder refused: ${await lr.text()}`);
const { slug } = await lr.json();
const founder = (lr.headers.get('set-cookie') || '').split(';')[0];
say(`document /d/${slug}`);
const tr = await post(BASE, '/api/dev/demo-target', { slug }, demo);
if (!tr.ok) die(`the dev target route refused: ${await tr.text()}`);
const { seats } = await tr.json();
check(seats >= 4, `the document has ${seats} bot seats (4 or more)`);

const logs = async () => {
  const v = await (await fetch(`${BASE}/api/d/${slug}/view`, { headers: { cookie: founder } })).json();
  return { n: v.seq + v.eseq, v };
};

// -- 1. four frantic bots for sixty seconds
const before = (await logs()).n;
await bots({ action: 'start', count: 4, pace: 'frantic', model: 'claude-haiku-4-5', devRunMs: 600_000, devCapUsd: 50, devLapseMs: 10_000 });
for (let i = 0; i < 12; i++) { await sleep(5_000); await beat(); }
let s = await readout();
const { n: after, v } = await logs();
say(`acts: ${JSON.stringify(s.acts)} · calls ${s.calls} · $${s.runUsd}`);
check(after - before >= 15, `the logs grew by ${after - before} (15 or more)`);
check(s.acts.judgments >= 1, `bots judged (${s.acts.judgments})`);
check(s.acts.proposals >= 1, `bots proposed (${s.acts.proposals})`);
check(s.acts.swaps >= 1, `a bot proposed a swap (${s.acts.swaps})`);
const twoHunk = (v.clauses || []).some((c) => (c.candidates || []).some((cand) => (cand.hunks || []).length === 2));
check(twoHunk, 'a swap stands as a live two-hunk candidate');
check(s.acts.refused === 0, `no bot command was refused for anything but an ordinary race (${s.acts.refused})`);

// -- 2. ⏸️ by hand, then ▶️
s = await bots({ action: 'pause' });
check(s.state === 'paused' && s.pausedBy === 'hand', '⏸️ pauses the run');
// what the bots did is what must stand still — the host's own minute tick may
// still adopt a race in the window, and that is the document, not a bot
const busy = (x) => x.calls + Object.values(x.acts).reduce((a, b) => a + b, 0);
await sleep(1_000);
const held = busy(await readout());
const heldLog = (await logs()).n;
await sleep(4_000);
check(busy(await readout()) === held, `no bot acts while paused (the logs moved by ${(await logs()).n - heldLog})`);
s = await bots({ action: 'resume' });
check(s.state === 'running', '▶️ resumes');

// -- 3. the heartbeat lapses
const lastBeat = Date.now();
let paused = null;
while (Date.now() - lastBeat < 20_000) {
  s = await readout();
  if (s.state === 'paused') { paused = Date.now(); break; }
  await sleep(250);
}
check(s.pausedBy === 'heartbeat', `the run paused on the heartbeat (${s.pausedBy})`);
check(paused !== null && paused - lastBeat <= s.lapseMs + 1_500,
  `within the lapse and a second (${paused === null ? '—' : paused - lastBeat} ms, lapse ${s.lapseMs})`);
await sleep(1_000);
const quiet = busy(await readout());
const quietLog = (await logs()).n;
await sleep(10_000);
check(busy(await readout()) === quiet, `no bot acts for ten seconds after (the logs moved by ${(await logs()).n - quietLog})`);

// -- 4. the run clock
await bots({ action: 'start', count: 4, pace: 'frantic', devRunMs: 8_000, devCapUsd: 50, devLapseMs: 10_000 });
for (let i = 0; i < 24 && (s = await readout()).state === 'running'; i++) { await beat(); await sleep(500); }
check(s.pausedBy === 'run-clock', `the run clock paused the run (${s.pausedBy})`);

// -- 5. the spend cap
await bots({ action: 'start', count: 4, pace: 'frantic', devRunMs: 600_000, devCapUsd: 0.03, devLapseMs: 10_000 });
for (let i = 0; i < 120 && (s = await readout()).state === 'running'; i++) { await beat(); await sleep(500); }
check(s.pausedBy === 'spend' && s.runUsd >= 0.03, `the spend cap paused the run ($${s.runUsd} of $${s.capUsd})`);

await bots({ action: 'stop' });
if (fails.length) {
  console.error(`demo-bots-walk: ${fails.length} failed — ${fails.join('; ')}`);
  process.exit(1);
}
say('demo-bots-walk: green');
