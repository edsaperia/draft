#!/usr/bin/env node
/**
 * seed-room — **found a bot room on a dev server in one command** (2026-09-18,
 * the crowded-race room Ed asked for on 2026-09-17, on the Q1439/Q1440 build):
 * a document with a ten-paragraph charter, Sunday's settings — the quorum at
 * half, 💤 at fifteen minutes, ⏱️ at the standard rate — twenty bots invited
 * at `bots.docs.vote` addresses, and 🍾 pressed. It prints the founder's own
 * login link (open it in a browser to sit as the founder) and the
 * `room-bots` line that animates the room.
 *
 *   node scripts/repro/seed-room.mjs http://127.0.0.1:8190 [--bots 20] [--quorum 50] [--lapse 15m] [--ending 6h]
 *
 * Needs a dev server (no RESEND_API_KEY — the bots' mail is read from the dev
 * outbox by room-bots). Not a walk: it asserts nothing beyond a refused command.
 */
import { post as postTo, followLink } from '../lib/walk.mjs';

const argv = process.argv.slice(2);
const BASE = (argv.find((a) => !a.startsWith('--')) || process.env.DRAFT_BASE_URL || 'http://127.0.0.1:8190').replace(/\/$/, '');
const flag = (name, dflt) => {
  const eq = argv.find((a) => a.startsWith(`--${name}=`));
  if (eq !== undefined) return eq.slice(name.length + 3);
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : dflt;
};
const duration = (s) => {
  const m = /^(\d+(?:\.\d+)?)\s*(s|m|h|d)?$/.exec(String(s).trim());
  if (!m) throw new Error(`bad duration: ${s}`);
  return Math.round(Number(m[1]) * { s: 1e3, m: 6e4, h: 36e5, d: 864e5 }[m[2] || 'm']);
};
const BOTS = Math.max(1, Number(flag('bots', '20')));
const QUORUM = Math.min(50, Math.max(5, Number(flag('quorum', '50'))));
const LAPSE = duration(flag('lapse', '15m'));
const ENDING = duration(flag('ending', '6h'));

const health = await (await fetch(`${BASE}/healthz`)).json();
if (health.devMail !== true) { console.error(`seed-room: ${BASE} is not a dev server (devMail ${health.devMail})`); process.exit(2); }

const jars = new Map();
const post = (path, body, cookie) => postTo(BASE, path, body, cookie);
const die = (m) => { console.error(`seed-room: ${m}`); process.exit(1); };
let SLUG = '';
const cmd = async (who, name, args = {}) => {
  const r = await post(`/api/d/${SLUG}/cmd`, { cmd: name, args }, jars.get(who));
  const j = await r.json().catch(() => ({}));
  if (!r.ok) die(`${who} · ${name} refused (${r.status}): ${JSON.stringify(j)}`);
  return j.result ?? j;
};

const run = Date.now().toString(36);
const founderEmail = `founder-${run}@example.org`;
const created = await (await post('/api/docs', { title: `Crowded Room ${run}`, email: founderEmail })).json();
if (!created.ok || !created.devLink) die(`creation refused: ${JSON.stringify(created)}`);
SLUG = created.slug;
const arrival = await followLink(created.devLink);
if (arrival.status !== 302) die(`the founder's link answered ${arrival.status}`);
jars.set('founder', arrival.cookie);

// ten paragraphs: a title, two headings, seven clauses — the crowded race
// goes on clause 3 by default (`room-bots --clause 3`)
await cmd('founder', 'confirm-starting-text', { text: [
  `# The Crowded Room ${run}`,
  '## Meetings',
  'The society shall meet on the first Tuesday of every month, in the upstairs room, at seven.',
  'Every meeting opens with the minutes of the last one, read aloud by whoever kept them.',
  'A member who misses three meetings in a row shall be written to, kindly, by the secretary.',
  '## Money',
  'Subscriptions are due in January and are the same for every member, whatever their means.',
  'The treasurer may spend up to fifty pounds without asking; anything more goes to a meeting.',
  'Accounts are shown at the annual meeting and may be inspected by any member at any time.',
  'The society keeps no debts: what it cannot pay for this year it does not do this year.',
].join('\n') });

for (const [setting, value] of Object.entries({
  rate: { grant: 3, cap: 3, dripMinutes: 5 },
  pace: { shape: 'fixed' },
  quorum: { form: 'share', n: QUORUM },
  authorship: { rung: 'sealedElective' },
  judgments: { rung: 'after' },
  applications: { apply: false },
  admission: { price: 'pen' },
  removal: { price: 'proposal' },
  machines: { enabled: false, budget: 0 },
  lapse: { afterMs: LAPSE },
  ending: { endsAtMs: Date.now() + ENDING },
  bar: { pct: 50 },
  chamber: { rung: 'link' },
})) {
  const r = await post(`/api/d/${SLUG}/cmd`, { cmd: 'reclaim', args: { setting } }, jars.get('founder'));
  await r.text();
  await cmd('founder', 'set-setting', { setting, value });
}

const NAMES = ['ada.lovelace', 'grace.hopper', 'alan.turing', 'edsger.dijkstra', 'barbara.liskov', 'donald.knuth',
  'margaret.hamilton', 'tony.hoare', 'frances.allen', 'john.backus', 'radia.perlman', 'ken.thompson',
  'adele.goldberg', 'dennis.ritchie', 'lynn.conway', 'niklaus.wirth', 'jean.sammet', 'leslie.lamport',
  'karen.sparck.jones', 'claude.shannon', 'mary.kenneth.keller', 'robin.milner', 'sophie.wilson', 'edgar.codd'];
const bots = NAMES.slice(0, BOTS).map((n) => `${n}@bots.docs.vote`);
for (const email of bots) await cmd('founder', 'invite', { email });

const ready = await (await fetch(`${BASE}/api/d/${SLUG}/view`, { headers: { cookie: jars.get('founder') } })).json();
if (!ready.readiness?.ready) die(`🍾 not ready: ${JSON.stringify(ready.readiness)}`);
await cmd('founder', 'begin', {});

// the founder's way in: a fresh login link, read off the dev outbox
await post(`/api/d/${SLUG}/login`, { email: founderEmail });
const tail = await (await fetch(`${BASE}/api/dev/outbox`)).json();
const mails = Array.isArray(tail) ? tail : (tail.mails ?? tail.items ?? []);
const mine = mails.find((m) => JSON.stringify(m).includes(founderEmail) && /auth\/login|\/l\//.test(JSON.stringify(m)));
const link = mine ? (JSON.stringify(mine).match(/https?:\/\/[^"\\\s]+/) || [])[0] : null;

console.log(`\nseed-room: founded ${BASE}/d/${SLUG}`);
console.log(`  quorum ${QUORUM}% · 💤 ${LAPSE / 60000} min · ⏱️ 3/3 every 5 min · ending in ${ENDING / 3600000} h · ${bots.length} bots invited · begun`);
console.log(`  the founder (${founderEmail}): ${link ?? 'log in from the page — no link found in the outbox'}`);
console.log(`\n  npm run room-bots -- ${BASE}/d/${SLUG} --clause 3 --min 20s --max 2m --heat 0.7\n`);
