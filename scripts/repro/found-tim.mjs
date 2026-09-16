#!/usr/bin/env node
// found-tim — a bot founds “Tim's Birthday Plan” on docs.vote (Ed, 2026-09-16: *a new
// document with bots … a plan for Tim's birthday. Eight bots, writing birthday related
// suggestions*): seeds the plan, invites seven more bots and Ed, settles the constitution
// with three questions delegated, then waits for every answer and presses 🍾 with every
// founder power laid down. found-lab.mjs with the constants changed; run room-bots with
// --theme=scripts/repro/birthday-theme.json beside it, since the bots are what answer the
// delegated questions this script waits on.
import { readFileSync, writeFileSync } from 'node:fs';

const BASE = 'https://docs.vote';
const SLUG = 'tims-birthday';
const TITLE = 'Tim’s Birthday Plan';
const FOUNDER = 'nina.okafor@bots.docs.vote';
const BOTS = ['leo.brandt', 'priya.nair', 'sam.whitlock', 'zoe.castellano', 'omar.haddad', 'june.park',
  'felix.moreau']
  .map((n) => `${n}@bots.docs.vote`);
const PEOPLE = ['edsaperia@gmail.com'];
const HERE = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const TEXT = readFileSync(`${HERE}/tim-birthday-text.md`, 'utf8').replace(/\r\n/g, '\n').trimEnd();

const env = readFileSync('.env', 'utf8');
const KEY = (/^DRAFT_BOT_KEY\s*=\s*"?([^"\r\n]+)"?/m.exec(env) ?? [])[1];
if (!KEY) { console.error('no DRAFT_BOT_KEY in .env'); process.exit(2); }

const clock = () => new Date().toTimeString().slice(0, 8);
const say = (s) => console.log(`[${clock()}] ${s}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const post = (path, body, cookie) => fetch(BASE + path, {
  method: 'POST',
  headers: { 'content-type': 'application/json', origin: BASE, ...(cookie ? { cookie } : {}) },
  body: JSON.stringify(body),
});
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
const outbox = async () => {
  const r = await fetch(`${BASE}/api/bots/outbox`, { headers: { authorization: `Bearer ${KEY}` } });
  if (!r.ok) throw new Error(`bot outbox answered ${r.status}`);
  return (await r.json()).mails;
};

let COOKIE = null;
const cmd = async (name, args = {}, { soft = false } = {}) => {
  const r = await post(`/api/d/${SLUG}/cmd`, { cmd: name, args }, COOKIE);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = `${name} refused (${r.status}): ${JSON.stringify(j)}`;
    if (soft) { say(`  · ${msg}`); return null; }
    throw new Error(msg);
  }
  return j.result ?? j;
};
const view = async () => {
  const r = await fetch(`${BASE}/api/d/${SLUG}/view`, { headers: { cookie: COOKIE } });
  if (!r.ok) throw new Error(`view answered ${r.status}`);
  return r.json();
};

// 1. the save, as the founder bot — a member, at the chosen address
const health = await fetch(`${BASE}/healthz`).then((r) => r.json());
say(`docs.vote build ${String(health.build).slice(0, 7)} · paused=${health.paused}`);
const saved = await post('/api/docs', { title: TITLE, email: FOUNDER, slug: SLUG, isMember: true });
const sj = await saved.json();
if (!saved.ok) { console.error(`save refused (${saved.status}): ${JSON.stringify(sj)}`); process.exit(1); }
say(`saved “${TITLE}” at /d/${sj.slug} — creation mail sent to ${FOUNDER}`);

// 2. the creation link, out of the bot outbox
let link = null;
for (let i = 0; i < 20 && !link; i++) {
  const m = (await outbox()).find((x) => x.to === FOUNDER && /^Create/.test(x.subject ?? '') && x.link);
  if (m) link = m.link; else await sleep(1500);
}
if (!link) { console.error('no creation mail reached the bot outbox in 30s'); process.exit(1); }
const arrival = await followLink(link);
if (arrival.status !== 302 || !arrival.location.includes(`/d/${SLUG}`)) {
  console.error(`creation link answered ${arrival.status} → ${arrival.location}`); process.exit(1);
}
COOKIE = arrival.cookie;
writeFileSync(`${HERE}/tim-founder.cookie`, COOKIE);
say(`founded: ${BASE}/d/${SLUG} (founder cookie saved)`);

// 3. the starting text
await cmd('confirm-starting-text', { text: TEXT });
// 🎩 is recorded only by its own press (Q1372): without this every reader's constitution stops after 🤝
await cmd('set-convenor-membership', { isMember: true });
say(`starting text confirmed: ${TEXT.split('\n').length} lines, ${TEXT.length} chars`);

// 4. invitations — bots first, then Ed
for (const e of [...BOTS, ...PEOPLE]) { await cmd('invite', { email: e }); say(`invited ${e}`); }

// 5. the constitution: held settings set, three delegated
const held = {
  // the plan seals at 23:59 London on 30 September 2026 (BST = UTC+1), before the party
  ending: { endsAtMs: Date.UTC(2026, 8, 30, 22, 59) },
  authorship: { rung: 'sealedElective' },
  judgments: { rung: 'after' },
  applications: { apply: true },
  admission: { price: 'proposal' },
  removal: { price: 'consent' },
  lapse: { afterMs: null },
};
for (const [setting, value] of Object.entries(held)) {
  if (await cmd('set-setting', { setting, value }, { soft: true }) !== null) say(`set ${setting}`);
}
for (const setting of ['quorum', 'rate', 'chamber']) { await cmd('delegate', { setting }); say(`delegated ${setting}`); }

// 6. wait for every answer, then 🍾 with every power laid down
const managed = health.catalogue.filter((id) => !['displayName', 'picture', 'startingText'].includes(id));
const keys = [...managed, 'startingText', 'door:invite', 'door:remove'];
let laidDown = keys.flatMap((setting) => [{ setting, power: 'unilateral' }, { setting, power: 'assent' }]);
let last = '';
for (let i = 0; i < 4 * 60 * 6; i++) {           // up to six hours
  const v = await view();
  const r = v.readiness ?? {};
  const line = JSON.stringify({ ready: r.ready, waiting: r.waiting, holds: r.holds });
  if (line !== last) { say(`readiness ${line}`); last = line; }
  if (r.ready) break;
  await sleep(15_000);
}
for (let tries = 0; tries < 6; tries++) {
  try { await cmd('begin', { laidDown }); say(`🍾 begun — ${laidDown.length} powers laid down`); break; }
  catch (e) {
    const m = /'([^']+)' carries no power/.exec(e.message);
    if (!m) { console.error(e.message); process.exit(1); }
    say(`  · ${m[1]} carries no power to lay down — dropping it`);
    laidDown = laidDown.filter((p) => p.setting !== m[1]);
  }
}
say('done');
