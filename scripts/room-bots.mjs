#!/usr/bin/env node
/**
 * room-bots — **a room full of members who are not people** (Ed, 2026-09-05:
 * *I want to be able to test a document that has a lot of proposals, where
 * proposals are being made and voted on, and I can also make proposals and
 * see them get voted on and pass and fail … The thing I mostly want to test
 * is the UX rather than the mechanism.*)
 *
 *   npm run room-bots -- https://docs.vote/d/<slug> --key=<DRAFT_BOT_KEY>
 *       [--min 30s] [--max 7m] [--heat 0.6] [--motions 0.08] [--seed <word>]
 *
 * You found the document in your own browser and invite the bots through ✉️
 * like anybody else, at any address at `bots.docs.vote` —
 * `ada.lovelace@bots.docs.vote` — as many as you like, before or after 🍾.
 * **Mail to that domain is caught by the host and never sent** (Q1310; Ed,
 * 2026-09-10: *they could never be confused for a real email address*): it
 * is filed in the bot outbox, which this script reads. It follows every
 * invitation addressed to a bot, and from then on each bot is a member: it
 * names itself after its address, picks a face, answers the questions the
 * founder delegated, OKs the news it is owed, and — at a random interval
 * between `--min` and `--max`, independently of every other bot — judges a
 * card it was served, proposes a change to the text, answers or raises a
 * motion, or withdraws something of its own. Text proposals are most of what
 * it does, and `--heat` is how often a proposal lands on a clause that is
 * already contested, which is what makes the many-candidate races and the
 * ⚔️ card appear.
 *
 * **Two outboxes it can read.** With `--key` (or `DRAFT_BOT_KEY` in the
 * environment) it reads `GET /api/bots/outbox` bearing the key — the route
 * ships in the production artifact, so this is how a room runs on docs.vote
 * itself. Without a key it reads `GET /api/dev/outbox` as it always did,
 * which needs a dev server: dev.docs.vote, or `npm run server` without
 * `RESEND_API_KEY`. A dev server files a bot's mail in both, so either way
 * works there.
 *
 * **Not a walk.** Nothing here asserts anything; it runs until you stop it
 * (Ctrl+C prints the tally). The seats are the same plain HTTP the page
 * speaks — `room-walk.mjs`'s cookie jar and `soak.ts`'s link-following —
 * and there is no sim backdoor: a bot can do exactly what a member can.
 *
 * **Why the bots are legible rather than clever.** Each bot has a
 * temperament — *reformer*, *conservative* or *coin* — and a fixed opinion
 * of every candidate it meets (a hash of its own seed and the candidate id),
 * so it says the same thing about the same proposal every time it is asked,
 * and a room of them produces proposals that clearly carry, clearly fail and
 * sometimes deadlock. That is what lets you check whether the surface told
 * you the truth about your own proposal; a utility model over text nobody
 * wrote in advance would give you a coin flip on everything.
 */

import { readFileSync } from 'node:fs';
import { sleep, post as postTo, followLink } from './lib/walk.mjs';

/* -- arguments --------------------------------------------------------- */

const argv = process.argv.slice(2);
/** `--name value` or `--name=value`, the latter so a key never splits on a shell. */
const flag = (name, dflt) => {
  const eq = argv.find((a) => a.startsWith(`--${name}=`));
  if (eq !== undefined) return eq.slice(name.length + 3);
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : dflt;
};
const has = (name) => argv.includes(`--${name}`);
const urlArg = argv.find((a) => /^https?:\/\//.test(a));

const usage = () => {
  console.error(`usage: npm run room-bots -- <document url> [--key <DRAFT_BOT_KEY>] [--min 30s] [--max 7m] ` +
    `[--heat 0.6] [--motions 0.08] [--seed <word>] [--theme <file.json>] [--members a@bots.docs.vote,b@…]\n` +
    `  the url is the document's own, e.g. https://docs.vote/d/hollow-oak\n` +
    `  --theme swaps what the bots write (provisos, new clauses, verb swaps, reasons) — e.g. scripts/repro/birthday-theme.json\n` +
    `  --clause <n> sends four proposals in five at the n-th body paragraph (1-based, headings skipped): the crowded race\n` +
    `  --pile <0–1> how often a proposal lands on a clause the theme holds rival wordings for (its \`rivals\` groups; default 0.8)\n` +
    `  --members seats members already on the roster by login link, after a host restart wiped the outbox\n` +
    `  --key (or DRAFT_BOT_KEY in the environment) reads the host's bot outbox, which is how a room ` +
    `runs on docs.vote; without it the dev outbox is read, which needs a dev server`);
  process.exit(2);
};
if (!urlArg || has('help')) usage();

/** `30s`, `7m`, `2h`, `500ms`, or a bare number of seconds. */
const duration = (s) => {
  const m = /^(\d+(?:\.\d+)?)(ms|s|m|h)?$/.exec(String(s).trim());
  if (!m) { console.error(`not a duration: ${s}`); process.exit(2); }
  const n = Number(m[1]);
  return { ms: n, s: n * 1000, m: n * 60_000, h: n * 3_600_000 }[m[2] ?? 's'];
};

const DOC = new URL(urlArg);
const BASE = DOC.origin;
const SLUG = (/\/d\/([^/?#]+)/.exec(DOC.pathname) ?? [])[1];
if (!SLUG) usage();

const MIN = duration(flag('min', '30s'));
const MAX = Math.max(MIN, duration(flag('max', '7m')));
const HEAT = Math.min(1, Math.max(0, Number(flag('heat', '0.6'))));
const MOTIONS = Math.min(1, Math.max(0, Number(flag('motions', '0.08'))));
// **The crowded race on demand** (Ed, 2026-09-17: *bots piling many rival
// wordings onto ONE clause*): `--clause n` names the n-th body paragraph, and
// four proposals in five land on it — enough that the race there holds many
// rivals while the rest of the document still moves. 0 is off.
const CLAUSE = Math.max(0, Math.floor(Number(flag('clause', '0')) || 0));
const SEED = flag('seed', 'room');
const OUTBOX_EVERY = duration(flag('outbox', '3s'));
/** The outbox the bots read: the host's keyed bot outbox with a key, else the dev outbox. */
const KEY = flag('key', process.env.DRAFT_BOT_KEY || null);
const OUTBOX = KEY
  ? { path: '/api/bots/outbox', init: { headers: { authorization: `Bearer ${KEY}` } } }
  : { path: '/api/dev/outbox', init: {} };
/**
 * `--members a@bots.docs.vote,b@…` — seats to take without an invitation to
 * follow (2026-09-16, the lantern-house room): a host restart wipes the bot
 * outbox, so a runner started after one finds no mail and no address to log
 * in with. Each named member asks for a login link, which lands in the
 * outbox like any other and is followed from there.
 */
const MEMBERS = (flag('members', '') || '').split(',').map((s) => s.trim()).filter(Boolean);
const TEND_MIN = duration(flag('tend', '10s'));
const TEND_MAX = TEND_MIN * 3;
const REPORT_EVERY = duration(flag('report', '5m'));

/* -- small tools -------------------------------------------------------- */

const clock = () => new Date().toTimeString().slice(0, 8);
const say = (who, what) => console.log(`[${clock()}] ${who.padEnd(18)} ${what}`);

/** A seeded RNG (mulberry32) over a string seed, so a run is reproducible. */
const hash32 = (s) => {
  let h = 2166136261 >>> 0;
  for (const ch of String(s)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
};
const rng = (seed) => {
  let a = hash32(seed) || 1;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const hash01 = (s) => hash32(s) / 4294967296;
const pick = (r, xs) => xs[Math.floor(r() * xs.length)];
const between = (r, lo, hi) => lo + r() * (hi - lo);
const weighted = (r, pairs) => {
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  let x = r() * total;
  for (const [v, w] of pairs) { x -= w; if (x <= 0) return v; }
  return pairs[pairs.length - 1][0];
};

/* -- the wire, the same shapes the page sends --------------------------- */

// `post` is the walks' shared JSON POST (scripts/lib/walk.mjs), aimed at BASE
const post = (path, body, cookie) => postTo(BASE, path, body, cookie);

class Refused extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

/** A command as the page sends it; a refusal is an error carrying the server's sentence. */
const cmd = async (seat, name, args = {}) => {
  const r = await post(`/api/d/${SLUG}/cmd`, { cmd: name, args }, seat.cookie);
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error !== undefined) throw new Refused(r.status, j.error ?? `HTTP ${r.status}`);
  return j.result;
};
const view = async (seat) => {
  const r = await fetch(`${BASE}/api/d/${SLUG}/view`, { headers: { cookie: seat.cookie } });
  if (!r.ok) throw new Refused(r.status, `view answered ${r.status}`);
  return r.json();
};

/**
 * Follow a magic link the way the interstitial does — GET, then POST the
 * token back — and return the cookie the 302 sets and where it sends you,
 * which names the document the link was for.
 */
const follow = async (link) => {
  const r = await followLink(link);
  if (r.status !== 302) throw new Refused(r.status, `magic link answered ${r.status}`);
  return { cookie: r.cookie, location: r.location };
};

/* -- who a bot is ------------------------------------------------------- */

/** A bot is any address at this domain (Q1310); the server's `isBotAddress` is the same rule. */
const BOT_DOMAIN = 'bots.docs.vote';
const isBot = (email) => (email ?? '').slice((email ?? '').lastIndexOf('@') + 1).toLowerCase() === BOT_DOMAIN;
/** `ada.lovelace@bots.docs.vote` → *Ada Lovelace*. */
const nameOf = (email) => email.split('@')[0].split(/[._-]+/)
  .filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');

/** Faces none of which are the surface's furniture (server `RESERVED_EMOJI`). */
const FACES = ['🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧',
  '🦉', '🦆', '🦄', '🐝', '🦋', '🐢', '🐙', '🦀', '🐬', '🐳', '🦈', '🐘', '🦒', '🦘',
  '🦔', '🦩', '🦜', '🐉', '🌵', '🌻', '🍄', '🌙', '⭐', '🍉', '🥑', '🎈', '🪁', '🎺'];

/**
 * Three temperaments, dealt round-robin so a room is balanced: how likely
 * a bot is to prefer a change over what stands. Its opinion of any one
 * candidate is fixed for the run — `hash01(seed + candidate)` against this
 * — so it never contradicts itself across pairings.
 */
const TEMPERAMENTS = [
  { name: 'reformer', change: 0.8 },
  { name: 'conservative', change: 0.25 },
  { name: 'coin', change: 0.5 },
];

/* -- what a bot writes -------------------------------------------------- */

/**
 * **A theme is the bots' vocabulary, swapped whole** (Ed, 2026-09-16: *a plan
 * for Tim's birthday. Eight bots, writing birthday related suggestions*). The
 * four banks below are a charter's; `--theme <file>` reads a JSON with any of
 * `provisos`, `newClauses`, `modals` (pairs of pattern and replacement, the
 * pattern a regex source), `why` (merged key by key) and `rewritePrefix`, and
 * whatever the file leaves out keeps the charter's words. The edit *shapes*
 * — proviso, number, modal, trim, rewrite, delete, insert, merge, split — are
 * the same under every theme; only what they say changes. Example:
 * `scripts/repro/birthday-theme.json`.
 */
const THEME_FILE = flag('theme', null);
const THEME = (() => {
  if (!THEME_FILE) return {};
  try { return JSON.parse(readFileSync(THEME_FILE, 'utf8')); }
  catch (e) { console.error(`could not read the theme ${THEME_FILE}: ${e.message}`); process.exit(2); }
})();
const themed = (key, dflt) => (Array.isArray(THEME[key]) && THEME[key].length ? THEME[key] : dflt);

const PROVISOS = themed('provisos', [
  'This does not apply during the summer recess.',
  'Any member may ask for this to be reviewed at the next meeting.',
  'The Founder may waive this in writing.',
  'Exceptions are recorded in the minutes.',
  'This takes effect from the next calendar month.',
  'A simple majority of those present may suspend this for one meeting.',
  'Notice of at least seven days is required.',
  'This is reviewed annually.',
  'Guests are exempt.',
  'Where this conflicts with the law, the law prevails.',
]);
const NEW_CLAUSES = themed('newClauses', [
  'Minutes are circulated within a week of every meeting.',
  'A member who misses three consecutive meetings is written to.',
  'The treasurer reports the balance at every meeting.',
  'Decisions taken by email are read into the record at the next meeting.',
  'Any member may propose an item for the agenda up to two days before.',
  'Meetings begin on the hour and end within ninety minutes.',
  'The chair rotates alphabetically.',
  'Accounts are open to any member on request.',
  'No member speaks twice on a question until every member who wishes to has spoken once.',
  'A quorum is whoever turns up, provided the meeting was announced.',
]);
const MODALS = Array.isArray(THEME.modals) && THEME.modals.length
  ? THEME.modals.map(([re, to]) => [new RegExp(re), to])
  : [
    [/\bmust\b/, 'may'], [/\bmay\b/, 'must'], [/\bshall\b/, 'should'], [/\bshould\b/, 'shall'],
    [/\bat least\b/, 'no more than'], [/\bno more than\b/, 'at least'], [/\balways\b/, 'usually'],
    [/\bnever\b/, 'rarely'], [/\bevery\b/, 'any'], [/\ball\b/, 'most'],
  ];
/** The rewrite shape's opening, the one phrase the shapes hard-code. */
const REWRITE_PREFIX = typeof THEME.rewritePrefix === 'string' && THEME.rewritePrefix.trim()
  ? THEME.rewritePrefix.trim() : 'Unless the membership agrees otherwise,';
const WHY = Object.assign({
  proviso: ['The rule is right but needs a safety valve.', 'Otherwise this bites in cases nobody meant.',
    'A small exception saves a large argument later.'],
  number: ['The number was arbitrary; this one is a real limit.', 'Tighter.', 'Looser — the old figure was never met.',
    'Rounds it to something people will remember.'],
  modal: ['A softer verb — this was never enforced.', 'A harder verb — this was never optional.',
    'The old wording committed us to something nobody checks.'],
  trim: ['The second sentence restates the first.', 'Shorter says the same.', 'The tail was commentary, not rule.'],
  rewrite: ['The membership should be able to set this aside when it wants to.', 'Puts the decision where it belongs.'],
  delete: ['This clause does no work.', 'Nobody has invoked this and nobody will.', 'Covered elsewhere.'],
  insert: ['A gap: nothing here says how this actually happens.', 'Something the charter assumes but never states.',
    'We have been doing this anyway; write it down.'],
  merge: ['One thought, one clause.', 'These two lines say one thing.'],
  split: ['Two rules were hiding in one sentence.', 'Easier to amend one half without the other.'],
  motion: ['Worth trying for a while.', 'The current setting suits a bigger room than this one.',
    'Let us see whether the room agrees.'],
  generic: ['Reads better.', 'Clearer.', 'I would rather this.', ''],
}, THEME.why && typeof THEME.why === 'object' ? THEME.why : {});

/**
 * **Rivals: the crowded race as real alternatives** (Ed, 2026-09-18: *a room
 * where bots will make a lot of rivals on the same clauses … something I'll
 * have lots of opinions on*). A theme's `rivals` is a list of groups, each
 * `{ match, wordings: [{ text, why }] }`. A body line belongs to a group when
 * it matches the group's regex **or is one of its wordings** — so the pile
 * follows its clause through an adoption and through lines moving about it,
 * which a line number (`--clause`) cannot. `--pile` is how often a proposal
 * lands on such a line, offering a wording that neither stands there nor is
 * among the live candidates; a group with nothing fresh left takes the
 * ordinary shapes on top, which crowds it further. Example:
 * `scripts/repro/residency-theme.json`.
 */
const RIVALS = (Array.isArray(THEME.rivals) ? THEME.rivals : [])
  .filter((g) => g && typeof g.match === 'string' && Array.isArray(g.wordings))
  .map((g) => ({ re: new RegExp(g.match), wordings: g.wordings.filter((w) => w && typeof w.text === 'string') }));
const PILE = Math.min(1, Math.max(0, Number(flag('pile', '0.8'))));
const rivalGroupOf = (line) => RIVALS.find((g) => g.re.test(line) || g.wordings.some((w) => w.text === line.trim()));

const isHeading = (line) => /^#+\s/.test(line);
const sentences = (s) => s.match(/[^.!?]+[.!?]+(\s|$)/g)?.map((x) => x.trim()) ?? [s];

/**
 * One edit shape applied to line `i` of `lines`, or null where the shape
 * does not fit. A shape returns the hunks, its reason and a label for the
 * log. `[start, end)` are line indices, `lines` the replacement — exactly
 * what the page sends from `hunksOf`.
 */
const SHAPES = {
  proviso: (r, lines, i) => {
    const fresh = PROVISOS.filter((p) => !lines[i].includes(p));
    if (!fresh.length) return null;
    return { hunks: [{ start: i, end: i + 1, lines: [`${lines[i].trim()} ${pick(r, fresh)}`] }],
      why: pick(r, WHY.proviso), label: 'added a proviso' };
  },
  number: (r, lines, i) => {
    const m = /\d+/.exec(lines[i]);
    if (!m) return null;
    const n = Number(m[0]);
    const n2 = pick(r, [n + 1, n + 2, Math.max(0, n - 1), n * 2, Math.ceil(n / 2), n + 5]
      .filter((x) => x !== n));
    return { hunks: [{ start: i, end: i + 1, lines: [lines[i].replace(m[0], String(n2))] }],
      why: pick(r, WHY.number), label: `changed ${n} to ${n2}` };
  },
  modal: (r, lines, i) => {
    const fits = MODALS.filter(([re]) => re.test(lines[i]));
    if (!fits.length) return null;
    const [re, to] = pick(r, fits);
    return { hunks: [{ start: i, end: i + 1, lines: [lines[i].replace(re, to)] }],
      why: pick(r, WHY.modal), label: `swapped a verb for “${to}”` };
  },
  trim: (r, lines, i) => {
    const ss = sentences(lines[i]);
    if (ss.length < 2) return null;
    return { hunks: [{ start: i, end: i + 1, lines: [ss.slice(0, -1).join(' ')] }],
      why: pick(r, WHY.trim), label: 'dropped the last sentence' };
  },
  rewrite: (r, lines, i) => {
    const s = lines[i].trim();
    if (s.toLowerCase().startsWith(REWRITE_PREFIX.toLowerCase())) return null;
    return { hunks: [{ start: i, end: i + 1,
      lines: [`${REWRITE_PREFIX} ${s[0].toLowerCase()}${s.slice(1)}`] }],
      why: pick(r, WHY.rewrite), label: 'prefixed an escape clause' };
  },
  delete: (r, lines, i) => ({ hunks: [{ start: i, end: i + 1, lines: [] }],
    why: pick(r, WHY.delete), label: 'proposed deleting the clause' }),
  insert: (r, lines, i) => ({ hunks: [{ start: i + 1, end: i + 1, lines: [pick(r, NEW_CLAUSES)] }],
    why: pick(r, WHY.insert), label: 'inserted a new clause after it' }),
  merge: (r, lines, i) => {
    const j = i + 1;
    if (j >= lines.length || !lines[j].trim() || isHeading(lines[j])) return null;
    return { hunks: [{ start: i, end: j + 1, lines: [`${lines[i].trim()} ${lines[j].trim()}`] }],
      why: pick(r, WHY.merge), label: 'merged it with the next clause' };
  },
  split: (r, lines, i) => {
    const ss = sentences(lines[i]);
    if (ss.length < 2) return null;
    const k = 1 + Math.floor(r() * (ss.length - 1));
    return { hunks: [{ start: i, end: i + 1, lines: [ss.slice(0, k).join(' '), ss.slice(k).join(' ')] }],
      why: pick(r, WHY.split), label: 'split it in two' };
  },
};
const SHAPE_WEIGHTS = [['proviso', 3], ['number', 2], ['modal', 3], ['trim', 1], ['rewrite', 2],
  ['delete', 1], ['insert', 2], ['merge', 1], ['split', 1]];

/* -- the room ----------------------------------------------------------- */

const seats = new Map(); // email → seat
const seenLinks = new Set();
const tally = { judgments: 0, proposals: 0, motions: 0, answers: 0, withdrawals: 0,
  oks: 0, refused: 0, stale: 0 };
let stopping = false;
let latest = null; // the last member view any bot fetched — what the summary reads the room from

const seat_of = (email, cookie) => {
  const n = seats.size;
  const temperament = TEMPERAMENTS[n % TEMPERAMENTS.length];
  const seed = `${SEED}/${email}`;
  return { email, name: nameOf(email), cookie, temperament, seed, r: rng(seed),
    faceIdx: n % FACES.length, identityDone: false,
    /** a fixed opinion of any candidate — the same answer every time it is asked */
    opinion: (id) => hash01(`${seed}/${id}`) < temperament.change };
};

/** Refusals a member meets in the ordinary course of a busy room, counted rather than shouted. */
const ordinary = (msg) =>
  /not in a live race|no such race|already resolved|not live|already stands|insufficient|version|stale|base/i.test(msg);

const refused = (seat, act, e) => {
  const msg = e instanceof Error ? e.message : String(e);
  if (ordinary(msg)) { tally.stale += 1; say(seat.name, `· ${act} — ${msg}`); }
  else { tally.refused += 1; say(seat.name, `✗ ${act} refused: ${msg}`); }
};

/* -- housekeeping: what a member does when they open the page ----------- */

const answerFor = (seat, q, m) => {
  const r = seat.r;
  const now = Date.now();
  switch (q.setting) {
    case 'ending': return { endsAtMs: now + Math.round(between(r, 90, 240)) * 60_000 };
    case 'quorum': return r() < 0.7
      // no quorum asks for more than half (Q1439): the share is refused above 50 at the value
      ? { form: 'share', n: Math.round(between(r, 20, 50)) }
      : { form: 'count', n: Math.max(1, Math.floor(m.members.length * between(r, 0.2, 0.5))) };
    case 'rate': return { grant: 5, cap: 8, dripMinutes: pick(r, [3, 5, 10]) };
    case 'lapse': return r() < 0.6 ? { afterMs: null } : { afterMs: pick(r, [7, 14, 30]) * 86_400_000 };
    case 'machines': return { enabled: false, budget: 0 };
    case 'applications': return { apply: r() < 0.5 };
    case 'admission': return { price: pick(r, ['assembly', 'proposal', 'pen']) };
    case 'removal': return { price: pick(r, ['consent', 'assembly', 'proposal']) };
    case 'authorship': return { rung: pick(r, ['anonymous', 'anonymousElective', 'sealed', 'sealedElective', 'public']) };
    case 'judgments': return { rung: pick(r, ['never', 'after']) };
    case 'chamber': return { rung: pick(r, ['closed', 'link', 'public']) };
    default: return null;
  }
};

const tend = async (seat) => {
  const p = await view(seat);
  const m = p.view;
  if (!seat.identityDone) {
    const taken = new Set(m.members.map((x) => x.picture).filter(Boolean));
    for (let tries = 0; tries < FACES.length; tries++) {
      const face = FACES[(seat.faceIdx + tries) % FACES.length];
      if (taken.has(`e${face}`)) continue;
      try {
        await cmd(seat, 'set-identity', { name: seat.name, picture: `e${face}` });
        seat.identityDone = true;
        say(seat.name, `is ${face} ${seat.name} — a ${seat.temperament.name}`);
        break;
      } catch (e) {
        if (!/emoji|face|taken|furniture/i.test(String(e.message))) { refused(seat, 'set-identity', e); break; }
      }
    }
  }
  for (const q of m.questions ?? []) {
    if (!q.answerable || q.myAnswer !== null) continue;
    const value = answerFor(seat, q, m);
    if (value === null) continue;
    try {
      await cmd(seat, 'answer', { setting: q.setting, value });
      tally.answers += 1;
      say(seat.name, `answered ${q.glyph} ${JSON.stringify(value)}`);
    } catch (e) { refused(seat, `answer ${q.setting}`, e); }
  }
  for (const s of m.owedOks ?? []) {
    try { await cmd(seat, 'give-ok', { setting: s }); tally.oks += 1; say(seat.name, `OK on ${s}`); }
    catch (e) { refused(seat, `give-ok ${s}`, e); }
  }
  for (const b of m.owedReleases ?? []) {
    try { await cmd(seat, 'ack-release', { batch: b.id }); tally.oks += 1; say(seat.name, 'OK on 👑'); }
    catch (e) { refused(seat, 'ack-release', e); }
  }
  for (const a of m.owedAmendments ?? []) {
    try { await cmd(seat, 'ack-amendment', { candidate: a.candidate }); tally.oks += 1; say(seat.name, 'OK on an amendment'); }
    catch (e) { refused(seat, 'ack-amendment', e); }
  }
  if (m.closed && m.closed.mySignature === null) {
    try {
      await cmd(seat, 'acknowledge-close', { comment: pick(seat.r, ['Signed.', 'Content with this.', '', 'Not everything I wanted, but fair.']) });
      say(seat.name, 'signed the closed document 🥂');
    } catch (e) { refused(seat, 'acknowledge-close', e); }
  }
  return m;
};

/* -- the act: one thing a member might do when they come back ----------- */

/** Prefer a challenger the bot likes over one it does not; the incumbent sits at its temperament's line. */
/** a card about somebody's application — the race is keyed `admit:<id>` (SPEC §9.7½) */
const isAdmission = (card) => /^admit:/.test(((card.a.setting || card.b.setting) || {}).settingId || '');

const judge = async (seat, card) => {
  const r = seat.r;
  // a stranger at the door is welcomed three times in four (2026-09-16, the
  // lantern-house room: Ed waited on twenty bots that met his application
  // one hand in five and liked it by coin) — a room that mostly says yes is
  // still a room that sometimes says no, which is what the test needs
  const likes = (o) => seat.opinion(o.id) || (isAdmission(card) && r() < 0.5);
  const score = (o) => o.incumbent ? 0.5 : (likes(o) ? between(r, 0.6, 1) : between(r, 0, 0.4));
  const a = score(card.a), b = score(card.b);
  const outcome = Math.abs(a - b) < 0.08 || r() < 0.08 ? 'tie' : (a > b ? 'a' : 'b');
  await cmd(seat, 'judge-race', { a: card.a.id, b: card.b.id, outcome });
  tally.judgments += 1;
  const what = card.kind === 'diagonal' ? 'a diagonal' : (card.a.setting || card.b.setting ? 'a motion' : 'a text race');
  say(seat.name, `judged ${what}: ${outcome === 'tie' ? 'indifferent' : outcome === 'a' ? 'A' : 'B'}`);
};

const propose = async (seat, p, m) => {
  const r = seat.r;
  const lines = p.text.split('\n');
  const body = lines.map((l, i) => i).filter((i) => lines[i].trim() && !isHeading(lines[i]));
  if (!body.length) return false;
  // the hot set: every line inside an open race's span — where `--heat` sends a proposal
  const hot = new Set();
  for (const c of p.clauses ?? []) {
    for (const cand of c.candidates ?? []) {
      for (const h of cand.hunks ?? []) for (let i = h.start; i < Math.max(h.end, h.start + 1); i++) hot.add(i);
    }
  }
  const hotBody = body.filter((i) => hot.has(i));
  const coldBody = body.filter((i) => !hot.has(i));
  const pool = (r() < HEAT && hotBody.length) ? hotBody : (coldBody.length ? coldBody : body);
  // `--clause n`: the named paragraph four times in five, the ordinary pick otherwise
  const target = CLAUSE > 0 && CLAUSE <= body.length ? body[CLAUSE - 1] : null;
  // a theme's rival groups: a clause that has one is where `--pile` sends the proposal,
  // with a wording nobody has put — neither what stands nor any live candidate's line
  const rivalLines = body.filter((k) => rivalGroupOf(lines[k]));
  const piled = rivalLines.length && r() < PILE ? pick(r, rivalLines) : null;
  const i = piled !== null ? piled : (target !== null && r() < 0.8) ? target : pick(r, pool);
  let edit = null;
  if (piled !== null) {
    const taken = new Set([lines[i].trim()]);
    for (const c of p.clauses ?? []) {
      for (const cand of c.candidates ?? []) for (const h of cand.hunks ?? []) for (const l of h.lines ?? []) taken.add(l.trim());
    }
    const fresh = rivalGroupOf(lines[i]).wordings.filter((w) => !taken.has(w.text));
    if (fresh.length) {
      const w = pick(r, fresh);
      edit = { rival: true, hunks: [{ start: i, end: i + 1, lines: [w.text] }], why: w.why ?? '',
        label: `offered a rival wording — “${w.text.slice(0, 48)}…”` };
    }
  }
  for (let tries = 0; tries < 6 && !edit; tries++) {
    const shape = weighted(r, SHAPE_WEIGHTS);
    if (shape === 'delete' && body.length < 4) continue;
    edit = SHAPES[shape](r, lines, i);
  }
  if (!edit) return false;
  const rung = (m.settings ?? []).find((s) => s.setting === 'authorship')?.value?.rung ?? '';
  const signed = /Elective$/.test(rung) && r() < 0.4;
  const why = !edit.rival && r() < 0.15 ? pick(r, WHY.generic) : edit.why;
  await cmd(seat, 'propose-text', { baseVersion: p.textVersion, hunks: edit.hunks, why,
    ...(signed ? { signed: true } : {}) });
  tally.proposals += 1;
  say(seat.name, `proposed on line ${i}${hot.has(i) ? ' (contested)' : ''}: ${edit.label}${signed ? ', signed' : ''}`);
  return true;
};

// 🌡️ left the list with the surface on 2026-09-15 (Q1362): a bot must only
// move what a member could move by hand, and there is no bar card to open.
const MOVABLE = ['quorum', 'rate', 'lapse', 'chamber', 'judgments', 'ending'];
const motionValue = (seat, s) => {
  const r = seat.r, v = s.value;
  if (v === null || v === undefined) return null;
  switch (s.setting) {
    case 'quorum': {
      const n = v.form === 'share' ? Math.min(50, Math.max(0, v.n + pick(r, [-10, 10]))) // never above half (Q1439)
        : Math.max(0, v.n + pick(r, [-1, 1]));
      return n === v.n ? null : { form: v.form, n };
    }
    case 'rate': { const d = pick(r, [v.dripMinutes * 2, Math.max(1, Math.round(v.dripMinutes / 2))]); return d === v.dripMinutes ? null : { ...v, dripMinutes: d }; }
    case 'lapse': return { afterMs: v.afterMs === null ? 14 * 86_400_000 : null };
    case 'chamber': return { rung: pick(r, ['closed', 'link', 'public'].filter((x) => x !== v.rung)) };
    case 'judgments': return { rung: v.rung === 'never' ? 'after' : 'never' };
    case 'ending': return v.endsAtMs === null ? null : { endsAtMs: v.endsAtMs + 3_600_000 };
    default: return null;
  }
};
const motion = async (seat, m) => {
  const r = seat.r;
  const settings = (m.settings ?? []).filter((s) => MOVABLE.includes(s.setting) && s.value !== null);
  if (!settings.length) return false;
  const s = pick(r, settings);
  const value = motionValue(seat, s);
  if (!value) return false;
  await cmd(seat, 'open-motion', { payload: { kind: 'set', setting: s.setting, value }, why: pick(r, WHY.motion) });
  tally.motions += 1;
  say(seat.name, `moved ${s.glyph} → ${JSON.stringify(value)}`);
  return true;
};

const answerMotion = async (seat, mo) => {
  const answer = seat.opinion(mo.id) ? 'accept' : 'keep';
  await cmd(seat, 'answer-motion', { motion: mo.id, answer });
  tally.judgments += 1;
  say(seat.name, `answered a 🏛️ motion on ${mo.payload?.setting ?? mo.payload?.kind}: ${answer}`);
};

const withdraw = async (seat, p) => {
  const live = (p.mine ?? []).filter((c) => c.state === 'live');
  if (!live.length) return false;
  const c = pick(seat.r, live);
  await cmd(seat, 'withdraw-text', { candidate: c.id });
  tally.withdrawals += 1;
  say(seat.name, 'withdrew a proposal of their own 🗑️');
  return true;
};

const act = async (seat) => {
  const p = await view(seat);
  latest = p;
  const m = p.view;
  if (m.closed) return;
  if (p.constitutedAtT === null) {
    if (!seat.saidWaiting) { seat.saidWaiting = true; say(seat.name, '· waiting for the document to begin'); }
    return;
  }
  const r = seat.r;
  const cards = p.raceCards ?? [];
  const openMotions = (m.motions ?? []).filter((x) => x.status === 'running' && !x.mine
    && x.myAnswer === null && x.route === 'constitutional');
  const canPropose = m.gates?.proposing !== false && (p.wallet ?? 0) > 0;
  const options = [];
  // somebody waiting at the door comes before the text: an admission dealt
  // into the hand is judged ahead of the card on top of it (a member would)
  const admission = cards.find(isAdmission)
    // …or the pair its own row asks with, where the hand holds no card on it
    // (Q1393): the row carries it from the same build the page reads it on
    || ((p.settingRaces ?? []).find((s) => /^admit:/.test(s.settingId) && !s.judged && s.ask) || {}).ask;
  if (admission && m.gates?.judging !== false) options.push(['admit', 0.8]);
  if (cards.length && m.gates?.judging !== false) options.push(['judge', 0.55]);
  if (openMotions.length) options.push(['answer-motion', 0.2]);
  if (canPropose) options.push(['propose', cards.length ? 0.3 : 0.7]);
  if (canPropose && !m.myHeldMotion && MOTIONS > 0) options.push(['motion', MOTIONS]);
  if ((p.mine ?? []).some((c) => c.state === 'live')) options.push(['withdraw', 0.04]);
  if (!options.length) { say(seat.name, `· nothing to do (wallet ${p.wallet ?? '—'})`); return; }
  const choice = weighted(r, options);
  try {
    if (choice === 'admit') await judge(seat, admission);
    else if (choice === 'judge') await judge(seat, cards[0]);
    else if (choice === 'answer-motion') await answerMotion(seat, pick(r, openMotions));
    else if (choice === 'propose') { if (!(await propose(seat, p, m))) say(seat.name, '· found nothing to propose'); }
    else if (choice === 'motion') { if (!(await motion(seat, m))) say(seat.name, '· found no motion to raise'); }
    else if (choice === 'withdraw') await withdraw(seat, p);
  } catch (e) { refused(seat, choice, e); }
};

/* -- the loops ---------------------------------------------------------- */

const loop = async (seat, first, lo, hi, step) => {
  await sleep(first);
  while (!stopping) {
    try { await step(seat); } catch (e) {
      if (e instanceof Refused && (e.status === 401 || e.status === 403 || e.status === 404)) {
        say(seat.name, `✗ seat lost (${e.message}) — leaving the room`);
        seats.delete(seat.email);
        return;
      }
      say(seat.name, `✗ ${e.message}`);
    }
    await sleep(between(seat.r, lo, hi));
  }
};

const arrive = (email, cookie) => {
  const seat = seat_of(email, cookie);
  seats.set(email, seat);
  say(seat.name, `arrived (seat ${seats.size})`);
  void loop(seat, between(seat.r, 2_000, 6_000), TEND_MIN, TEND_MAX, tend);
  void loop(seat, between(seat.r, 10_000, Math.min(MAX, 60_000)), MIN, MAX, act);
};

/**
 * A magic link is one-use, so a runner started a second time meets
 * invitations that have already been followed. A member who has lost their
 * seat logs in again — the login route mails a fresh link, and on a dev
 * server hands it back too — so a bot whose link is dead asks for one, once.
 */
const relogins = new Set();
const relogin = async (email) => {
  if (relogins.has(email)) return;
  relogins.add(email);
  const r = await post(`/api/d/${SLUG}/login`, { email });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { say(nameOf(email), `✗ could not ask for a login link: ${j.error ?? r.status}`); return; }
  if (j.devLink) {
    seenLinks.add(j.devLink);
    const arrival = await follow(j.devLink);
    if (arrival.location.includes(`/d/${SLUG}`)) arrive(email, arrival.cookie);
  } else {
    say(nameOf(email), '· asked for a login link — it will arrive in the outbox');
  }
};

const seatBot = async (mail) => {
  seenLinks.add(mail.link);
  let arrival;
  try { arrival = await follow(mail.link); } catch (e) {
    say(nameOf(mail.to), `· the link in the outbox is spent (${e.message}) — logging in afresh`);
    try { await relogin(mail.to); } catch (e2) { say(nameOf(mail.to), `✗ ${e2.message}`); }
    return;
  }
  if (!arrival.location.includes(`/d/${SLUG}`)) {
    say(nameOf(mail.to), `· invited to another document (${arrival.location}), ignoring`);
    return;
  }
  arrive(mail.to, arrival.cookie);
};

/** Only this document's mail, where the mail says which document it is for (the subject names the title). */
let TITLE = null;
const forThisDocument = (mail) => TITLE === null || !mail.subject || mail.subject.includes(`“${TITLE}”`);

const watchOutbox = async () => {
  while (!stopping) {
    try {
      const r = await fetch(BASE + OUTBOX.path, OUTBOX.init);
      if (r.ok) {
        const { mails } = await r.json();
        for (const mail of [...mails].reverse()) {
          if (!mail.link || !isBot(mail.to) || seenLinks.has(mail.link) || !forThisDocument(mail)) continue;
          if (seats.has(mail.to)) { seenLinks.add(mail.link); continue; } // a re-send, or a login link
          await seatBot(mail);
        }
      }
    } catch (e) { say('outbox', `✗ ${e.message}`); }
    await sleep(OUTBOX_EVERY);
  }
};

const summary = () => {
  const t = tally;
  console.log(`\n[${clock()}] ${seats.size} bots · ${t.judgments} judgments · ${t.proposals} proposals · ` +
    `${t.motions} motions · ${t.withdrawals} withdrawals · ${t.answers} founding answers · ${t.oks} OKs · ` +
    `${t.stale} ordinary refusals · ${t.refused} other refusals`);
  if (latest) {
    const races = latest.clauses ?? [];
    const biggest = races.reduce((n, c) => Math.max(n, (c.candidates ?? []).length), 0);
    const outcomes = {};
    for (const rec of latest.records ?? []) outcomes[rec.outcome] = (outcomes[rec.outcome] ?? 0) + 1;
    const settled = Object.entries(outcomes).map(([k, n]) => `${n} ${k}`).join(', ') || 'nothing settled yet';
    console.log(`           the room: ${races.length} open races, the biggest holding ${biggest} candidates · ` +
      `text version ${latest.textVersion} · ${settled}`);
  }
  console.log('');
};

/* -- go ------------------------------------------------------------------ */

const main = async () => {
  const health = await fetch(`${BASE}/healthz`).then((r) => r.json()).catch(() => null);
  if (!health?.ok) { console.error(`${BASE} does not answer /healthz — is the server up?`); process.exit(1); }
  const outbox = await fetch(BASE + OUTBOX.path, OUTBOX.init);
  if (!outbox.ok) {
    console.error(`${BASE} will not serve the bots' outbox (GET ${OUTBOX.path} → ${outbox.status}). ` +
      `The bots read their invitations from it. Two routes serve one: GET /api/bots/outbox on any host ` +
      `with DRAFT_BOT_KEY set, read with --key=<that key> (docs.vote is one); or GET /api/dev/outbox ` +
      `on a dev server — dev.docs.vote, or npm run server without RESEND_API_KEY — with no key at all.` +
      (KEY && outbox.status === 401 ? ' The key given was refused.' : '') +
      (KEY && outbox.status === 404 ? ' That host has no DRAFT_BOT_KEY set.' : ''));
    process.exit(1);
  }
  const door = await fetch(`${BASE}/api/d/${SLUG}/view`);
  if (door.status === 404) { console.error(`no document at ${BASE}/d/${SLUG}`); process.exit(1); }
  const title = door.ok ? (await door.json().catch(() => ({}))).title : null;
  TITLE = title ?? null;
  console.log(`room-bots on ${BASE}/d/${SLUG}${title ? ` — “${title}”` : ''} · build ${(health.build ?? '').slice(0, 7) || 'unreported'}`);
  console.log(`  each bot acts every ${MIN / 1000}–${Math.round(MAX / 1000)}s · heat ${HEAT} · motions ${MOTIONS}${CLAUSE ? ` · clause ${CLAUSE}` : ''}${RIVALS.length ? ` · pile ${PILE} over ${RIVALS.length} rival groups` : ''} · seed “${SEED}”`);
  console.log(`  reading ${OUTBOX.path}${KEY ? ' with the key' : ' (no key — the dev outbox)'}`);
  console.log(`  invite bots through ✉️ at any address at ${BOT_DOMAIN} — e.g. ada.lovelace@${BOT_DOMAIN} — and they arrive here.\n`);
  const ticker = setInterval(summary, REPORT_EVERY);
  process.on('SIGINT', () => { stopping = true; clearInterval(ticker); summary(); process.exit(0); });
  for (const email of MEMBERS) {
    if (!isBot(email)) { say(nameOf(email), '✗ not a bot address — only bots.docs.vote seats are taken here'); continue; }
    try { await relogin(email); } catch (e) { say(nameOf(email), `✗ ${e.message}`); }
  }
  await watchOutbox();
};

main().catch((e) => { console.error(e); process.exit(1); });
