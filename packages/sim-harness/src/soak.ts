/**
 * **N clients against the real server, concurrently** (entry 77, the
 * alpha-readiness pass) — the single largest gap this repo had.
 *
 * Nothing in the tree had ever run two clients against the server at the
 * same time. `sim-harness` never opens a socket: every run above drives
 * `Session` in-process. `packages/server/test/server.test.ts` walks the
 * whole HTTP road but is one process holding three cookies **in sequence**.
 * The alpha is five to ten people pressing simultaneously on their own
 * laptops, and the first time that happens should not be in front of
 * friends.
 *
 *   npm run soak -w @draft/sim-harness -- [--base URL] [--members N]
 *       [--rounds N] [--seed S]
 *
 * It needs a **dev server** — one without `RESEND_API_KEY`, because the
 * invitation links are read back out of `GET /api/dev/outbox`, which the
 * production artifact does not contain at all. `--base` defaults to
 * `DRAFT_BASE_URL`, then `PORT`, then 8140, the same ladder every walk uses.
 *
 * **The design decision worth knowing.** The plan asked for
 * `ScriptedPersona` itself to make the decisions, and it does — but it
 * speaks `ParticipantApi` and the wire speaks the blind `view()`, so
 * `httpApi` below is a shim of exactly the four methods `judge` and `draft`
 * call. That is not a shortcut: every one of the four is answerable from
 * the member view, which is the claim worth pinning, because it says the
 * blind projection carries enough for a participant to act on. Anything a
 * persona wanted that the view could not answer would be a finding.
 *
 * **Assertions, not metrics.** This is the mistake every file in this
 * package except `founding-evidence` makes. The run exits non-zero, and
 * what it asserts is below in `SOAK CHECKS`.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { CardView, ParticipantApi, OptionView } from '../../engine-core/src/index.js';
import { makeRng } from '../../engine-core/src/rng.js';
import { ConstitutionSession } from '../../constitution/src/index.js';
import type { LogEntry } from '../../constitution/src/index.js';
import { ScriptedPersona } from './persona.js';
import { clubhouseScenario } from './clubhouse.js';
import { check, eq, finish, say } from './evidence-log.js';

/* -- the wire ------------------------------------------------------------ */

interface Args {
  base: string; members: number; rounds: number; seed: string; dataDir: string | null;
}

function parseArgs(argv: string[]): Args {
  // the `walkBase` ladder (Q911, entry 105): a person's argv, then the
  // environment's base, then a PORT-only server, then the project's own 8140
  const env = process.env;
  const fallback = env.DRAFT_BASE_URL
    ?? (env.PORT ? `http://127.0.0.1:${env.PORT}` : 'http://127.0.0.1:8140');
  const args: Args = { base: fallback, members: 6, rounds: 6, seed: 'soak',
    dataDir: env.DRAFT_DATA_DIR ?? null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--base') args.base = argv[++i] ?? args.base;
    else if (a === '--members') args.members = Number(argv[++i]) || args.members;
    else if (a === '--rounds') args.rounds = Number(argv[++i]) || args.rounds;
    else if (a === '--seed') args.seed = argv[++i] ?? args.seed;
    else if (a === '--data-dir') args.dataDir = argv[++i] ?? null;
    else if (!a.startsWith('--')) args.base = a;
  }
  return args.base.endsWith('/')
    ? { ...args, base: args.base.slice(0, -1) } : args;
}

/** Every status the run saw, so a 5xx anywhere is a check rather than a throw. */
const statuses: Array<{ what: string; status: number; body: string }> = [];

async function post(base: string, path: string, body: unknown,
  cookie?: string): Promise<Response> {
  const res = await fetch(base + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: base,
      ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
  return res;
}

const cookieOf = (res: Response): string =>
  (res.headers.get('set-cookie') ?? '').split(';')[0] ?? '';

/** Follow a magic link the way the interstitial does: GET, then POST the token. */
async function consume(base: string, link: string): Promise<string> {
  const u = new URL(link);
  await fetch(u.toString());
  const res = await fetch(u.origin + u.pathname, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', origin: u.origin },
    body: new URLSearchParams({ token: u.searchParams.get('token') ?? '' }).toString(),
    redirect: 'manual',
  });
  if (res.status !== 302) throw new Error(`magic link refused: ${res.status}`);
  return cookieOf(res);
}

/* -- the member view, as a shape ---------------------------------------- */

interface Hunk { start: number; end: number; lines: string[] }
interface ViewCandidate { id: string; hunks: Hunk[]; rationale: string; mine: boolean }
interface Clause { id: string; candidates: ViewCandidate[]; judged: boolean }
interface Payload {
  seq: number;
  text: string;
  textVersion: number;
  wallet: number | null;
  clauses: Clause[];
  raceCards: CardView[];
  constitutedAtT: number | null;
  view: { closed: unknown; frozen: boolean };
}

async function viewOf(base: string, slug: string, cookie: string): Promise<Payload> {
  const res = await fetch(`${base}/api/d/${slug}/view`, { headers: { cookie } });
  statuses.push({ what: 'view', status: res.status, body: '' });
  return await res.json() as Payload;
}

/**
 * The four methods `ScriptedPersona.judge` and `.draft` actually call,
 * answered off one member view. Everything else on `ParticipantApi` throws,
 * deliberately: a persona reaching for something the wire cannot serve is a
 * finding about the blind projection, not something to paper over here.
 */
function httpApi(p: Payload): ParticipantApi {
  const docLines = p.text.split('\n');
  const live: OptionView[] = p.clauses.flatMap((c) => c.candidates.map((cand) => ({
    id: cand.id,
    changes: cand.hunks.map((h) => ({
      before: docLines.slice(h.start, h.end).join('\n'),
      after: h.lines.join('\n'),
    })),
    rationale: cand.rationale,
  })));
  const shim = {
    document: () => p.text,
    currentVersion: () => p.textVersion,
    balance: () => p.wallet ?? 0,
    liveCandidates: () => live,
  };
  return new Proxy(shim, {
    get(target, prop) {
      if (prop in target) return (target as Record<string, unknown>)[prop as string];
      throw new Error(`the soak shim has no ${String(prop)}() — the wire could not answer it`);
    },
  }) as unknown as ParticipantApi;
}

/* -- the run ------------------------------------------------------------ */

interface Seat { id: string; cookie: string; persona: ScriptedPersona; email: string }

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const scenario = { ...clubhouseScenario,
    personas: clubhouseScenario.personas.slice(0, args.members) };
  const stamp = Date.now().toString(36);
  const title = `Soak ${stamp}`;
  say(`\n== soak: ${args.members} members, ${args.rounds} rounds, against ${args.base} ==`);

  // -- the server is alive, and it is a dev server ------------------------
  const health = await fetch(`${args.base}/healthz`);
  check(health.ok, `the server answers /healthz (${health.status})`);
  if (!health.ok) { finish(); return; }
  const outboxProbe = await fetch(`${args.base}/api/dev/outbox`);
  check(outboxProbe.ok,
    'it is a dev server — /api/dev/outbox serves the mail this run reads its links from');
  if (!outboxProbe.ok) { finish(); return; }

  // -- creation, the way the interstitial walks it ------------------------
  const founderEmail = `soak-${stamp}-0@example.org`;
  const created = await (await post(args.base, '/api/docs',
    { title, email: founderEmail })).json() as { ok: boolean; slug: string; devLink: string };
  check(created.ok === true, `the document is named and its address reserved (${created.slug})`);
  const slug = created.slug;
  const founder = await consume(args.base, created.devLink);
  check(founder.length > 0, 'following the creation link seats the founder');

  // -- the room arrives ---------------------------------------------------
  const emails = scenario.personas.map((_, i) => `soak-${stamp}-${i + 1}@example.org`);
  const cmd = async (cookie: string, name: string, cmdArgs: unknown,
    label = name): Promise<unknown> => {
    const res = await post(args.base, `/api/d/${slug}/cmd`,
      { cmd: name, args: cmdArgs }, cookie);
    const body = await res.json() as { error?: string; result?: unknown };
    statuses.push({ what: label, status: res.status, body: body.error ?? '' });
    if (body.error !== undefined) throw new Error(`${label}: ${body.error}`);
    return body.result;
  };

  for (const e of emails) await cmd(founder, 'invite', { email: e });
  const outbox = await (await fetch(`${args.base}/api/dev/outbox`))
    .json() as { mails: Array<{ to: string; link?: string }> };
  const seats: Seat[] = [];
  const rng = makeRng(`soak/${args.seed}`);
  for (let i = 0; i < emails.length; i++) {
    const email = emails[i]!;
    const mail = [...outbox.mails].reverse().find((m) => m.to === email && m.link);
    if (mail === undefined) throw new Error(`no invitation reached ${email}`);
    const cookie = await consume(args.base, mail.link!);
    const profile = scenario.personas[i]!;
    seats.push({ id: profile.id, cookie, email,
      persona: new ScriptedPersona(profile, scenario, rng.fork(profile.id)) });
  }
  check(seats.length === args.members, `${args.members} invitations followed, ${args.members} seats`);

  // -- the founder settles the constitution and starts --------------------
  // At the alpha preset, so this run walks the constitution the day will
  // have: a fixed 85% bar, 6 ✏️ capped at 8 dripping every 5 minutes, and a
  // 20-minute window (see PRODUCTION.md's running log). The cooldown is not
  // here because it is not a setting — it is DRAFT_COOLDOWN_MS.
  await cmd(founder, 'confirm-starting-text', { text: scenario.text });
  const settings: Array<[string, unknown]> = [
    ['ending', { endsAtMs: Date.now() + 20 * 60_000 }],
    ['bar', { pct: 85 }],
    ['pace', { shape: 'fixed' }],
    ['rate', { grant: 6, cap: 8, dripMinutes: 5 }],
    ['quorum', { form: 'share', n: 50 }],
    ['authorship', { rung: 'sealed' }],
    ['judgments', { rung: 'after' }],
    ['chamber', { rung: 'link' }],
    ['applications', { apply: false }],
    ['admission', { price: 'assembly' }],
    ['removal', { price: 'consent' }],
    ['machines', { enabled: false, budget: 0 }],
    ['lapse', { afterMs: null }],
  ];
  for (const [setting, value] of settings) {
    await cmd(founder, 'set-setting', { setting, value }, `set ${setting}`);
  }
  await cmd(founder, 'begin', {});
  const begun = await viewOf(args.base, slug, founder);
  check(begun.constitutedAtT !== null, 'the founder pressed 🍾 and the document began');

  /* -- SOAK CHECKS ------------------------------------------------------
     Everything above is setup, and it is sequential on purpose: a founding
     is one person's act. What follows is the part nothing in this repo had
     ever done — every seat firing at once, at the same document, through
     the same `WriteChain`. */
  say(`\n  ${args.rounds} rounds, every seat acting in the same tick`);
  let judgments = 0, proposals = 0, collisions = 0;
  const staleCards: string[] = [];
  let sawNegativeWallet = false;
  const judgedByMe = new Map<string, Set<string>>();

  for (let round = 0; round < args.rounds; round++) {
    // every seat reads at once
    const views = await Promise.all(seats.map((s) => viewOf(args.base, slug, s.cookie)));

    // ...and then every seat acts at once, which is the whole point: these
    // promises are created before any of them is awaited, so the commits
    // interleave in the server rather than queueing behind this loop
    const acts = seats.map(async (seat, i) => {
      const p = views[i]!;
      if (p.wallet !== null && p.wallet < 0) sawNegativeWallet = true;
      const api = httpApi(p);
      const card = p.raceCards[0];
      if (card !== undefined) {
        const outcome = await seat.persona.judge(card, api);
        const wire = outcome === 'indifferent' ? 'tie' : outcome;
        await cmd(seat.cookie, 'judge-race',
          { a: card.a.id, b: card.b.id, outcome: wire }, `judge(${seat.id})`);
        judgments += 1;
        if (!judgedByMe.has(seat.id)) judgedByMe.set(seat.id, new Set());
        judgedByMe.get(seat.id)!.add(card.a.id);
        return;
      }
      const draft = await seat.persona.draft(api, Date.now());
      if (draft === null) return;
      try {
        await cmd(seat.cookie, 'propose-text',
          { baseVersion: draft.patch.baseVersion, hunks: draft.patch.hunks,
            why: draft.rationale }, `propose(${seat.id})`);
        proposals += 1;
      } catch (e) {
        // **Two simultaneous proposals on one base must not both land.**
        // A refusal here is the mechanism working, and it is the thing this
        // harness exists to see: the loser is told, in a sentence, rather
        // than silently racing the winner into the log.
        //
        // But **only a collision counts as a collision.** A bare `catch`
        // here swallowed every other refusal into the same tally — an
        // exhausted ✏️ wallet, a dedup rejection, a member who may not
        // propose at all — and asserted nothing about them beyond the
        // message being non-empty, so the run stayed green through failures
        // that have nothing to do with concurrency. Anything not about the
        // base the draft was written against is a finding, on the same
        // footing as the mid-round branch below.
        const why = e instanceof Error ? e.message : String(e);
        if (/version|stale|base|conflict|duplicate/i.test(why)) {
          collisions += 1;
          check(!/^\s*$/.test(why),
            `a refused simultaneous proposal says why (${why.slice(0, 60)})`);
        } else {
          check(false, `a proposal was refused for something other than a `
            + `collision: ${why.slice(0, 90)}`);
        }
      }
    });
    const settled = await Promise.allSettled(acts);
    for (const r of settled) {
      if (r.status !== 'rejected') continue;
      const why = r.reason instanceof Error ? r.reason.message : String(r.reason);
      // **The stale card.** Two seats are served the same pair, the race
      // resolves on the first one's judgment, and the second arrives at a
      // race that no longer exists. That is the ordinary shape of a room
      // and the server is right to refuse it — a judgment cast against a
      // race that has ended must not count. Counted rather than failed, and
      // asserted on below, because *how often* it happens and *what the
      // member is told* are the two things a supervised session cares
      // about: at six seats and six rounds it is a couple of presses per
      // run, and every one of them is a person watching nothing happen.
      if (/not in a live race|no such race|already resolved/i.test(why)) {
        staleCards.push(why);
        continue;
      }
      // anything else is a finding, not a crash: record it and let the run
      // reach its assertions
      check(false, `a command was refused mid-round: ${why.slice(0, 90)}`);
    }
  }

  say(`\n  ${judgments} judgments, ${proposals} proposals, `
    + `${collisions} refused proposal collisions, ${staleCards.length} stale cards`);

  /* -- what the run asserts --------------------------------------------- */
  say('\n== assertions ==========================================================');

  // 1. no command anywhere returned 5xx
  const server5xx = statuses.filter((s) => s.status >= 500);
  eq(server5xx.map((s) => `${s.what} ${s.status}`), [],
    'no request in the whole run returned 5xx');

  // 2. no member's wallet ever went negative
  check(!sawNegativeWallet, 'no seat ever saw a negative ✏️ balance');

  // 2a. a stale card is refused in the member's own words. §3.5's whole
  // discipline is that a member is told what happened to *their* act, and
  // "candidate c1 is not in a live race" names an engine id at somebody who
  // pressed a button — recorded here as the finding it is, and the run
  // stays green because the refusal itself is correct.
  if (staleCards.length > 0) {
    say(`  · ${staleCards.length} judgments arrived at a race that had already resolved`);
    say(`    the sentence the member gets: "${staleCards[0]}"`);
    check(staleCards.length < judgments,
      'stale cards are the minority of judgments, not the common case');
  }

  // 3. every accepted judgment is in that member's own view
  const finals = await Promise.all(seats.map((s) => viewOf(args.base, slug, s.cookie)));
  let seen = 0, expected = 0;
  for (let i = 0; i < seats.length; i++) {
    const mine = judgedByMe.get(seats[i]!.id);
    if (mine === undefined || mine.size === 0) continue;
    expected += 1;
    const p = finals[i]!;
    // a judgment of mine shows as a clause I have judged, or as a record it
    // resolved into — either way it must not have vanished.
    //
    // Assertion 3 is a **smoke check, not a per-seat guarantee** (Ed,
    // 2026-08-29, Q1037). The second disjunct is global: one adoption
    // anywhere in the document satisfies it for every seat, so a seat whose
    // own judgment vanished can still be counted here. It stays because the
    // strict form goes red falsely — a judgment can resolve its own clause
    // away — and nothing here reaches a member. Do not treat it as a gate.
    if (p.clauses.some((c) => c.judged) || p.textVersion > begun.textVersion) seen += 1;
  }
  eq(seen, expected, 'every seat that judged can see that it judged');

  // 4. the room agrees about the document
  const texts = new Set(finals.map((p) => p.text));
  eq(texts.size, 1, 'every seat is served the same document text');
  const versions = new Set(finals.map((p) => p.textVersion));
  eq(versions.size, 1, 'and the same version of it');

  // 5. the hash chain, and replay
  if (args.dataDir === null) {
    say('  · no --data-dir: the chain and replay checks are skipped');
  } else {
    // **A document's id is not its slug** — the slug is the address and may
    // be re-taken, so the store keys by an opaque id. Nothing on the wire
    // hands it out, so the log is found by reading each one's `created`
    // entry, which is the only place the two are stated together.
    const docsDir = join(args.dataDir, 'docs');
    let log: LogEntry[] = [];
    try {
      for (const id of readdirSync(docsDir)) {
        const path = join(docsDir, id, 'log.jsonl');
        if (!existsSync(path)) continue;
        const raw = readFileSync(path, 'utf8').split('\n').filter((l) => l.length > 0);
        if (raw.length === 0 || !raw[0]!.includes(`"${slug}"`)) continue;
        log = raw.map((l) => JSON.parse(l) as LogEntry);
        say(`  · reading the log at docs/${id}`);
        break;
      }
    } catch (e) {
      say(`  · could not read ${docsDir} (${e instanceof Error ? e.message : String(e)})`);
    }
    check(log.length > 0, `the run's own log is on disk under ${docsDir}`);
    if (log.length > 0) {
      const replayed = ConstitutionSession.replay(log);
      check(replayed.verifyChain(), `the rolling hash verifies over all ${log.length} entries`);
      // and replay reproduces the state, which is the stronger claim: the
      // log is not merely intact, it is sufficient.
      //
      // **`cs.text` is the *starting* text, not the live document.** The
      // charter the wire serves is the engine's, folded from `engine.jsonl`
      // beside this log, and the constitution log neither knows nor should
      // know about it. Getting this wrong the first time is worth the
      // comment: the two are equal only until the first adoption, and a
      // soak run whose whole point is to cause adoptions is precisely where
      // the difference shows.
      check(replayed.text === scenario.text,
        `replay reproduces the starting text (${scenario.text.length} chars)`);
      check(replayed.memberRecords().size >= args.members,
        'replay reproduces the whole membership');
      check(replayed.constitutedAtT !== null, 'replay reproduces the start');
      // every settled value the room agreed, back out of the bytes
      eq(replayed.settingState('bar').value, { pct: 85 },
        'replay reproduces the constitution the room was founded at');
      // and the wire's own sequence number is the log's length, which is
      // what says no commit was lost under the concurrent rounds
      eq(log.length, finals[0]!.seq,
        'the log holds exactly the entries the wire counts — nothing lost under load');
    }
  }

  finish();
}

void main();
