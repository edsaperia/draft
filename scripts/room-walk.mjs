/**
 * The whole room, against a **running server**: found a document the ordinary
 * way, invite fifteen members, arrive every one of them through their own
 * mailed link, settle the constitution, begin — then have one member propose,
 * every other member judge, and the text actually change. Twice. Then the
 * same loop on a ladder document whose Text carries the founder's 🛡️, where
 * the proposal must *park* as a 👑 crown question and adopt only on the
 * founder's accept.
 *
 * This exists because `journey-walk.mjs` stops at "a keystroke opens a
 * proposal": no second member had ever been served the race, no race had
 * ever adopted, on the live path, under automation. The two bugs this walk
 * was written against (2026-09-05):
 *
 *   · a fresh proposal reached nobody — every seat's hand held only older
 *     races, and the new card arrived only after a member cleared 3–11 of
 *     them (the router's hot set is the top-3 valued races, and a race with
 *     no evidence was valued below every race with some);
 *   · a unanimous, floor-clearing race sat unadopted for ever behind a
 *     standing parked candidate (R-056: no text adoption of any kind while
 *     a candidate is parked — correct, and completely silent).
 *
 * So this walk asserts the serving *strictly*: every member who views the
 * document before the race resolves must find the new race's card in that
 * very view. Do not weaken that to "within K judgments" — on the day, K
 * judgments of other races reads as "nothing happened".
 *
 *   DRAFT_COOLDOWN_MS=0 npm run server   # in another shell
 *   node scripts/room-walk.mjs [<base-url>] [--seed=<n>]
 *
 * **The cooldown must be 0** and the walk refuses a server where it is not:
 * the second adoption of phase A would otherwise wait out a real cooldown
 * (§4.2 allows up to 5 minutes), which no CI walk can sit through. CI boots
 * this walk its own server for exactly that reason — the shared walk server
 * keeps the default cooldown because the ladder's seeded history was built
 * under it.
 *
 * The sweep runs at every judgment on a cooldown-0 server, so the race
 * resolves the moment floor and bar are both crossed — usually before the
 * whole roster has spoken. That is the mechanism, not a flake: the loop
 * stops asserting serving once the race has resolved (phase A: adopted;
 * phase B: parked), and asserts the resolution instead.
 */
import { assertServerBuild, walkBase } from './lib/assert-server.mjs';

const BASE = walkBase(process.argv, process.env, 'http://127.0.0.1:8140');
const SEED = Number((process.argv.find((a) => a.startsWith('--seed=')) || '').split('=')[1] || 11);
const say = (...a) => console.log(...a);
let failures = 0;
const fail = (msg) => { failures++; console.error(`  ✗ ${msg}`); };
const must = (cond, msg) => { if (cond) say(`  ✓ ${msg}`); else fail(msg); };
const die = (msg) => { console.error(`room-walk: ${msg}`); process.exit(1); };

const health = await assertServerBuild(BASE, 'room-walk');
say(`room-walk against ${BASE} · build ${health.build ?? 'unreported'}`);
if (health.cooldownMs !== 0) {
  die(`this server's adoption cooldown is ${health.cooldownMs}ms — phase A adopts twice ` +
    `in one document, and the second adoption cannot wait a real cooldown out. ` +
    `Boot the server with DRAFT_COOLDOWN_MS=0 for this walk.`);
}

// -- the wire, the same shapes the page sends --------------------------------
const jars = new Map(); // who → cookie
const post = (path, body, cookie) => fetch(BASE + path, {
  method: 'POST',
  headers: { 'content-type': 'application/json', origin: BASE,
    ...(cookie ? { cookie } : {}) },
  body: JSON.stringify(body),
});
/** A refused command is a walk failure that names itself (journey's rule). */
const cmd = async (who, name, args = {}) => {
  const r = await post(`/api/d/${SLUG}/cmd`, { cmd: name, args }, jars.get(who));
  const j = await r.json().catch(() => ({}));
  if (!r.ok) die(`${who} · ${name} refused (${r.status}): ${JSON.stringify(j)}`);
  return j.result ?? j;
};
const view = async (who) => {
  const r = await fetch(`${BASE}/api/d/${SLUG}/view`, { headers: { cookie: jars.get(who) } });
  if (!r.ok) die(`${who} · view answered ${r.status}`);
  return r.json();
};
/** Follow a magic link the way a browser does: the interstitial GET, then its
 * own token POSTed back, the 302's cookie being the arrival (server.test.ts's
 * `consume`). */
const follow = async (link, who) => {
  const u = new URL(link);
  await fetch(u.origin + u.pathname + u.search); // the interstitial
  const r = await fetch(u.origin + u.pathname, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', origin: u.origin },
    body: new URLSearchParams({ token: u.searchParams.get('token') ?? '' }).toString(),
    redirect: 'manual',
  });
  if (r.status !== 302) die(`${who}'s magic link answered ${r.status}, not 302`);
  jars.set(who, r.headers.get('set-cookie').split(';')[0]);
};
const outboxLinkTo = async (addr) => {
  const r = await fetch(`${BASE}/api/dev/outbox`);
  if (!r.ok) die(`GET /api/dev/outbox answered ${r.status} — this walk needs a dev outbox (no RESEND_API_KEY)`);
  const { mails } = await r.json();
  const mail = mails.find((m) => m.to === addr && m.link); // newest first
  if (!mail) die(`no outbox mail to ${addr}`);
  return mail.link;
};

/**
 * The loop itself, shared by both phases: `author` proposes `newLine` over the
 * document line matching `pick`, then every other seat views once — the new
 * race's card must be in that view — and judges for it, until the race
 * resolves. `resolved(v)` says what resolution means here (adopted for phase
 * A, parked for phase B); returns the candidate id.
 */
async function proposeAndVote({ author, seats, pick, newLine, why, resolved }) {
  const v = await view(author);
  const lines = v.text.split('\n');
  const contested = new Set((v.clauses ?? []).flatMap((c) => c.contested.map((x) => x.start)));
  const li = lines.findIndex((l, i) => pick(l, i) && !contested.has(i));
  if (li < 0) die(`no line to propose over (pick found nothing uncontested)`);
  const p = await cmd(author, 'propose-text', {
    baseVersion: v.textVersion,
    hunks: [{ start: li, end: li + 1, lines: [newLine] }],
    why,
  });
  const cid = p.id;
  say(`  ${author} proposed ${cid} over line ${li}`);
  let voters = 0;
  for (const m of seats) {
    if (m === author) continue;
    const x = await view(m);
    if (await resolved(cid)) {
      say(`  race resolved after ${voters} judgments — ${seats.length - 1 - voters} seats never needed asking`);
      return cid;
    }
    // The strict serving assertion, the point of this walk: the very next
    // view after the proposal (or after any number of *other* members'
    // judgments) must hold the new race's card. SPEC §8.1 prices
    // new-candidate measurement as exploration and §8.2 asks the unheard
    // before their silence is foreclosed; a member who has to clear their
    // whole hand first is starvation, not routing.
    const card = (x.raceCards ?? []).find((c) => c.a.id === cid || c.b.id === cid);
    if (!card) {
      fail(`${m} was NOT served ${cid} in their next view — hand held ` +
        `[${(x.raceCards ?? []).map((c) => c.raceId).join(', ')}]`);
      continue;
    }
    await cmd(m, 'judge-race', { a: card.a.id, b: card.b.id,
      outcome: card.a.id === cid ? 'a' : 'b' });
    voters++;
  }
  must(await resolved(cid), `the race resolved by the time the whole room had spoken (${voters} judgments)`);
  return cid;
}

// ===========================================================================
// Phase A — a document founded the ordinary way adopts, twice.
// ===========================================================================
say('\nPhase A — the ordinary document');
const run = Date.now().toString(36);
const created = await (await post('/api/docs', {
  title: `Room Walk ${run}`, email: `founder-${run}@example.org`,
})).json();
if (!created.ok || !created.devLink) die(`creation refused: ${JSON.stringify(created)}`);
let SLUG = created.slug;
await follow(created.devLink, 'founder');
say(`  founded ${SLUG}`);

// six lines the ordinary way: a heading and five clauses, each long enough
// to be a real paragraph (blocksOf: one line, one block)
await cmd('founder', 'confirm-starting-text', { text: [
  `# Room Walk Charter ${run}`,
  'The club shall meet weekly in the oak room, on the same evening each week.',
  'Minutes shall be kept for every meeting and published to all of the members.',
  'The kitchen is shared by everybody and cleaned according to a posted rota.',
  'A guest may attend at most two meetings before being proposed as a member.',
  'Any dispute over these rules is settled by a show of hands at a meeting.',
].join('\n') });

const members = Array.from({ length: 15 }, (_, i) => `w${i + 1}`);
for (const m of members) await cmd('founder', 'invite', { email: `${m}-${run}@example.org` });
for (const m of members) await follow(await outboxLinkTo(`${m}-${run}@example.org`), m);
say(`  invited and arrived ${members.length} members`);

// settle the constitution founder-held throughout (server.test.ts's values;
// nothing delegated, so nothing blocks 🍾 on an unanswered question)
await cmd('founder', 'set-setting', { setting: 'rate', value: { grant: 4, cap: 8, dripMinutes: 240 } });
for (const [setting, value] of Object.entries({
  pace: { shape: 'fixed' },
  quorum: { form: 'share', n: 60 },
  authorship: { rung: 'sealed' },
  judgments: { rung: 'after' },
  applications: { holder: 'members', apply: true },
  admission: { price: 'proposal' },
  machines: { enabled: false, budget: 0 },
  lapse: { afterMs: null },
  ending: { endsAtMs: Date.now() + 7 * 24 * 3600_000 },
  bar: { pct: 60 },
  chamber: { rung: 'link' },
})) {
  await cmd('founder', 'reclaim', { setting });
  await cmd('founder', 'set-setting', { setting, value });
}
const ready = await view('founder');
if (!ready.readiness?.ready) die(`🍾 not ready: ${JSON.stringify(ready.readiness?.waiting)}`);
await cmd('founder', 'begin', {});
say('  constitution settled, document begun');

const adoptedState = async (cid) => {
  const x = await view('founder');
  const rec = (x.records ?? []).find((r) => r.candidateId === cid
    || r.field?.some((f) => f.candidateId === cid));
  return rec?.outcome === 'adopted';
};
const seatsA = ['founder', ...members];
for (const [round, [pickWord, newLine]] of [
  ['oak room', 'The club shall meet twice weekly in the oak room, keeping the same evenings.'],
  ['rota', 'The kitchen is shared by everybody and cleaned by a rota agreed each month.'],
].entries()) {
  say(`\n  round ${round + 1}:`);
  const author = members[round]; // a different author each round
  const cid = await proposeAndVote({
    author, seats: seatsA,
    pick: (l) => l.includes(pickWord) && !l.startsWith('#'),
    newLine, why: `room-walk round ${round + 1}`,
    resolved: adoptedState,
  });
  const after = await view(author);
  must(after.text.includes(newLine), `round ${round + 1}: the document's text changed`);
  const rec = (after.records ?? []).find((r) => r.candidateId === cid
    || r.field?.some((f) => f.candidateId === cid));
  must(rec?.outcome === 'adopted', `round ${round + 1}: a record with outcome 'adopted' exists`);
  const mine = (after.mine ?? []).find((c) => c.id === cid);
  must(mine && mine.state !== 'live', `round ${round + 1}: the author's own entry left 'live' (${mine?.state})`);
}
{
  // and no crown question anywhere: an ordinary 🍾 laid the powers down, so
  // adoption is direct — this is the control for phase B's park
  const f = await view('founder');
  const textTasks = (f.view.crownTasks ?? []).filter((t) => t.text);
  must(textTasks.length === 0, `no text crown question on the ordinary document`);
}

// ===========================================================================
// Phase B — a ladder document with 🛡️ on the Text parks, then adopts on the
// founder's accept.
// ===========================================================================
say(`\nPhase B — the ladder document (seed ${SEED})`);
const lad = await (await post('/api/dev/ladder', { to: 'session', seed: SEED })).json();
if (!lad.slug) die(`ladder refused: ${JSON.stringify(lad)}`);
SLUG = lad.slug;
jars.clear();
for (const s of lad.seats) {
  const r = await post('/api/dev/seat', { slug: SLUG, member: s.id });
  if (!r.ok) die(`seat ${s.id} refused: ${await r.text()}`);
  jars.set(s.id, r.headers.get('set-cookie').split(';')[0]);
}
say(`  built ${SLUG}, seated ${lad.seats.length}`);

{
  const f = await view('founder');
  const st = (f.view.settings ?? []).find((s) => s.setting === 'startingText');
  if (!st?.powers?.assent) {
    die(`seed ${SEED} no longer reserves 🛡️ on the Text — phase B needs one that does`);
  }
  say(`  ✓ the Text carries the founder's 🛡️ (the park precondition)`);
  // Drain the standing parks first. R-056: no text adoption of any kind
  // while a candidate is parked — and each reject immediately parks the
  // next ready candidate, so this is a loop, not a pass. Without it the
  // walk's own proposal queues invisibly behind the seed's, which is the
  // exact silence the 2026-09-05 probe found.
  for (let i = 0; i < 20; i++) {
    const tasks = ((await view('founder')).view.crownTasks ?? []).filter((t) => t.text);
    if (tasks.length === 0) break;
    await cmd('founder', 'answer-crown-question', { question: tasks[0].id, outcome: 'reject' });
    say(`  drained standing park ${tasks[0].id} (${tasks[0].text.candidateId})`);
  }
  const left = ((await view('founder')).view.crownTasks ?? []).filter((t) => t.text);
  must(left.length === 0, `the seed's standing parks are drained`);
}

const parkOf = async (cid) => {
  const f = await view('founder');
  return (f.view.crownTasks ?? []).find((t) => t.text?.candidateId === cid) ?? null;
};
const seatsB = lad.seats.map((s) => s.id);
const authorB = seatsB.find((s) => s !== 'founder');
const cidB = await proposeAndVote({
  author: authorB, seats: seatsB,
  pick: (l, i) => i > 0 && !l.startsWith('#') && l.length > 20,
  newLine: 'ROOMWALK: this line was proposed by the room walk and parked at the veto.',
  why: 'room-walk park probe',
  resolved: async (cid) => (await parkOf(cid)) !== null,
});
const park = await parkOf(cidB);
must(park !== null, `the proposal parked: a 👑 crown question stands for the founder`);
if (park === null) {
  console.error(`\nroom-walk: ${failures} failure(s) — no park to accept, stopping here`);
  process.exit(1);
}
{
  const x = await view(authorB);
  must(!x.text.includes('ROOMWALK:'), `the text did not change while parked`);
  await cmd('founder', 'answer-crown-question', { question: park.id, outcome: 'accept' });
  const after = await view(authorB);
  must(after.text.includes('ROOMWALK:'), `the founder's accept adopted the parked text`);
  const rec = (after.records ?? []).find((r) => r.candidateId === cidB
    || r.field?.some((f) => f.candidateId === cidB));
  must(rec?.outcome === 'adopted', `a record with outcome 'adopted' exists for the parked candidate`);
  const mine = (after.mine ?? []).find((c) => c.id === cidB);
  must(mine && mine.state !== 'live', `the author's own entry left 'live' (${mine?.state})`);
}

if (failures > 0) { console.error(`\nroom-walk: ${failures} failure(s)`); process.exit(1); }
say('\nroom-walk: all green');
