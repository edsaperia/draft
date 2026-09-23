#!/usr/bin/env node
/**
 * rehearsal — **the whole night, headless, before anybody real is in the room**
 * (Ed, 2026-09-19: a headless rehearsal the night before the room).
 *
 * found-residency.mjs founds a document and stops at 🍾. This one founds a
 * *short-lived* one — every setting held and set by the Founder, so 🍾 is ready
 * at once — presses 🍾 keeping **🛡️ on the Text alone**, and then stays at the
 * three posts a person would be at during a live room until the clock closes it:
 *
 *   · **the Founder's Accept** — with the veto kept on the Text every text
 *     adoption parks as a 👑 crown question, so nothing the room carries stands
 *     until the Founder answers it. Every park is accepted, except that the
 *     third (if three arrive) is refused, so both roads are walked.
 *   · **the feed watcher** — `GET /api/d/:slug/feed` exactly as `design/feed.js`
 *     polls it: one load without `since`, then `?since=<eseq>` for ever. A rule
 *     change made after 🍾 has to arrive on *that* poll and not only on a fresh
 *     load (issue #68 finding 1 is the defect this watches for).
 *   · **health** — `/healthz` every thirty seconds, with the round-trip of it and
 *     of one Founder `view` beside it, because the thing that will go wrong in a
 *     real room is latency long before it is logic.
 *
 * And then the close: the clock closes the document, the Founder signs, and the
 * record is read twice — once in full and once on a **slim** poll (issue #30
 * finding 1: a signature is a write, so everybody else's next poll is slim, and
 * the record must not come back empty at the one moment the whole room is
 * looking at it).
 *
 * It starts no bots. It prints the `room-bots` line to run beside it.
 *
 *   node scripts/repro/rehearsal.mjs --base http://127.0.0.1:8350 --minutes 8
 *
 * There is **no default base**: a rehearsal driver that would point at docs.vote
 * because an argument was forgotten is not one.
 */
import { readFileSync } from 'node:fs';

/* ---- argv ---------------------------------------------------------------- */

const argv = process.argv.slice(2);
/** `--name value` or `--name=value`, room-bots' own reader. */
const flag = (name, dflt = null) => {
  const eq = argv.find((a) => a.startsWith(`--${name}=`));
  if (eq !== undefined) return eq.slice(name.length + 3);
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : dflt;
};

if (argv.includes('--help') || argv.includes('-h')) {
  console.log(`usage: node scripts/repro/rehearsal.mjs --base <url> [--slug <slug>] ` +
    `[--minutes 25] [--bots 8]\n` +
    `  --base     the host to rehearse against (or DRAFT_BASE_URL). No default: docs.vote is\n` +
    `             never reached by forgetting an argument.\n` +
    `  --slug     the document's address (default rehearsal-<MMDD-HHmm>)\n` +
    `  --minutes  how long the document lives after 🍾 before the clock closes it (default 25)\n` +
    `  --bots     how many bots to invite, 1–8 (default 8)\n` +
    `  the bot key comes from DRAFT_BOT_KEY, else .env`);
  process.exit(0);
}

const BASE = String(flag('base', process.env.DRAFT_BASE_URL || '')).replace(/\/$/, '');
if (!BASE) {
  console.error('rehearsal: no --base and no DRAFT_BASE_URL — refusing to run.\n' +
    '  a rehearsal driver has no default host: name the one you mean.');
  process.exit(2);
}
if (!/^https?:\/\//.test(BASE)) { console.error(`rehearsal: --base must be a url, got ${BASE}`); process.exit(2); }

const stamp = () => {
  const d = new Date();
  const two = (n) => String(n).padStart(2, '0');
  return `${two(d.getMonth() + 1)}${two(d.getDate())}-${two(d.getHours())}${two(d.getMinutes())}`;
};
const SLUG = String(flag('slug', `rehearsal-${stamp()}`));
const MINUTES = Number(flag('minutes', '25'));
if (!(MINUTES > 0)) { console.error(`rehearsal: --minutes must be positive, got ${MINUTES}`); process.exit(2); }
const NBOTS = Math.max(1, Math.min(8, Math.floor(Number(flag('bots', '8')) || 8)));

let envFile = '';
try { envFile = readFileSync('.env', 'utf8'); } catch { /* no .env is fine when the key is exported */ }
const KEY = process.env.DRAFT_BOT_KEY || (/^DRAFT_BOT_KEY\s*=\s*"?([^"\r\n]+)"?/m.exec(envFile) ?? [])[1];
if (!KEY) {
  console.error('rehearsal: no DRAFT_BOT_KEY in the environment or .env — the bot outbox is how the\n' +
    '  Founder gets their creation link, so there is nothing to do without it.');
  process.exit(2);
}

const TITLE = 'The Rehearsal Charter';
const FOUNDER = 'rosa.lindqvist@bots.docs.vote';
const BOTS = ['tobias.achebe', 'mei.tanaka', 'idris.farouk', 'clara.benedetti',
  'kofi.mensah', 'hanna.sorensen', 'rafael.quintero', 'aisha.rahman']
  .slice(0, NBOTS).map((n) => `${n}@bots.docs.vote`);

// a charter with something to argue about on every line, and short enough that a
// bot's rival wording is legible in the feed beside it
const TEXT = [
  '# The Rehearsal Charter',
  '## Purpose',
  'This document exists so that the room can be walked end to end before anybody real is in it.',
  'Everything written here is disposable, and nothing in it binds anybody.',
  '## What we agree',
  'Every proposal is read before it is judged.',
  'A rehearsal is not a demonstration: things are allowed to break here.',
  '## The house rules',
  '- Nobody speaks for the room without saying that is what they are doing.',
  '- A change that cannot be explained in one sentence is two changes.',
  '- Silence is an answer, and the clock is what says so.',
  '## The close',
  'When the clock runs out the document closes itself, and whatever stands, stands.',
].join('\n');

/* ---- the terminal -------------------------------------------------------- */

const clock = () => new Date().toTimeString().slice(0, 8);
const say = (s) => console.log(`[${clock()}] ${s}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** every assertion, in the order it was made, for the summary block */
const checks = [];
const must = (ok, what, detail = '') => {
  checks.push({ ok: !!ok, what, detail });
  say(`${ok ? '  ✓' : '  ✗'} ${what}${detail ? ` — ${detail}` : ''}`);
  return !!ok;
};
/** every non-2xx answer, whoever asked for it */
const refusals = [];
/** the worst round trip seen, per kind of call */
const worst = new Map();
const noteRtt = (label, ms) => {
  const hit = worst.get(label);
  if (hit === undefined || ms > hit.ms) worst.set(label, { ms, at: clock() });
};

/* ---- the wire ------------------------------------------------------------ */

const timedFetch = async (label, url, init) => {
  const t0 = Date.now();
  const r = await fetch(url, init);
  noteRtt(label, Date.now() - t0);
  return r;
};

let COOKIE = null;
/**
 * A command as the page sends one. A non-2xx is recorded whoever asked: a
 * refusal nobody wrote down is the shape of half the bugs a live room shows.
 * `soft` means the caller expects it may be refused and will read the null.
 */
const cmd = async (name, args = {}, { soft = false } = {}) => {
  const t0 = Date.now();
  const r = await fetch(`${BASE}/api/d/${SLUG}/cmd`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: BASE, ...(COOKIE ? { cookie: COOKIE } : {}) },
    body: JSON.stringify({ cmd: name, args }),
  });
  noteRtt('cmd', Date.now() - t0);
  const body = await r.text();
  let j = {};
  try { j = JSON.parse(body); } catch { /* a non-JSON body is itself the evidence */ }
  if (!r.ok) {
    refusals.push({ at: clock(), cmd: name, status: r.status, body: body.slice(0, 400), expected: soft });
    const msg = `${name} refused (${r.status}): ${body.slice(0, 300)}`;
    if (soft) { say(`  · ${msg}`); return null; }
    throw new Error(msg);
  }
  return j.result ?? j;
};

/** the Founder's own view; `q` adds the poll's parameters (`since`, `tv`, `rk`). */
const view = async (q = '') => {
  const r = await timedFetch('view', `${BASE}/api/d/${SLUG}/view${q}`, { headers: { cookie: COOKIE } });
  if (!r.ok) {
    const body = await r.text();
    refusals.push({ at: clock(), cmd: `GET view${q}`, status: r.status, body: body.slice(0, 400) });
    throw new Error(`view answered ${r.status}: ${body.slice(0, 200)}`);
  }
  return r.json();
};

const botOutbox = async () => {
  const r = await timedFetch('bots/outbox', `${BASE}/api/bots/outbox`, { headers: { authorization: `Bearer ${KEY}` } });
  if (!r.ok) throw new Error(`bot outbox answered ${r.status}`);
  return (await r.json()).mails;
};

const followLink = async (link) => {
  const u = new URL(link);
  await fetch(u.origin + u.pathname + u.search);
  const r = await fetch(u.origin + u.pathname, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', origin: u.origin },
    body: new URLSearchParams({ token: u.searchParams.get('token') ?? '' }).toString(),
    redirect: 'manual',
  });
  return { status: r.status, cookie: (r.headers.get('set-cookie') ?? '').split(';')[0],
    location: r.headers.get('location') ?? '' };
};

const health = async () => {
  const r = await timedFetch('healthz', `${BASE}/healthz`);
  if (!r.ok) throw new Error(`/healthz answered ${r.status}`);
  return r.json();
};

/* ---- 1. the save --------------------------------------------------------- */

const h0 = await health();
say(`${BASE} · build ${String(h0.build).slice(0, 7)} · store ${h0.store} · cooldown ${h0.cooldownMs}ms · ` +
  `paused=${h0.paused === null ? 'no' : 'YES'} · documents ${h0.documents}`);
if (h0.paused !== null) { console.error('the host is paused — nothing can be written. Stopping.'); process.exit(2); }

const BOTLINE = `node scripts/room-bots.mjs ${BASE}/d/${SLUG} --key=$DRAFT_BOT_KEY ` +
  `--seed=rehearsal --min 10s --max 40s --heat 0.6 --motions 0.05`;
console.log('');
console.log('  ── run this beside the rehearsal, in its own shell ──');
console.log(`  ${BOTLINE}`);
console.log('  (DRAFT_BOT_KEY from .env; without bots nothing is proposed and the run will fail.)');
console.log('');

const saved = await fetch(`${BASE}/api/docs`, {
  method: 'POST', headers: { 'content-type': 'application/json', origin: BASE },
  body: JSON.stringify({ title: TITLE, email: FOUNDER, slug: SLUG, isMember: true }),
});
const sj = await saved.json().catch(() => ({}));
if (!saved.ok) { console.error(`save refused (${saved.status}): ${JSON.stringify(sj)}`); process.exit(1); }
say(`saved “${TITLE}” at /d/${sj.slug} — creation mail to ${FOUNDER}`);

let link = null;
for (let i = 0; i < 20 && !link; i++) {
  const m = (await botOutbox()).find((x) => x.to === FOUNDER && /^Create/.test(x.subject ?? '') && x.link);
  if (m) link = m.link; else await sleep(1500);
}
if (!link) { console.error('no creation mail reached the bot outbox in 30s'); process.exit(1); }
const arrival = await followLink(link);
if (arrival.status !== 302 || !arrival.location.includes(`/d/${SLUG}`)) {
  console.error(`creation link answered ${arrival.status} → ${arrival.location}`); process.exit(1);
}
COOKIE = arrival.cookie;
say(`founded: ${BASE}/d/${SLUG}`);

/* ---- 2. the text, the hat, the invitations ------------------------------- */

await cmd('confirm-starting-text', { text: TEXT });
await cmd('set-convenor-membership', { isMember: true });
say(`starting text confirmed: ${TEXT.split('\n').length} lines`);
for (const e of BOTS) { await cmd('invite', { email: e }); }
say(`invited ${BOTS.length} bots`);

/* ---- 3. every setting held and set --------------------------------------- */

// the form is the convenor's and the number the room's (§9.0a); held, we put both
await cmd('set-quorum-form', { form: 'share' }, { soft: true });
const HELD = {
  // 👥 a share, never above half (Q1439 caps it at 50)
  quorum: { form: 'share', n: 30 },
  // ⏱️ generous, because a rehearsal is over in minutes
  rate: { grant: 5, cap: 8, dripMinutes: 2 },
  // 💤 the floor (LAPSE_MIN_MS): silence on one proposal abstains inside the sitting
  lapse: { afterMs: 5 * 60_000 },
  authorship: { rung: 'sealedElective' },
  judgments: { rung: 'after' },
  // 🌍 public, so the feed can be watched with no seat at all
  chamber: { rung: 'public' },
  applications: { apply: false },
  admission: { price: 'proposal' },
  removal: { price: 'consent' },
};
for (const [setting, value] of Object.entries(HELD)) {
  await cmd('set-setting', { setting, value });
}
say(`set ${Object.keys(HELD).length} settings, all held by the Founder — nothing delegated`);

// ⏰ **last, and off the server's clock**, so the close falls `--minutes` after 🍾
// and not `--minutes` after the script started: the founding above is a dozen
// round trips, and on a real host that is not nothing.
const pre = await view();
const skewMs = pre.serverNowMs - Date.now();
const endsAtMs = pre.serverNowMs + MINUTES * 60_000;
await cmd('set-setting', { setting: 'ending', value: { endsAtMs } });
say(`⏰ set: the clock closes the document at ${new Date(endsAtMs).toTimeString().slice(0, 8)} ` +
  `(${MINUTES} min; host clock ${skewMs >= 0 ? '+' : ''}${skewMs} ms from this one)`);

/* ---- 4. 🍾, with the veto kept on the Text ------------------------------- */

for (let i = 0; i < 40; i++) {
  const r = (await view()).readiness ?? {};
  if (r.ready) break;
  if (i === 0) say(`readiness ${JSON.stringify({ waiting: r.waiting, holds: r.holds })}`);
  if (i === 39) { console.error('never became ready to begin'); process.exit(1); }
  await sleep(2000);
}

const managed = h0.catalogue.filter((id) => !['displayName', 'picture', 'startingText'].includes(id));
const keys = [...managed, 'startingText', 'door:invite', 'door:remove'];
// **everything, except 🛡️ on the Text** — that one power is the whole point of
// the rehearsal: with it the room's adoptions park on the Founder (SPEC §9.7
// rule 8) and somebody has to be at the desk.
const KEPT = { setting: 'startingText', power: 'assent' };
let laidDown = keys.flatMap((setting) => [{ setting, power: 'unilateral' }, { setting, power: 'assent' }])
  .filter((p) => !(p.setting === KEPT.setting && p.power === KEPT.power));
for (let tries = 0; tries < 8; tries++) {
  try { await cmd('begin', { laidDown }); say(`🍾 begun — ${laidDown.length} powers laid down, 🛡️ kept on the Text`); break; }
  catch (e) {
    const m = /'([^']+)' carries no power/.exec(e.message);
    if (!m) { console.error(e.message); process.exit(1); }
    laidDown = laidDown.filter((p) => p.setting !== m[1]);
  }
}

const begun = await view();
const textRow = (begun.view.settings ?? []).find((s) => s.setting === 'startingText');
must(textRow?.powers?.assent === true, 'the Founder still holds 🛡️ on the Text',
  `powers ${JSON.stringify(textRow?.powers)}`);
must(begun.constitutedAtT !== null, 'the document has begun', `constitutedAtT ${begun.constitutedAtT}`);

// **✒️ after 🍾 — only if there is a pen left anywhere.** Everything above was
// laid down, so there should be none; the check is dynamic because a change to
// the `laidDown` list above must not silently turn this step into a lie.
const pens = (begun.view.settings ?? []).filter((s) => s.powers?.unilateral === true).map((s) => s.setting);
const doorPens = Object.entries(begun.view.doors ?? {})
  .filter(([, d]) => d.powers?.unilateral === true).map(([k]) => `door:${k}`);
let decree = null;
if (pens.length === 0 && doorPens.length === 0) {
  say('the Founder holds no ✒️ anywhere — every pen was laid down at 🍾 — so there is no ' +
    'decree to make. Skipped, and said so.');
} else {
  say(`the Founder still holds ✒️ on ${[...pens, ...doorPens].join(', ')} — decreeing on the first`);
  decree = pens[0] ?? null;
}

/* ---- the three loops ----------------------------------------------------- */

const started = Date.now();
const DEADLINE = endsAtMs - skewMs + 6 * 60_000;    // the close, plus a grace for the minute tick
let closed = false;
let stop = false;

const tally = {
  parksSeen: 0, parksAccepted: 0, parksRefused: 0, adoptionsThroughAccept: 0,
  feedByKind: new Map(), feedTotal: 0, feedPolls: 0, feedShort: 0,
  healthChecks: 0, lastHealth: null,
};
const bump = (m, k) => m.set(k, (m.get(k) ?? 0) + 1);

/* -- the Founder's Accept -------------------------------------------------- */

const answered = new Set();
let refusedOne = false;

const founderLoop = async () => {
  while (!stop) {
    let v;
    try { v = await view(); } catch (e) { say(`founder view failed: ${e.message}`); await sleep(4000); continue; }
    if (v.view?.closed) { closed = true; stop = true; break; }
    const parks = (v.view?.crownTasks ?? []).filter((t) => t.text);
    for (const p of parks) {
      if (answered.has(p.id)) continue;
      answered.add(p.id);
      tally.parksSeen += 1;
      // the third park (if three arrive) is refused, so both roads are walked
      const reject = tally.parksSeen >= 3 && !refusedOne;
      const outcome = reject ? 'reject' : 'accept';
      const tvBefore = v.textVersion;
      say(`👑 park ${tally.parksSeen} on ${p.text.candidateId} — ${outcome}: ${String(p.text.summary).slice(0, 80)}`);
      const r = await cmd('answer-crown-question', { question: p.id, outcome }, { soft: true });
      if (r === null) { answered.delete(p.id); tally.parksSeen -= 1; continue; }
      if (reject) { refusedOne = true; tally.parksRefused += 1; }
      else {
        tally.parksAccepted += 1;
        const after = await view();
        if (typeof tvBefore === 'number' && typeof after.textVersion === 'number' && after.textVersion > tvBefore) {
          tally.adoptionsThroughAccept += 1;
          say(`  the accept adopted the parked text — text version ${tvBefore} → ${after.textVersion}`);
        }
      }
    }
    if (Date.now() > DEADLINE) { say('past the deadline with no close — stopping'); stop = true; break; }
    await sleep(4000);
  }
};

/* -- the feed watcher ------------------------------------------------------ */

const keyOf = (e) => e.kind + ':' + (e.candidateId || e.motionId || e.setting + '@' + e.t);
const seenFeed = new Set();
/** what first arrived on a `since=`-carrying poll — never on a fresh load */
const arrivedOnPoll = [];
let feedFirstDone = false;
let motionPut = false;

const feedLoop = async () => {
  let eseq = null;
  while (!stop) {
    try {
      const q = eseq === null ? '' : `?since=${eseq}`;
      const r = await timedFetch('feed', `${BASE}/api/d/${SLUG}/feed${q}`);
      if (!r.ok) {
        refusals.push({ at: clock(), cmd: `GET feed${q}`, status: r.status, body: (await r.text()).slice(0, 300) });
      } else {
        const f = await r.json();
        tally.feedPolls += 1;
        const withSince = eseq !== null;
        eseq = f.eseq;
        if (f.short) { tally.feedShort += 1; }
        else {
          if (f.canRead === false) {
            say(`feed: the door refuses a stranger — ${JSON.stringify(f.holding)}`);
          } else {
            const fresh = (f.entries ?? []).filter((e) => !seenFeed.has(keyOf(e)));
            if (fresh.length) {
              say(`feed: ${f.entries.length} entries (+${fresh.length})`);
              // oldest of the new first, so the log reads in the order it happened
              for (const e of fresh.slice().reverse()) {
                const k = keyOf(e);
                seenFeed.add(k);
                if (withSince) arrivedOnPoll.push({ key: k, kind: e.kind, setting: e.setting ?? null });
                bump(tally.feedByKind, `${e.setting ? 'rule' : 'text'}/${e.kind}`);
                tally.feedTotal += 1;
                const what = e.setting
                  ? `${e.glyph} ${e.setting} → ${JSON.stringify(e.to)}`
                  : `${e.candidateId} · ${(e.changes ?? []).length} change(s)`;
                say(`  · ${e.kind}${withSince ? '' : ' (fresh load)'}: ${what}`);
              }
            }
            feedFirstDone = true;
          }
        }
      }
    } catch (e) { say(`feed poll failed: ${e.message}`); }
    await sleep(5000);
  }
};

/* -- health ---------------------------------------------------------------- */

const healthLoop = async () => {
  while (!stop) {
    try {
      const t0 = Date.now();
      const h = await health();
      const hMs = Date.now() - t0;
      const t1 = Date.now();
      await view();
      const vMs = Date.now() - t1;
      tally.healthChecks += 1;
      tally.lastHealth = h;
      say(`health: up ${h.uptimeSeconds}s · docs ${h.documents} · stalled ${h.documentsStalled} · ` +
        `paused ${h.paused === null ? 'no' : 'YES'} · errors ${h.errors?.total ?? '?'} · ` +
        `healthz ${hMs}ms · view ${vMs}ms`);
    } catch (e) { say(`health failed: ${e.message}`); }
    for (let i = 0; i < 30 && !stop; i++) await sleep(1000);
  }
};

/* -- the one motion the Founder puts --------------------------------------- */

const motionLoop = async () => {
  // wait for the feed's first (fresh) load, so what follows can only arrive on a poll
  for (let i = 0; i < 60 && !feedFirstDone && !stop; i++) await sleep(1000);
  // …and for the room to exist. A 🏛️ motion put into an electorate of one is
  // carried by the putting, which proves nothing about a vote and gives the
  // feed a `proposed` and an `adopted` in the same second. Ninety seconds is
  // the cap, so a run with no bots still puts it and still asserts the poll.
  for (let i = 0; i < 90 && !stop; i++) {
    const v = await view().catch(() => null);
    if (v && v.electorateSize > 1) break;
    await sleep(1000);
  }
  await sleep(2000);
  if (stop) return;
  if (decree !== null) {
    // a pen that survived 🍾: one ✒️ rule change, which the feed prints as `decreed`
    await cmd('set-setting', { setting: decree, value: HELD[decree], why: 'rehearsal ✒️' }, { soft: true });
    say(`✒️ decreed on ${decree}`);
  }
  // 🏛️ — 💤 from five minutes to six. Constitutional by the catalogue, so it is
  // put to everybody; what is asserted is that the *put* reaches the watcher.
  const r = await cmd('open-motion', {
    payload: { kind: 'set', setting: 'lapse', value: { afterMs: 6 * 60_000 } },
    why: 'the rehearsal moves 💤 by a minute, so the feed has a rule change to carry',
  }, { soft: true });
  if (r === null) { say('the 💤 motion was refused — see the refusals block'); return; }
  motionPut = true;
  say('🏛️ the Founder moved 💤 → six minutes');
};

say(`watching — the clock closes the document in ${MINUTES} min`);
await Promise.all([founderLoop(), feedLoop(), healthLoop(), motionLoop()]);
stop = true;

/* ---- the close ----------------------------------------------------------- */

must(closed, 'the clock closed the document', closed ? '' : 'the deadline passed first');

if (closed) try {
  // **the fingerprint is taken before the signature**, because that is what an
  // open page in somebody else's hand is holding when the 🥂 OK lands: the seq
  // it last saw, the text version and the records key. The signature moves the
  // document log and nothing else, so their next poll is not `short` — it is a
  // *slim* view that asks to be spared the records it already has.
  const before = await view();
  const at = before.view.closed?.at;
  say(`🥂 closed at ${new Date(at).toTimeString().slice(0, 8)} — signing as the Founder`);
  // **the Founder's seat may already have signed**, and on a bot room it usually
  // has: `room-bots` seats every address in the outbox, the Founder's among them,
  // so hers is two clients on one seat. A signature is once and for ever, so the
  // refusal is the expected answer and not a failure — what is asserted is that
  // the seat *is* signed, whichever of the two pressed it.
  if (before.view.closed?.mySignature != null) {
    say('  the Founder’s seat had already signed (room-bots holds it too) — not signing twice');
  } else {
    await cmd('acknowledge-close', { comment: 'The rehearsal is over; what stands, stands.' }, { soft: true });
  }

  const signed = await view();
  must(signed.view.closed?.mySignature != null, 'the Founder’s seat has signed the document',
    JSON.stringify(signed.view.closed?.mySignature ?? null).slice(0, 120));
  const shapeOf = (r) => r == null ? 'null'
    : `closedAt ${r.closedAt} · text ${String(r.text ?? '').length} chars · adopted ${(r.adopted ?? []).length} · ` +
      `undecided ${(r.undecided ?? []).length} · signatures ${(r.signatures ?? []).length}`;
  const a = signed.record ?? null;
  must(a !== null && typeof a.closedAt === 'number',
    'the record is whole on a full read after signing', shapeOf(a));

  // the poll a page holding the pre-signature view would send. Where the
  // signature had already landed the seq did not move for us, so we stand one
  // behind it instead — the same request, and still not `short`, which is what
  // makes the answer slim rather than empty.
  const pollSeq = signed.seq > before.seq ? before.seq : Math.max(0, signed.seq - 1);
  const slim = await view(`?since=${pollSeq}.${signed.eseq}&tv=${signed.textVersion}&rk=${signed.recordsKey}`);
  must((slim.slim ?? []).includes('records'), 'the second read really was a slim poll',
    `slim: ${JSON.stringify(slim.slim ?? [])}`);
  const b = slim.record ?? null;
  must(b !== null && typeof b.closedAt === 'number', 'the record is whole on the slim poll too', shapeOf(b));
  must(b !== null && a !== null &&
    (b.adopted ?? []).length === (a.adopted ?? []).length &&
    (b.undecided ?? []).length === (a.undecided ?? []).length,
  'the slim poll’s record says the same as the full one’s',
  `full: ${shapeOf(a)} | slim: ${shapeOf(b)}`);
} catch (e) {
  // a throw here would take the summary with it, and the summary is the whole
  // point of a rehearsal: whatever went wrong is a failed check, not an exit
  must(false, 'the close was read without throwing', e.message);
}

/* ---- the verdicts a rehearsal exists to give ----------------------------- */

must(tally.feedTotal > 0, 'the feed carried entries', `${tally.feedTotal} over ${tally.feedPolls} polls`);
must(arrivedOnPoll.length > 0, 'entries arrived on the polling watcher, not only on a fresh load',
  `${arrivedOnPoll.length} of ${tally.feedTotal}`);
if (motionPut) {
  const rules = arrivedOnPoll.filter((e) => e.setting === 'lapse');
  must(rules.length > 0, 'the Founder’s 🏛️ rule change reached the watcher on a `since=` poll',
    rules.map((e) => e.key).join(', ') || 'no 💤 entry arrived on a poll');
}
if (decree !== null) {
  const decrees = arrivedOnPoll.filter((e) => e.kind === 'decreed');
  must(decrees.length > 0, 'the Founder’s ✒️ decree reached the watcher on a `since=` poll',
    decrees.map((e) => e.key).join(', ') || 'no decree arrived on a poll');
}
must(tally.parksSeen > 0, 'the room carried text, and it parked on the Founder’s 🛡️',
  `${tally.parksSeen} park(s)`);
must(tally.adoptionsThroughAccept > 0, 'at least one adoption went through the Founder’s Accept',
  `${tally.adoptionsThroughAccept} of ${tally.parksAccepted} accept(s)`);

const unexpected = refusals.filter((r) => !r.expected);
must(unexpected.length === 0, 'no unexpected refusal', unexpected.length ? `${unexpected.length} — see below` : '');

/* ---- the summary --------------------------------------------------------- */

const hz = tally.lastHealth ?? (await health().catch(() => null));
console.log('');
console.log('══ rehearsal summary ═══════════════════════════════════════════════');
console.log(`  document      ${BASE}/d/${SLUG} (feed: ${BASE}/d/${SLUG}/feed)`);
console.log(`  ran           ${Math.round((Date.now() - started) / 1000)}s after 🍾 · ${BOTS.length} bots invited`);
console.log(`  parks         ${tally.parksSeen} seen · ${tally.parksAccepted} accepted · ${tally.parksRefused} refused`);
console.log(`  adoptions     ${tally.adoptionsThroughAccept} through the Founder's Accept`);
console.log(`  feed          ${tally.feedTotal} entries over ${tally.feedPolls} polls ` +
  `(${tally.feedShort} answered short) · ${arrivedOnPoll.length} arrived on a since= poll`);
for (const [k, n] of [...tally.feedByKind].sort()) console.log(`                ${k}: ${n}`);
console.log(`  decree        ${decree === null ? 'skipped — the Founder held no ✒️ after 🍾' : `on ${decree}`}`);
console.log(`  motion        ${motionPut ? '💤 → six minutes, put by the Founder' : 'not put'}`);
console.log('  round trips (worst)');
for (const [k, v] of [...worst].sort((a, b) => b[1].ms - a[1].ms)) console.log(`                ${k}: ${v.ms}ms at ${v.at}`);
console.log(`  health        ${tally.healthChecks} checks · ` + (hz
  ? `up ${hz.uptimeSeconds}s · documents ${hz.documents} · stalled ${hz.documentsStalled} · ` +
    `paused ${hz.paused === null ? 'no' : 'YES'} · errors ${hz.errors?.total ?? '?'} · ` +
    `outbox ${JSON.stringify(hz.outbox)}`
  : 'unreadable'));
if (refusals.length) {
  console.log('  refusals');
  for (const r of refusals) {
    console.log(`                [${r.at}] ${r.expected ? '(expected) ' : ''}${r.cmd} → ${r.status}: ${r.body}`);
  }
} else console.log('  refusals      none');
console.log('  checks');
for (const c of checks) console.log(`                ${c.ok ? 'PASS' : 'FAIL'}  ${c.what}${c.detail ? ` — ${c.detail}` : ''}`);
const failed = checks.filter((c) => !c.ok);
console.log(`  verdict       ${failed.length === 0 ? 'green' : `${failed.length} failure(s)`}`);
console.log('════════════════════════════════════════════════════════════════════');
process.exit(failed.length === 0 ? 0 : 1);
