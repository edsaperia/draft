#!/usr/bin/env node
/**
 * invite-walk — a member's invitation motion, on the surface (Q1370).
 *
 *   npm run invite-walk -- http://127.0.0.1:8140
 *
 * Founds a document with 🪪 at *proposal*, the founder keeping every power,
 * begins it, and seats two members. The first composes an invitation on ✉️
 * and the walk asserts what the lab-2026 room found missing (Ed, 2026-09-15,
 * *this user was not already invited*):
 *
 *   1. the composer's commit is the route's own — ✏️ at *proposal*, never
 *      the 🏛️ hold (SURFACE §9's ✉️ row);
 *   2. the motion opens, and the mover's page says so: the ✉️ entry stands
 *      in the rail as **theirs** (✏️, `st-yours`, force-kept — M3), the
 *      invitee stands in ✉️'s head and under *Invitees* wearing *proposed*,
 *      and the card offers withdraw and no ✓ (K8);
 *   3. the other member is asked (`st-ask`);
 *   4. the module's refusal of a twin carries no motion id (STYLE T1),
 *      asserted over the wire since the surface no longer offers the box on
 *      a card holding the motion;
 *   5. and, since issue #6, **the vote itself**: at *proposal* an invitation
 *      is a race, so the other member chooses *proposed* and commits, the
 *      motion carries, the invitee becomes a member row that has not
 *      arrived, a login link reaches their inbox, and *Invitees* stops
 *      calling them proposed.
 *
 * Needs a dev server (no RESEND_API_KEY: the outbox is read for the links).
 * Red on the pre-fix page at 1 (the 🏛️ hold), 2 (no entry, *Nobody has been
 * invited yet*) and 4 (`'mo-1' proposes the same`); red on the pre-#6 tree at
 * 5, where no race is entered at all and the ✓ sends nothing.
 */
import { chromium } from 'playwright';
import { assertServerBuild, walkBase } from './lib/assert-server.mjs';
import { say, sleep as T, followLink, post as postTo, outbox, linkIn } from './lib/walk.mjs';

const BASE = walkBase(process.argv, process.env, 'http://127.0.0.1:8140');
const stuck = [];
const fail = (what, why) => { say('FAIL: ' + why); stuck.push(what); };
await assertServerBuild(BASE, 'invite-walk');

const run = Date.now().toString(36);
const post = (path, body, cookie) => postTo(BASE, path, body, cookie);
const mailTo = async (to, seen = new Set()) => {
  for (let i = 0; i < 30; i++) {
    const m = (await outbox(BASE)).find((x) => x.to === to && linkIn(x) && !seen.has(linkIn(x)));
    if (m) return m;
    await T(300);
  }
  throw new Error('no mail to ' + to);
};
const jars = new Map();
let SLUG;
const cmd = async (who, name, args = {}) => {
  const r = await post(`/api/d/${SLUG}/cmd`, { cmd: name, args }, jars.get(who));
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, ...j };
};

/* ---- the document: 🪪 at proposal, the founder keeping every power ------ */
const created = await (await post('/api/docs', {
  title: `Invite walk ${run}`, email: `founder-${run}@example.org`, isMember: true })).json();
SLUG = created.slug;
jars.set('founder', (await followLink(created.devLink)).cookie);
await cmd('founder', 'confirm-starting-text', { text: ['# Invite walk', 'One clause about the kitchen rota.', 'Another clause about guests.'].join('\n') });
await cmd('founder', 'set-convenor-membership', { isMember: true });
const m1 = `m1-${run}@example.org`, m2 = `m2-${run}@example.org`;
await cmd('founder', 'invite', { email: m1 });
await cmd('founder', 'invite', { email: m2 });
jars.set('m1', (await followLink(linkIn(await mailTo(m1)))).cookie);
jars.set('m2', (await followLink(linkIn(await mailTo(m2)))).cookie);

/* ---- a withdrawn invitation, before the start (Q1493) -------------------
   Ed, 2026-09-21: *An email when withdrawn*. The withdrawal was silent, and
   the only thing that ever said it had happened was the old link — which
   answered *unknown member 'm-7'* at 12:43 on the day of the convention, the
   machine's own vocabulary to somebody following the one address they had
   been given. Withdrawing is the Founder's own act and lives before 🍾
   (`requirePreStart`), so the step stands here, where the document still is.
   Red on the pre-fix host at *no mail* and at *400*. */
{
  const gone = `m3-${run}@example.org`;
  await cmd('founder', 'invite', { email: gone });
  const sent = await mailTo(gone);
  const deadLink = linkIn(sent);
  const v0 = await (await fetch(`${BASE}/api/d/${SLUG}/view`, { headers: { cookie: jars.get('founder') } })).json();
  const row = ((v0.view || {}).members || []).find((m) => m.email === gone);
  const pulled = row ? await cmd('founder', 'uninvite', { member: row.id }) : { ok: false };
  await T(900);
  const told = (await outbox(BASE)).filter((x) => x.to === gone);
  const last = told[0];                     // the tail is newest first
  const subjectOk = !!last && /has been withdrawn/.test(String(last.subject || ''));
  const noToken = !!last && !/token=/.test(String(last.text || last.body || ''));
  const door = deadLink ? await followLink(deadLink) : { status: 0, location: '', cookie: '' };
  const doorOk = door.status === 302 && door.location === `/d/${SLUG}` && !door.cookie;
  say('withdrawn  · ' + JSON.stringify({ pulled: !!pulled.ok, mails: told.length,
    subject: last && last.subject, door: door.status + ' ' + door.location }));
  if (!pulled.ok || told.length !== 2 || !subjectOk || !noToken) {
    fail('the withdrawal mail', 'one mail saying the invitation is withdrawn, with no login link — saw '
      + JSON.stringify(told.map((x) => x.subject)));
  }
  if (!doorOk) {
    fail('the dead link', 'the withdrawn invitee’s old link should land on the ordinary door — saw '
      + door.status + ' ' + door.location + (door.cookie ? ' with a cookie' : ''));
  }
}
for (const [setting, value] of Object.entries({
  ending: { endsAtMs: Date.now() + 30 * 24 * 3600_000 }, authorship: { rung: 'sealedElective' },
  judgments: { rung: 'after' }, applications: { apply: true }, admission: { price: 'proposal' },
  removal: { price: 'consent' }, lapse: { afterMs: null }, machines: { enabled: false, budget: 0 },
  pace: { shape: 'fixed' }, bar: { pct: 60 }, quorum: { form: 'share', n: 50 },
  rate: { grant: 5, cap: 8, dripMinutes: 10 }, chamber: { rung: 'link' },
})) await cmd('founder', 'set-setting', { setting, value });
const begun = await cmd('founder', 'begin', { laidDown: [] });
if (!begun.ok) { say('FAIL: 🍾 refused: ' + JSON.stringify(begun)); process.exit(1); }
say('founded    · ' + SLUG + ' — 🪪 at proposal, begun, two members seated');

/* ---- the mover's page --------------------------------------------------- */
const browser = await chromium.launch();
const errors = [];
const seat = async (email) => {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(email.split('-')[0] + ': ' + String(e)));
  const login = await (await post(`/api/d/${SLUG}/login`, { email })).json();
  await page.goto(login.devLink, { waitUntil: 'networkidle' });
  await T(1500);
  // every OK owed at the start (the founder's settings, the gates): the
  // motion waits behind ⚖️'s OK for anybody but its mover (Q1344)
  for (let i = 0; i < 20; i++) {
    const okd = await page.evaluate(async () => {
      const li = [...document.querySelectorAll('#rail .qitem')]
        .find((q) => q.querySelector('button.st-news') && !/^adm:/.test(q.dataset.q));
      if (!li) return null;
      li.querySelector('button').click();
      await new Promise((s) => setTimeout(s, 500));
      const ok = document.querySelector('.setupcard [data-ok], .setupcard .okbtn');
      if (!ok) return null;
      ok.click();
      return li.dataset.q;
    });
    if (!okd) break;
    await T(900);
  }
  return page;
};
const rail = (page) => page.evaluate(() => [...document.querySelectorAll('#rail .qitem')]
  .map((q) => ({ k: q.dataset.q, st: (q.querySelector('button').className.match(/st-\w+/) || [''])[0],
    mine: !!q.querySelector('button.st-yours') })));

const mover = await seat(m1);
const composed = await mover.evaluate(async () => {
  const tab = document.querySelector('[data-tab="invite"]');
  if (!tab) return { err: 'no ✉️ tab' };
  tab.click();
  await new Promise((s) => setTimeout(s, 700));
  const card = document.querySelector('.setupcard[data-setupcard="invite"]');
  if (!card) return { err: '✉️ opened no card' };
  const ta = card.querySelector('textarea');
  if (!ta) return { err: 'no address box: ' + card.textContent.trim().replace(/\s+/g, ' ').slice(0, 160) };
  ta.focus(); ta.value = 'newbie@example.org'; ta.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise((s) => setTimeout(s, 400));
  const b = [...card.querySelectorAll('.commitrow button')].filter((x) => !x.disabled && !/🗑/.test(x.textContent) && !x.querySelector('[data-gl="bin"]')).pop();
  if (!b) return { err: 'no live commit after typing' };
  return { glyph: window.CARDS.glyphTextOf(b).trim(), title: b.title, hold: b.hasAttribute('data-holdmotion') };
});
if (composed.err) fail('the composer', composed.err);
else {
  say('composer   · commit ' + composed.glyph + ' [' + composed.title + ']');
  if (composed.hold || composed.glyph !== '✏️') {
    fail('the route', 'at 🪪 proposal the ✉️ commit must be ✏️, saw ' + composed.glyph + ' (' + composed.title + ')');
  }
}
// the press: a real pointer on the commit, held or clicked by the page's gesture
const pressed = await mover.evaluate(async () => {
  const b = [...document.querySelectorAll('.setupcard .commitrow button')].filter((x) => !x.disabled && !/🗑/.test(x.textContent) && !x.querySelector('[data-gl="bin"]')).pop();
  if (!b) return false;
  const ev = (t) => b.dispatchEvent(new PointerEvent(t, { bubbles: true, pointerId: 1, isPrimary: true }));
  ev('pointerdown'); await new Promise((s) => setTimeout(s, 1300)); ev('pointerup'); b.click();
  return true;
});
if (!pressed) fail('the press', 'no commit to press');
await T(4500);

const view = await mover.evaluate(async () => (await (await fetch(location.origin + '/api/d/' + location.pathname.split('/')[2] + '/view')).json()).view.motions);
const mo = (view || []).find((m) => m.payload && m.payload.kind === 'invite');
if (!mo) fail('the motion', 'no invite motion opened: ' + JSON.stringify(view));
else say('motion     · ' + mo.id + ' ' + mo.route + ' running, mine=' + mo.mine);
if (mo && mo.route !== 'ordinary') fail('the route', 'the motion should race at ✏️, saw ' + mo.route);

const r1 = await rail(mover);
// under Q1367 a running motion is its own card, `mo:<id>`, wearing the door's ✉️ — the entry and the tab are the motion's, not the door's
const isMo = (e) => /^mo:/.test(e.k);
const inv = r1.find(isMo);
say('rail       · ' + JSON.stringify(r1.map((e) => e.k + ':' + e.st)));
if (!inv) fail('the entry', 'the mover has no ✉️ entry (Q1370\'s shape)');
else if (inv.st !== 'st-yours') fail('the entry', 'the mover\'s ✉️ entry should be theirs (st-yours ✏️), saw ' + inv.st);

await mover.evaluate(() => { const t = document.querySelector('[data-tab^="mo:"]'); if (t) t.click(); });
await T(800);
const shown = await mover.evaluate(() => {
  const card = document.querySelector('.setupcard[data-setupcard^="mo:"]');
  return {
    tabs: [...document.querySelectorAll('[data-tab]')].map((t) => t.dataset.tab).filter((k) => /invite|mo:/.test(k)),
    open: [...document.querySelectorAll('.setupcard')].map((c) => c.dataset.setupcard),
    head: (card && card.querySelector('.headpeople') || {}).textContent?.replace(/\s+/g, ' ').trim(),
    chips: [...(card ? card.querySelectorAll('.headpeople .chip') : [])].map((c) => c.textContent.trim()),
    radios: [...(card ? card.querySelectorAll('button.lanepick') : [])].length,
    commits: [...(card ? card.querySelectorAll('.commitrow button') : [])].map((b) => (b.textContent.trim() || b.title)),
  };
});
say('card       · ' + JSON.stringify(shown));
if (!shown.head || !/newbie/.test(shown.head)) fail('the head', '✉️\'s head does not list the invitee: ' + JSON.stringify(shown.head));
if (!shown.chips.length) fail('the chip', 'the pending invitee wears no *proposed* chip');
if (shown.radios) fail('the ask', 'the mover is offered ' + shown.radios + ' radios on their own motion (K8: the mover stands at accept)');
if (shown.commits.some((t) => /✓|Answer/.test(t)) || shown.commits.length !== 1) {
  fail('the commit row', 'the mover\'s row should be withdraw alone, saw ' + JSON.stringify(shown.commits));
}
// the subsection: close the card and read *Invitees* as document text
await mover.evaluate(() => { const t = document.querySelector('[data-tab^="mo:"]'); if (t) t.click(); });
await T(800);
const sub = await mover.evaluate(() => {
  const h = document.getElementById('cs-mem-invitees');
  const box = h && (h.closest('.csub') || h.parentElement);
  return box ? box.textContent.replace(/\s+/g, ' ').trim().slice(0, 160) : null;
});
say('Invitees   · ' + JSON.stringify(sub));
if (!sub || !/newbie/.test(sub) || !/proposed/.test(sub)) fail('the subsection', '*Invitees* does not list the proposed invitee: ' + JSON.stringify(sub));

/* ---- the other member is asked ----------------------------------------- */
const judge = await seat(m2);
const r2 = await rail(judge);
const inv2 = r2.find(isMo);
say('other seat · ' + JSON.stringify(r2.map((e) => e.k + ':' + e.st)));
if (!inv2) fail('the other entry', 'the other member has no ✉️ entry');
else if (inv2.st !== 'st-ask') fail('the other entry', 'the other member\'s ✉️ entry should ask (st-ask), saw ' + inv2.st);

/* ---- the twin refusal names no id (STYLE T1) --------------------------- */
const twin = await cmd('m2', 'open-motion', { payload: { kind: 'invite', email: 'newbie@example.org' } });
say('twin       · ' + twin.status + ' ' + JSON.stringify(twin.error || twin));
if (twin.ok) fail('the twin', 'a second identical invitation was accepted');
else if (/mo-\d+/.test(String(twin.error))) fail('the refusal', 'the refusal names a motion id: ' + twin.error);
else if (!/already put/.test(String(twin.error))) fail('the refusal', 'unexpected refusal: ' + twin.error);

/* ---- …and judges it, and it carries (issue #6, F1) ---------------------- */
// At *proposal* the invitation **is a race** — the one thing the bridge never
// entered, so before #6 the walk stopped here: the room could see the motion
// and never vote on it, the ✓ looked a race up by the card's key (`mo:<id>`)
// and found none, and no invitation at this price could ever carry.
const judged = await judge.evaluate(async () => {
  const tab = document.querySelector('[data-tab^="mo:"]');
  if (!tab) return { err: 'no motion tab on the other seat' };
  tab.click();
  await new Promise((s) => setTimeout(s, 700));
  const card = document.querySelector('.setupcard[data-setupcard^="mo:"]');
  if (!card) return { err: 'the motion tab opened no card' };
  const lanes = [...card.querySelectorAll('button.lanepick')]
    .map((b) => b.getAttribute('data-motion'));
  const yes = card.querySelector('button.lanepick[data-motion="proposed"]');
  if (!yes) return { err: 'no *proposed* lane to vote with, lanes: ' + JSON.stringify(lanes) };
  yes.click();
  // the press re-renders the card, so the row is re-read off the document
  // rather than off the node the lane was found in (`nothing rebuilds under
  // a press` cuts the other way for a walk)
  await new Promise((s) => setTimeout(s, 600));
  const open = document.querySelector('.setupcard[data-setupcard^="mo:"]');
  if (!open) return { err: 'the card went away when the lane was chosen', lanes };
  const b = [...open.querySelectorAll('.commitrow button')]
    .filter((x) => !x.disabled && !x.querySelector('[data-gl="bin"]')).pop();
  if (!b) return { err: 'no live commit after choosing, lanes: ' + JSON.stringify(lanes) };
  const ev = (t) => b.dispatchEvent(new PointerEvent(t, { bubbles: true, pointerId: 1, isPrimary: true }));
  ev('pointerdown'); await new Promise((s) => setTimeout(s, 1300)); ev('pointerup'); b.click();
  return { lanes, commit: b.title || b.textContent.trim() };
});
say('judged     · ' + JSON.stringify(judged));
if (judged.err) fail('the vote', judged.err);
else if (!judged.lanes.includes('stands') || !judged.lanes.includes('proposed')) {
  fail('the lanes', 'the ordinary lanes should be stands/proposed/either, saw ' + JSON.stringify(judged.lanes));
}
await T(4500);

// …and the Founder's 🛡️ over ✉️ is still held here, so the carry parks at the
// 👑 (SPEC §9.7 rule 9): a race the room decided, and one hand left to say
// yes. The invitation lands when they do.
const crownView = await (await fetch(`${BASE}/api/d/${SLUG}/view`,
  { headers: { cookie: jars.get('founder') } })).json();
const crown = ((crownView.view && crownView.view.crownTasks) || [])[0];
say('crown      · ' + JSON.stringify(crown && { id: crown.id, motion: crown.motion }));
if (!crown) fail('the crown', 'the carried invitation raised no 👑 question for the held 🛡️');
else {
  /* **And the Founder is asked on the page, not over the wire** (Q1475, Ed
   * 2026-09-19, the Founder of a live room: *I did have founder veto but I
   * wasn't served a queue card for it*). This walk answered the question with
   * a command and so never looked at the founder's own surface, where the
   * motion's rail entry read ⏳ — *you have answered it*, which is true of
   * the Founder on every motion their own accept carried — so the ask never
   * ran. An invitation's card is a `mo:<id>` card, which is the door's half
   * of the fix `applicants-walk` reads on the admission card. */
  const chair = await seat(`founder-${run}@example.org`);
  const entry = await chair.evaluate((id) => {
    const li = document.querySelector('#rail .qitem[data-q="mo:' + id + '"]');
    const b = li && li.querySelector('button');
    return b ? { st: (b.className.match(/st-\w+/) || [''])[0] } : null;
  }, crown.motion);
  say('👑 entry   · ' + JSON.stringify(entry));
  if (!entry || entry.st !== 'st-ask') {
    fail('the 👑 entry', 'a parked invitation should ask the Founder, saw ' + JSON.stringify(entry));
  }
  const cq = await chair.evaluate(async (id) => {
    const li = document.querySelector('#rail .qitem[data-q="mo:' + id + '"]');
    const tab = document.querySelector('[data-tab="mo:' + id + '"]')
      || (li && li.querySelector('button'));
    if (!tab) return { err: 'no tab for the parked motion' };
    tab.click();
    await new Promise((s) => setTimeout(s, 1200));
    const c = document.querySelector('.setupcard');
    if (!c) return { err: 'the tab opened no card' };
    return { crownq: [...c.querySelectorAll('[data-crownq]')].map((b) => b.dataset.crownq),
      radios: c.querySelectorAll('.lanepick:not([disabled])').length,
      text: (c.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 140) };
  }, crown.motion);
  say('👑 card    · ' + JSON.stringify(cq));
  if (!cq || cq.err || cq.crownq.join('|') !== 'reject|accept' || cq.radios !== 0) {
    fail('the 👑 card', 'a parked invitation should carry the 👑 pair and no vote: ' + JSON.stringify(cq));
  }
  const pressed = await chair.evaluate(() => {
    const b = document.querySelector('.setupcard [data-crownq="accept"]');
    if (!b) return false;
    b.click();
    return true;
  });
  say('👑 ✒️      · ' + (pressed ? 'pressed on the page' : 'no ✒️ to press'));
  if (!pressed) fail('the 👑 accept', 'the parked invitation offered the Founder no ✒️');
}
await T(2500);

const carried = await mover.evaluate(async () =>
  (await (await fetch(location.origin + '/api/d/' + location.pathname.split('/')[2] + '/view')).json()));
const mo2 = ((carried.view && carried.view.motions) || []).find((m) => m.payload && m.payload.kind === 'invite');
say('carry      · ' + JSON.stringify(mo2 && { id: mo2.id, status: mo2.status }));
if (!mo2 || mo2.status !== 'carried') {
  fail('the carry', 'the judged invitation should have carried, saw ' + JSON.stringify(mo2 && mo2.status));
}
// the invitee is a member row that has not arrived — what a direct ✉️ makes
const row = ((carried.view && carried.view.members) || []).find((m) => m.email === 'newbie@example.org');
say('invitee    · ' + JSON.stringify(row && { id: row.id, arrived: row.arrived }));
if (!row) fail('the invitee', 'the carry seated nobody for newbie@example.org');
else if (row.arrived) fail('the invitee', 'an invitee is not arrived until they follow the link');
if (carried.electorateSize !== 3) fail('the electorate', 'an invitee counts toward nothing until they arrive, E=' + carried.electorateSize);
// …and the mail went, exactly as a direct invitation's does
let mail = null;
try { mail = await mailTo('newbie@example.org'); } catch { mail = null; }
say('mail       · ' + JSON.stringify(mail && linkIn(mail)));
if (!mail || !/\/auth\/login/.test(linkIn(mail) || '')) {
  fail('the mail', 'no login link reached the carried invitee');
}
// the subsection stops saying *proposed*: the invitation stands
const sub2 = await mover.evaluate(() => {
  const h = document.getElementById('cs-mem-invitees');
  const box = h && (h.closest('.csub') || h.parentElement);
  return box ? box.textContent.replace(/\s+/g, ' ').trim().slice(0, 160) : null;
});
say('Invitees   · ' + JSON.stringify(sub2));
if (!sub2 || !/newbie/.test(sub2)) fail('the subsection', '*Invitees* lost the carried invitee: ' + JSON.stringify(sub2));
else if (/proposed/.test(sub2)) fail('the subsection', '*Invitees* still calls the carried invitation proposed');

/* ---- an invitation the room can no longer pass lets its address go ------
 * (Q1440, Ed 2026-09-18; SPEC §4.4 → why: R-132.)
 *
 * The twin rule (R-103) holds an address against a motion that is **running**,
 * and until now an invitation the room did not want ran until T=0 — so a room
 * that voted one down could not invite that person again for the life of the
 * document, and the mover was never told it had failed either, an OK being
 * refused on a shut document (R-130's own note). Both end here: the motion is
 * held at the sweep that discovers it, the mover is owed E41's card, and the
 * address is free.
 *
 * The room is three and the quorum is half, so F is two: the founder's refusal
 * leaves it standing — m2 could still make it two against one — and m2's
 * closes it. Driven over the wire, because what is asserted is the module's
 * state and the door's answer, not a control. */
const viewFor = async (who) => (await (await fetch(`${BASE}/api/d/${SLUG}/view`,
  { headers: { cookie: jars.get(who) } })).json());
const refuse = async (who, person) => {
  const v = await viewFor(who);
  const race = (v.settingRaces || []).find((r) => r.settingId === `invite:${person}`);
  const card = (v.raceCards || []).find((c) =>
    (c.a.setting || {}).settingId === `invite:${person}` ||
    (c.b.setting || {}).settingId === `invite:${person}`)
    || (race && race.ask) || null;
  if (!card) return { err: 'no pair on the invitation for ' + who };
  // the incumbent endpoint is *they are not a member*, which is what a
  // refusal prefers
  const keep = card.a.id.startsWith('inc:') ? 'a' : 'b';
  return cmd(who, 'judge-race', { a: card.a.id, b: card.b.id, outcome: keep });
};
const SECOND = `second-${run}@example.org`;
const opened = await cmd('m1', 'open-motion',
  { payload: { kind: 'invite', email: SECOND }, why: 'they keep the rota' });
say('second     · ' + JSON.stringify(opened.error || opened.result));
if (!opened.ok) fail('the second invitation', 'the mover could not put it: ' + JSON.stringify(opened.error));
else {
  const motion = opened.result;
  const personOf = (v) => {
    const m = ((v.view && v.view.motions) || []).find((x) => x.id === motion);
    return m && m.payload ? m.payload.person : null;
  };
  const person = personOf(await viewFor('founder'));
  const one = await refuse('founder', person);
  if (one.err || one.ok === false) fail('the first refusal', JSON.stringify(one.err || one.error));
  await T(1500);
  const mid = ((await viewFor('m1')).view.motions || []).find((m) => m.id === motion);
  say('refused ×1 · ' + JSON.stringify(mid && mid.status));
  if (!mid || mid.status !== 'running') {
    fail('the first refusal', 'one refusal of three closed it — m2 could still have carried it');
  }
  const two = await refuse('m2', person);
  if (two.err || two.ok === false) fail('the second refusal', JSON.stringify(two.err || two.error));
  await T(2000);
  const v2 = await viewFor('m1');
  const held = (v2.view.motions || []).find((m) => m.id === motion);
  say('refused ×2 · ' + JSON.stringify(held && { status: held.status, owed: v2.view.owedHeld }));
  if (!held || held.status !== 'held') {
    fail('the domination', 'the invitation should be held by the membership, saw '
      + JSON.stringify(held && held.status));
  }
  // E41: the mover, and nobody else
  if (!(v2.view.owedHeld || []).includes(motion)) {
    fail('E41 for the mover', 'the mover is not owed the card: ' + JSON.stringify(v2.view.owedHeld));
  }
  for (const who of ['founder', 'm2']) {
    const owed = ((await viewFor(who)).view.owedHeld) || [];
    if (owed.includes(motion)) fail('E41’s audience', who + ' was owed a card about somebody else’s motion');
  }
  // **and the card the mover is owed wears the ✖** (Q1451, Ed 2026-09-18: *X
  // symbol should be for any kind of proposal you made that was rejected or
  // refused*). E41 is news whose news is a rejection, and it wore the ✔ every
  // news card wears — so the one line in the rail saying *your proposal did
  // not pass* was drawn with the mark this alphabet uses for *something
  // carried*. Read off the class and never off the character (Q288). A door's
  // rejection has no tab — it is the rail entry and the sentence beside
  // *Members* (E41's channel), the pile being the rule's and a door having
  // none — so the rail is the whole of what this walk can assert. Red on the
  // pre-Q1451 page at *mk-adopted*.
  await mover.reload();
  await T(2500);
  const heldMark = await mover.evaluate((k) => {
    const q = document.querySelector('#rail .qitem[data-q="' + k + '"] .mk');
    return q ? [...q.classList].find((c) => c.startsWith('mk-')) || null : null;
  }, 'held:' + motion);
  say('held ✖     · ' + JSON.stringify(heldMark));
  if (heldMark !== 'mk-retired') {
    fail('E41’s mark', 'the mover’s entry should wear the drawn ✖, saw ' + heldMark);
  }
  // nobody was invited…
  const seated = ((v2.view.members) || []).some((m) => m.email === SECOND);
  if (seated) fail('the invitation', 'a held invitation seated its invitee');
  // …and the address is free again: the twin rule holds only against a
  // motion that is running (R-103)
  const again = await cmd('m2', 'open-motion',
    { payload: { kind: 'invite', email: SECOND }, why: 'let us ask again' });
  say('address    · ' + (again.ok ? 'free — ' + again.result : 'FAIL ' + JSON.stringify(again.error)));
  if (!again.ok) fail('the released address', 'the same address was refused after the motion failed: '
    + JSON.stringify(again.error));
}

if (errors.length) fail('page errors', JSON.stringify(errors));
say(stuck.length ? '\nFAILED: ' + stuck.join(' · ') : '\nok — a member\'s invitation stands on the page from the press, and the room votes it in');
await browser.close();
process.exit(stuck.length ? 1 : 0);
