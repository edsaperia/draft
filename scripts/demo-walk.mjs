/**
 * **The demo, walked whole on a live dev server** (`demo-walk`, design/DEMO.md
 * Stages 1–5; Q1535) — `npm run demo-walk -- <base> [--key=walk] [--shots=<dir>]`.
 *
 * Against a dev server booted with
 *   DRAFT_DEMO_KEY=walk DRAFT_DEMO_STUB=1 DRAFT_DEMO_LAPSE_MS=10000
 * (the stub model, so no walk ever calls the Claude API; a ten-second
 * heartbeat lapse so the walk need not wait two minutes). Everything goes
 * through the routes Ed's panel and a visitor's phone use:
 *
 *   1. **Ed's key**: `/d/demo?demokey=` sets the `draft_demo` cookie and takes
 *      the key out of the address; ↺ Reset builds a new generation.
 *   2. **two phones join**: `POST /api/demo/join` seats two visitors under two
 *      made-up names, the grants already accepted; a second tap from the first
 *      phone is its own seat again.
 *   3. **Ed starts the bots** on the stub, four at *frantic*, beating: the
 *      bots vote, propose and OK; **a swap stands as a live two-hunk
 *      candidate** with each slot's time still in its heading; the bots are the
 *      preset's cast minus the Founder, never a visitor.
 *   4. **a visitor votes** on a pair dealt to their phone, mid-run.
 *   5. ⏸️ holds the bots still; ▶️ resumes.
 *   6. **the heartbeat lapses**: the run pauses within the lapse and a second.
 *   7. **Reset** stops the bots and clears the visitors: both phones read the
 *      stranger's door, and the panel counts no visitors.
 *
 * With `--shots=<dir>`, two screenshots while the bots run (Playwright):
 * `panel-bots-1600.png` (Ed in the Founder's seat, the panel with the bot
 * controls) and `visitor-phone-390.png` (phone A's page). Calls
 * `assert-server` first, like every attaching walk. Exit 0 only if all pass.
 */
import { join } from 'node:path';
import { assertServerBuild, walkBase } from './lib/assert-server.mjs';
import { arg, post, say, sleep } from './lib/walk.mjs';

const BASE = walkBase(process.argv, process.env, 'http://127.0.0.1:8203');
const KEY = arg('key', process.env.DRAFT_DEMO_KEY || 'walk');
const SHOTS = arg('shots', null);
await assertServerBuild(BASE, 'demo-walk');

const fails = [];
const check = (ok, what) => { say(`${ok ? '✓' : '✗'} ${what}`); if (!ok) fails.push(what); };
const die = (why) => { console.error(`demo-walk: ${why}`); process.exit(2); };
/** The `name=value` pairs a response set, by name. */
const cookiesOf = (r) => {
  const out = {};
  const all = typeof r.headers.getSetCookie === 'function' ? r.headers.getSetCookie() : [r.headers.get('set-cookie') || ''];
  for (const c of all) {
    const pair = c.split(';')[0];
    const eq = pair.indexOf('=');
    if (eq > 0) out[pair.slice(0, eq)] = pair;
  }
  return out;
};

const health = await (await fetch(`${BASE}/healthz`)).json();
if (!health.demo || health.demo.state !== 'built') die(`the demo document is not built: ${JSON.stringify(health.demo)}`);

// -- 1. Ed's key, then Reset ------------------------------------------------
const door = await fetch(`${BASE}/d/demo?demokey=${encodeURIComponent(KEY)}`, { redirect: 'manual' });
const ed = cookiesOf(door).draft_demo;
if (!ed) die(`/d/demo?demokey= set no cookie (${door.status}) — boot the server with DRAFT_DEMO_KEY=${KEY}`);
check(door.status === 302 && door.headers.get('location') === '/d/demo', 'the key sets the cookie and redirects to /d/demo');
const panel = async () => (await fetch(`${BASE}/api/demo/panel`, { headers: { cookie: ed } })).json();
const p0 = await panel();
if (!p0.bots || !p0.bots.claudeKey) die('no brain on this server — boot it with DRAFT_DEMO_STUB=1');
const reset = await post(BASE, '/api/demo/reset', {}, ed);
const p1 = await reset.json();
check(reset.ok && p1.generation === p0.generation + 1, `Reset builds a new generation (${p0.generation} → ${p1.generation})`);
const founder = p1.seats.find((s) => s.founder);
const castIds = new Set(p1.seats.map((s) => s.id));
check(p1.bots.seats === p1.seats.length - 1, `the bots' seats are the cast minus the Founder (${p1.bots.seats} of ${p1.seats.length})`);
check(p1.visitors === 0, 'a fresh generation has no visitors');

// -- 2. two phones join ----------------------------------------------------
const join1 = async (cookie) => {
  const r = await post(BASE, '/api/demo/join', {}, cookie);
  const j = await r.json();
  const set = Object.entries(cookiesOf(r)).find(([k]) => k !== 'draft_demo');
  return { ok: r.ok, ...j, cookie: set ? set[1] : cookie };
};
const a = await join1(null);
const b = await join1(null);
check(a.ok && b.ok && a.member !== b.member && a.name !== b.name,
  `two phones, two seats, two names (${a.name} · ${b.name})`);
check(!castIds.has(a.member) && !castIds.has(b.member), 'a visitor is never a cast seat');
const again = await join1(a.cookie);
check(again.member === a.member && again.rejoined === true, 'a second tap from the first phone is its own seat');
const viewOf = async (cookie) => (await fetch(`${BASE}/api/d/demo/view`, { headers: cookie ? { cookie } : {} })).json();
const va = await viewOf(a.cookie);
check(va.me === a.member && Array.isArray(va.preAcked) && va.preAcked.length === 3,
  'the visitor\'s page arrives with the grants accepted');
check((await panel()).visitors === 2, 'the panel counts two visitors');

// -- 3. the bots, on the stub ---------------------------------------------
const bots = async (body) => {
  const r = await post(BASE, '/api/demo/bots', body, ed);
  const j = await r.json();
  if (!r.ok) die(`${body.action} refused: ${j.error}`);
  return j.bots;
};
const readout = async () => (await fetch(`${BASE}/api/demo/bots`, { headers: { cookie: ed } })).json();
const beat = () => post(BASE, '/api/demo/heartbeat', {}, ed);
// Ed's own seat for the logs: the Founder's (the seat switch sets its cookie)
const seat = await post(BASE, '/api/demo/seat', { member: founder.id }, ed);
const edSeat = Object.entries(cookiesOf(seat)).find(([k]) => k !== 'draft_demo')?.[1];
check(seat.ok && !!edSeat, `Ed sits in the Founder's seat (${founder.name})`);
const edBoth = `${ed}; ${edSeat}`;
const logs = async () => {
  const v = await viewOf(edBoth);
  return { n: v.seq + v.eseq, v };
};
const before = (await logs()).n;
let s = await bots({ action: 'start', count: 4, pace: 'frantic', model: 'claude-haiku-4-5',
  devRunMs: 600_000, devCapUsd: 50, devLapseMs: 10_000 });
check(s.state === 'running' && s.count === 4 && s.brain === 'stub', `▶️ starts four stub bots (${s.state}, ${s.brain})`);

let shotsTaken = false;
const takeShots = async () => {
  if (!SHOTS || shotsTaken) return;
  shotsTaken = true;
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const toCookies = (str) => str.split(';').map((x) => x.trim()).filter(Boolean).map((pair) => {
    const eq = pair.indexOf('=');
    return { name: pair.slice(0, eq), value: pair.slice(eq + 1), url: BASE };
  });
  const desk = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  await desk.addCookies(toCookies(edBoth));
  const dp = await desk.newPage();
  await dp.goto(`${BASE}/d/demo`, { waitUntil: 'load' });
  await dp.waitForSelector('#demopanel .demobots [data-b="line"]', { timeout: 20_000 });
  await sleep(6_000); // the readout's own poll, and a few bot acts
  await dp.screenshot({ path: join(SHOTS, 'panel-bots-1600.png') });
  const line = await dp.textContent('#demopanel .demobots [data-b="line"]');
  check(/bots: 4 frantic/.test(line || ''), `the panel's bot row reads the run (${(line || '').slice(0, 80)})`);
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
    isMobile: true, hasTouch: true });
  await phone.addCookies(toCookies(a.cookie));
  const pp = await phone.newPage();
  await pp.goto(`${BASE}/d/demo`, { waitUntil: 'load' });
  await sleep(5_000);
  // down to the programme, where the races the bots are running stand
  await pp.evaluate(() => {
    const h = [...document.querySelectorAll('#prose h2, #prose h3, .doc h2, .doc h3')]
      .find((x) => /Day 2/.test(x.textContent || ''));
    if (h) h.scrollIntoView({ block: 'start' }); else window.scrollTo(0, 2400);
  });
  await sleep(800);
  await pp.screenshot({ path: join(SHOTS, 'visitor-phone-390.png') });
  check(await pp.$('#demopanel') === null, 'a visitor\'s phone draws no demo panel');
  say(`  shots · ${join(SHOTS, 'panel-bots-1600.png')} · ${join(SHOTS, 'visitor-phone-390.png')}`);
  await browser.close();
};

// the heartbeat on its own clock while the run is meant to live — the panel's
// tab beats every 30 s, faster than the walk's ten-second lapse can wait for
const beating = setInterval(() => { void beat(); }, 2_000);
for (let i = 0; i < 12; i++) {
  await sleep(5_000);
  if (i === 3) await takeShots();
}
s = await readout();
const { n: after, v } = await logs();
say(`acts: ${JSON.stringify(s.acts)} · calls ${s.calls} · $${s.runUsd}`);
check(after - before >= 20, `the logs grew by ${after - before} (20 or more)`);
check(s.acts.judgments >= 1, `bots voted (${s.acts.judgments})`);
check(s.acts.proposals >= 1, `bots proposed (${s.acts.proposals})`);
check(s.acts.swaps >= 1, `a bot proposed a swap (${s.acts.swaps})`);
check(s.acts.refused === 0, `no bot command was refused for anything but an ordinary race (${s.acts.refused})`);
// a swap as the room sees it: two hunks, each a session heading keeping its slot's time
const lines = String(v.text ?? '').split('\n');
const timeOf = (l) => (/^###\s+(\d\d:\d\d)\b/.exec(l || '') || [])[1] || null;
const swaps = (v.clauses || []).flatMap((c) => c.candidates || [])
  .filter((cand) => (cand.hunks || []).length === 2 && cand.hunks.every((h) => timeOf(h.lines && h.lines[0])));
check(swaps.length >= 1, `a swap stands as a live two-hunk candidate (${swaps.length})`);
const timesKept = swaps.every((cand) => cand.hunks.every((h) => {
  const was = timeOf(lines[h.start]);
  return was === null || was === timeOf(h.lines[0]);
}));
check(timesKept, 'each swapped slot keeps its time in its heading');

// -- 4. a visitor votes, mid-run ---------------------------------------------
const vb = await viewOf(b.cookie);
const card = (vb.raceCards || [])[0];
if (card) {
  const r = await post(BASE, `/api/d/demo/cmd`, { cmd: 'judge-race', args: { a: card.a.id, b: card.b.id, outcome: 'a' } }, b.cookie);
  check(r.ok, `a visitor votes on a pair dealt to their phone (${r.status})`);
} else {
  check(false, 'a pair was dealt to the second phone');
}

// -- 5. ⏸️ and ▶️ -------------------------------------------------------------
const busy = (x) => x.calls + Object.values(x.acts).reduce((m, n) => m + n, 0);
s = await bots({ action: 'pause' });
check(s.state === 'paused' && s.pausedBy === 'hand', '⏸️ pauses the run');
await sleep(1_000);
const held = busy(await readout());
await sleep(4_000);
check(busy(await readout()) === held, 'no bot acts while paused');
s = await bots({ action: 'resume' });
check(s.state === 'running', '▶️ resumes');
clearInterval(beating);

// -- 6. the heartbeat lapses --------------------------------------------------
const lastBeat = Date.now();
let pausedAt = null;
while (Date.now() - lastBeat < 20_000) {
  s = await readout();
  if (s.state === 'paused') { pausedAt = Date.now(); break; }
  await sleep(250);
}
check(s.pausedBy === 'heartbeat', `the run paused on the heartbeat (${s.pausedBy})`);
check(pausedAt !== null && pausedAt - lastBeat <= s.lapseMs + 1_500,
  `within the lapse and a second (${pausedAt === null ? '—' : pausedAt - lastBeat} ms, lapse ${s.lapseMs})`);

// -- 7. Reset: the bots stop, the visitors go ---------------------------------
s = await bots({ action: 'resume' });
check(s.state === 'running', '▶️ once more, so Reset has a running room to stop');
const r2 = await post(BASE, '/api/demo/reset', {}, ed);
const p2 = await r2.json();
check(r2.ok && p2.bots.state === 'stopped' && p2.bots.stoppedBy === 'reset',
  `Reset stops the bots (${p2.bots.state}, ${p2.bots.stoppedBy})`);
check(p2.visitors === 0, 'Reset clears the visitors');
const [sa, sb] = await Promise.all([viewOf(a.cookie), viewOf(b.cookie)]);
check(!sa.me && !sb.me && sa.stranger === true && sb.stranger === true, 'both phones read the stranger\'s door after Reset');

if (fails.length) {
  console.error(`demo-walk: ${fails.length} failed — ${fails.join('; ')}`);
  process.exit(1);
}
say('demo-walk: green');
