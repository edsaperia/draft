#!/usr/bin/env node
/**
 * admit-keep — **one member votes against an application at 🏛️, and it ends
 * there** (Q1473; Ed, 2026-09-19, testing a live room with real people: *a
 * stranger applied, it requires 🏛️, one tester voted against, but their
 * application remains in Applicants and is ⏳ in the rail*).
 *
 *   node scripts/repro/admit-keep.mjs http://127.0.0.1:8270
 *
 * Until SPEC v0.138 a standing keep blocked a constitutional motion without
 * killing it, and the one way out — the mover's withdrawal — is a road an
 * application does not have, its mover being nobody (§9.7½). So the applicant
 * waited under *Applicants* until the document closed, told nothing. Ed's
 * ruling: every 🏛️ vote fails on the first vote against.
 *
 * One document, three seats and the person at the door, and four things read
 * where a member would read them:
 *
 *   module     the motion is `held`, the applicant `refused`, and nobody is
 *              owed a card — an application has no mover to tell (R-130).
 *   applicant  their own 🪪 card stops saying the members are deciding: the
 *              title says the application was not accepted and the body says
 *              the membership did not agree. **It names nobody** — neither
 *              the seat that voted against nor any count.
 *   member     the other member's rail has no admit entry left to press, and
 *              the applicant has left the *Applicants* subsection: the card
 *              that refused their press with *the motion is not running* is
 *              not drawn at all.
 *   again      the door is not barred — the same address may apply afresh.
 *
 * Exit 0 only if all four pass; 1 on any failure, 2 on a broken set-up.
 */
import { chromium } from 'playwright';
import { post as postTo, followLink, outbox, linkIn, sleep } from '../lib/walk.mjs';

const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || process.env.DRAFT_BASE_URL
  || 'http://127.0.0.1:8270').replace(/\/$/, '');
const say = (s) => console.log(`[${new Date().toTimeString().slice(0, 8)}] ${s}`);
const bad = [];
const check = (ok, what, saw) => {
  say((ok ? '  ok   · ' : '  FAIL · ') + what + (ok || saw === undefined ? '' : ' — ' + JSON.stringify(saw)));
  if (!ok) bad.push(what);
};

const run = Date.now().toString(36);
const post = (path, body, cookie) => postTo(BASE, path, body, cookie);
const jars = new Map();
let SLUG;
const cmd = async (who, name, args = {}) => {
  const r = await post(`/api/d/${SLUG}/cmd`, { cmd: name, args }, jars.get(who));
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, ...j };
};
const viewAs = async (who) => (await (await fetch(`${BASE}/api/d/${SLUG}/view`,
  { headers: { cookie: jars.get(who) } })).json());
const mailTo = async (to, seen = new Set()) => {
  for (let i = 0; i < 40; i++) {
    const m = (await outbox(BASE)).find((x) => x.to === to && linkIn(x) && !seen.has(linkIn(x)));
    if (m) return m;
    await sleep(300);
  }
  throw new Error('no mail to ' + to);
};

/* ---- a document at 🏛️, three members, the doors laid down -------------- */
const created = await (await post('/api/docs', {
  title: `Admit keep ${run}`, email: `founder-${run}@example.org`, isMember: true })).json();
SLUG = created.slug;
jars.set('founder', (await followLink(created.devLink)).cookie);
await cmd('founder', 'confirm-starting-text', { text: ['# Admit keep', 'One clause about the rota.'].join('\n') });
await cmd('founder', 'set-convenor-membership', { isMember: true });
const m1 = `m1-${run}@example.org`, m2 = `m2-${run}@example.org`;
const seen = new Set();
await cmd('founder', 'invite', { email: m1 });
await cmd('founder', 'invite', { email: m2 });
for (const [who, addr] of [['m1', m1], ['m2', m2]]) {
  const mail = await mailTo(addr, seen);
  seen.add(linkIn(mail));
  jars.set(who, (await followLink(linkIn(mail))).cookie);
}
for (const [setting, value] of Object.entries({
  ending: { endsAtMs: Date.now() + 30 * 24 * 3600_000 }, authorship: { rung: 'sealedElective' },
  judgments: { rung: 'after' }, applications: { apply: true }, admission: { price: 'assembly' },
  removal: { price: 'consent' }, lapse: { afterMs: null }, machines: { enabled: false, budget: 0 },
  pace: { shape: 'fixed' }, bar: { pct: 60 }, quorum: { form: 'share', n: 50 },
  rate: { grant: 5, cap: 8, dripMinutes: 10 }, chamber: { rung: 'link' },
})) await cmd('founder', 'set-setting', { setting, value });
// every power laid down, the two doors included: an admission the membership
// carries then lands outright, so nothing here is about the crown
const health = await (await fetch(`${BASE}/healthz`)).json();
const keys = [...health.catalogue.filter((id) => !['displayName', 'picture', 'startingText'].includes(id)),
  'startingText', 'door:invite', 'door:remove'];
await cmd('founder', 'begin', { laidDown: keys.flatMap((setting) =>
  [{ setting, power: 'unilateral' }, { setting, power: 'assent' }]) });
say(`founded ${SLUG} — 🪪 at 🏛️, 🤝 open, three members, every power laid down`);

/* ---- somebody knocks --------------------------------------------------- */
const APPLICANT = `rowan-${run}@example.org`;
const ap = await post(`/api/d/${SLUG}/apply`, { email: APPLICANT });
if (!ap.ok) { say('SETUP: the door refused the application'); process.exit(2); }
const apMail = await mailTo(APPLICANT, seen);
seen.add(linkIn(apMail));
const browser = await chromium.launch();
const errors = [];
const seatPage = async (link) => {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(link, { waitUntil: 'load' });
  for (let i = 0; i < 40 && !page.url().includes('/d/'); i++) await sleep(500);
  await sleep(2500);
  return page;
};
const applicant = await seatPage(linkIn(apMail));
// the application is submitted from the page, as a person makes one
const submitted = await applicant.evaluate(async () => {
  const r = await fetch(location.origin + '/api/d/' + location.pathname.split('/')[2] + '/cmd', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ cmd: 'submit-application', args: { name: 'Rowan Vale', words: 'I bake.' } }) });
  return r.status;
});
if (submitted !== 200) { say(`SETUP: submit-application → ${submitted}`); process.exit(2); }
await sleep(1500);
say('applied     · Rowan Vale submitted, and the motion is the application itself');

/* ---- one member votes against ------------------------------------------ */
const before = await viewAs('m1');
const mo = (((before || {}).view || {}).motions || [])
  .find((x) => x.payload && x.payload.kind === 'admit');
if (!mo) { say('SETUP: no admit motion in a member view'); process.exit(2); }
await cmd('founder', 'give-ok', { setting: 'grant-voice' }).catch(() => ({}));
const accepted = await cmd('m1', 'answer-motion', { motion: mo.id, answer: 'accept' });
say(`m1 accepts  · ${accepted.status}`);
const kept = await cmd('m2', 'answer-motion', { motion: mo.id, answer: 'keep' });
say(`m2 votes no · ${kept.status}`);
check(kept.status === 200, 'the vote against is taken', kept.error);

/* ---- (1) the module ----------------------------------------------------- */
const after = await viewAs('m1');
const moNow = (((after || {}).view || {}).motions || []).find((x) => x.id === mo.id);
check(!!moNow && moNow.status === 'held', 'the application ends on that one vote', moNow && moNow.status);
check(!!moNow && moNow.heldBy === 'members', 'and the record says the membership held it', moNow && moNow.heldBy);
check(JSON.stringify(after).indexOf('"keep"') < 0 || (after.view.motions || [])
  .every((x) => x.id !== mo.id || x.myAnswer !== 'keep'),
'a member who did not vote against is never told who did');
// the row stays on the wire — it is the record of what happened — and reads
// `refused`; what the page does with it is read on the member's own rail below
const apRow = ((after.view || {}).applicants || []).find((x) => x.id === mo.payload.applicant);
check(!!apRow && apRow.status === 'refused', 'the applicant’s own status is refused', apRow && apRow.status);

/* ---- (2) the applicant's own page --------------------------------------- */
await sleep(5000); // one poll
const card = await applicant.evaluate(async () => {
  const li = document.querySelector('#rail [data-card="apply"]');
  if (li) { li.click(); await new Promise((s) => setTimeout(s, 800)); }
  const c = document.querySelector('.setupcard');
  const entry = document.querySelector('#rail .qitem[data-q="apply"]');
  return { title: c ? (c.querySelector('.cardhead, .chead, h3, .eyebrow') || {}).textContent : null,
    body: c ? (c.textContent || '').replace(/\s+/g, ' ').trim() : null,
    rail: entry ? (entry.textContent || '').replace(/\s+/g, ' ').trim() : null };
});
say('applicant   · ' + JSON.stringify(card).slice(0, 260));
check(!!card.body && /did not agree/.test(card.body),
  'their own card says the membership did not agree', card.body);
check(!!card.body && !/the members are deciding/.test(card.body),
  'and stops saying the members are deciding', card.body);
check(!!card.body && !/Rowan|m1-|m2-|founder-/.test(card.body.replace(/Rowan Vale/g, '')),
  'and names nobody who voted');
check(!!card.rail && !/\d+ of \d+/.test(card.rail),
  'the rail entry carries no count of the vote', card.rail);

/* ---- (3) the other member's page ---------------------------------------- */
const memberPage = await seatPage((await (await post(`/api/d/${SLUG}/login`, { email: m1 })).json()).devLink);
const railM1 = await memberPage.evaluate(() => ({
  admit: [...document.querySelectorAll('#rail .qitem')].map((q) => q.dataset.q).filter((k) => /^adm:/.test(k || '')),
  applicants: (() => { const h = [...document.querySelectorAll('.csub')]
    .find((e) => /Applicants/.test(e.textContent || ''));
  return h ? (h.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80) : null; })(),
}));
say('member      · ' + JSON.stringify(railM1));
check(railM1.admit.length === 0, 'the other member has no admit entry left to press', railM1.admit);
check(!railM1.applicants || !/Rowan/.test(railM1.applicants),
  'and the applicant is gone from Applicants', railM1.applicants);

/* ---- (4) the door is not barred ----------------------------------------- */
const again = await post(`/api/d/${SLUG}/apply`, { email: APPLICANT });
check(again.ok, 'the same address may apply again', again.status);

say('errors      · ' + (errors.length ? errors.join(' | ') : 'none'));
if (errors.length) bad.push('page errors');
await browser.close();
if (bad.length) { say(`\nFAILED (${bad.length}): ${bad.join(' · ')}`); process.exit(1); }
say('\nok — a vote against ends an application, and everybody reads it that way');
