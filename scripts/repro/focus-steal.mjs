#!/usr/bin/env node
/**
 * focus-steal — **does the room take the caret out of a rationale?** (Ed, from the residency
 * room, 2026-09-18: *when typing in a rationale … my focus is pulled away from the box by some
 * other common event (perhaps someone voting?)*)
 *
 *   node scripts/repro/focus-steal.mjs http://127.0.0.1:8202 [--secs 60]
 *   node scripts/repro/focus-steal.mjs http://127.0.0.1:8202 --gap
 *
 * Founds a document on a dev server, invites twelve bots and one page seat, begins, and leaves
 * the bots to `room-bots` (run it beside this at a fast pace — the line is printed). The page
 * seat enters edit mode, types into a clause, then types a rationale one key at a time for
 * `--secs` seconds with real key presses, while a probe in the page records every moment the
 * rationale box stops holding the focus: whether the box was replaced (`isConnected` false —
 * a rebuild) or merely blurred, what was open, and which render ran last. Asserts nothing;
 * prints the log. Exit 1 if the focus was lost at all.
 *
 * **`--gap` needs no bots and asserts.** It is Q1461 (iii): Enter at the end of a clause makes
 * a new clause in the gap after it, and the sentence typed into it used to be torn in two. The
 * room's part in it was only ever geometry — a busy document is taller, so the clause you are
 * writing at is further down the window, and `toggle` travels to the card it is opening rather
 * than opening it where it stands. So this arranges both by hand: one other seat proposes on
 * that clause over HTTP (it is contested, as it was in the room), and the page scrolls the
 * clause low in the window before pressing Enter. Then it types the sentence key by key with
 * no pause, which is what a person does. Exit 1 on a tear, on a final model that is anything
 * but the one gap site holding the whole sentence, or on a proposal that is not a pure
 * insertion at the gap's own line.
 */
import { chromium } from 'playwright';
import { post as postTo, followLink, sleep, withWas } from '../lib/walk.mjs';

const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || 'http://127.0.0.1:8202').replace(/\/$/, '');
// --lane types the minute into the drafting lane instead of the rationale: the other box a rebuild replaces
const LANE = argv.includes('--lane');
// --gap makes a new clause in a gap (Enter at a clause's end), types it, waits out a few rebuilds and proposes it:
// Ed's *why can't I make a proposal* screenshot, the same afternoon
const GAP = argv.includes('--gap');
const SECS = Number((argv[argv.indexOf('--secs') + 1]) || 60) || 60;
const say = (s) => console.log(`[${new Date().toTimeString().slice(0, 8)}] ${s}`);
const die = (m) => { console.error(`focus-steal: ${m}`); process.exit(2); };

const health = await (await fetch(`${BASE}/healthz`)).json();
if (health.devMail !== true) die(`${BASE} is not a dev server`);
const post = (path, body, cookie) => postTo(BASE, path, body, cookie);
const run = Date.now().toString(36);
const founderEmail = `founder-${run}@example.org`, testerEmail = `tester-${run}@example.org`;
const created = await (await post('/api/docs', { title: `Focus ${run}`, email: founderEmail, isMember: true })).json();
if (!created.ok || !created.devLink) die(`creation refused: ${JSON.stringify(created)}`);
const SLUG = created.slug;
const founder = (await followLink(created.devLink)).cookie;
const cmd = async (name, args = {}) => {
  const r = await post(`/api/d/${SLUG}/cmd`, { cmd: name, args }, founder);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) die(`${name} refused (${r.status}): ${JSON.stringify(j)}`);
  return j.result ?? j;
};
await cmd('confirm-starting-text', { text: [
  `# Focus ${run}`, '## Meetings',
  'The society shall meet on the first Tuesday of every month, in the upstairs room, at seven.',
  'Every meeting opens with the minutes of the last one, read aloud by whoever kept them.',
  'A member who misses three meetings in a row shall be written to, kindly, by the secretary.',
  '## Money',
  'Subscriptions are due in January and are the same for every member, whatever their means.',
  'The treasurer may spend up to fifty pounds without asking; anything more goes to a meeting.',
  'Accounts are shown at the annual meeting and may be inspected by any member at any time.',
].join('\n') });
await cmd('set-convenor-membership', { isMember: true });
for (const [setting, value] of Object.entries({
  rate: { grant: 5, cap: 8, dripMinutes: 1 }, pace: { shape: 'fixed' }, quorum: { form: 'share', n: 30 },
  authorship: { rung: 'sealedElective' }, judgments: { rung: 'after' }, applications: { apply: false },
  admission: { price: 'pen' }, removal: { price: 'proposal' }, machines: { enabled: false, budget: 0 },
  lapse: { afterMs: 5 * 60_000 }, ending: { endsAtMs: Date.now() + 6 * 3_600_000 }, bar: { pct: 50 },
  chamber: { rung: 'link' },
})) {
  await (await post(`/api/d/${SLUG}/cmd`, { cmd: 'reclaim', args: { setting } }, founder)).text();
  await cmd('set-setting', { setting, value });
}
const NAMES = ['ada.lovelace', 'grace.hopper', 'alan.turing', 'edsger.dijkstra', 'barbara.liskov', 'donald.knuth',
  'margaret.hamilton', 'tony.hoare', 'frances.allen', 'john.backus', 'radia.perlman', 'ken.thompson'];
for (const n of NAMES) await cmd('invite', { email: `${n}@bots.docs.vote` });
// --gap's one other seat: a member who contests the clause over HTTP, so the run needs no bots
const rivalEmail = `rival-${run}@example.org`;
if (GAP) await cmd('invite', { email: rivalEmail });
await cmd('invite', { email: testerEmail });
await cmd('begin', {});
say(`founded ${BASE}/d/${SLUG} — begun, ${NAMES.length} bots invited`);
say(`beside this:  node scripts/room-bots.mjs ${BASE}/d/${SLUG} --min 2s --max 6s --tend 2s --heat 0.5 --seed focus`);

const linkFor = async (to) => {
  const t = await (await fetch(`${BASE}/api/dev/outbox`)).json();
  return (t.mails ?? []).find((m) => m.to === to && m.link);
};
// **the clause is contested before the page reaches it** (Q1461 (iii)): the room did this by
// itself, and one proposal over HTTP does it every time. `CLAUSE` is line 8, the last one.
const CLAUSE = 8;
if (GAP) {
  const m = await linkFor(rivalEmail);
  if (!m) die('no invitation for the rival seat in the dev outbox');
  const cookie = (await followLink(m.link)).cookie;
  const v = await (await fetch(`${BASE}/api/d/${SLUG}/view`, { headers: { cookie } })).json();
  const r = await post(`/api/d/${SLUG}/cmd`, { cmd: 'propose-text', args: { baseVersion: v.textVersion ?? 0,
    // the wording it replaces, off this seat's own view (Q1463 (1))
    hunks: withWas(v.text, [{ start: CLAUSE, end: CLAUSE + 1,
      lines: ['Accounts are shown at the annual meeting and may be inspected by any member whenever they ask.'] }]),
    why: 'plainer' } }, cookie);
  if (!r.ok) die(`the rival could not contest the clause (${r.status}): ${(await r.text()).slice(0, 200)}`);
  say('the clause is contested — one rival proposal over HTTP');
}

const tail = await (await fetch(`${BASE}/api/dev/outbox`)).json();
const mail = (tail.mails ?? []).find((m) => m.to === testerEmail && m.link);
if (!mail) die('no invitation for the page seat in the dev outbox');

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
page.on('pageerror', (e) => say(`pageerror: ${e.message}`));
await page.goto(mail.link);
await page.waitForURL(new RegExp(`/d/${SLUG}`), { timeout: 20_000 });
await page.waitForSelector('#charter', { timeout: 20_000 });
await sleep(1500);
// the grants' OKs live in localStorage, one key per document and seat: given here, so the seat may propose
await page.evaluate(() => {
  const me = fetch(location.pathname.replace('/d/', '/api/d/') + '/view').then((r) => r.json());
  return me.then((v) => localStorage.setItem('draft:grants:' + location.pathname.split('/')[2] + ':' + (v.me || ''),
    JSON.stringify(['canpropose', 'grant-pen', 'grant-shield', 'grant-voice', 'canjudge'])));
});
await page.reload();
await page.waitForSelector('#charter', { timeout: 20_000 });
if (GAP) await sleep(1500);            // --gap needs no room: the rival's proposal is the contest
else {
  say('waiting for the bots to arrive and the room to move (20s) — start room-bots now if it is not running');
  await sleep(20_000);
}

// the probe: every render the charter makes, and every time the rationale stops holding the focus
await page.evaluate(() => {
  window.__steal = []; window.__renders = [];
  const S = window.SESSION;
  for (const name of ['setData', 'refreshRail']) {
    const was = S[name];
    if (typeof was !== 'function') continue;
    S[name] = function (...a) {
      window.__renders.push({ at: Date.now(), name, keys: a[0] ? Object.keys(a[0]) : [], openId: S.openId });
      return was.apply(this, a);
    };
  }
  document.addEventListener('focusout', (ev) => {
    const el = ev.target;
    if (!el || !el.matches || !el.matches('.edit-why, [data-lane]')) return;
    setTimeout(() => {
      const last = window.__renders[window.__renders.length - 1] || null;
      window.__steal.push({ at: Date.now(), connected: el.isConnected, openId: S.openId,
        active: document.activeElement && (document.activeElement.id || document.activeElement.className || document.activeElement.tagName),
        lastRender: last && { name: last.name, keys: last.keys, openId: last.openId, msAgo: Date.now() - last.at } });
    }, 0);
  }, true);
});

await page.evaluate(() => { const c = document.querySelector('#ridetab .achip[data-tab="text"]'); if (c) { c.scrollIntoView({ block: 'start' }); window.scrollBy(0, -200); } });
await sleep(300);
await page.click('#editdoor [data-act="edit-door"]');
await sleep(500);
// a caret at the end of the last body clause, and a few words typed into it
const clause = page.locator('#charter .anch, #charter [data-key]').filter({ hasText: 'Accounts are shown' }).first();
await clause.click();
// the caret at the very end of the clause's text — `End` stops at the end of the visual line, which a wrapped clause is not
await clause.evaluate((el) => { const r = document.createRange(); r.selectNodeContents(el); r.collapse(false);
  const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); });
let torn = null;
if (GAP) {
  // **the clause is put low in the window** before the Enter — the one thing a busy room
  // was doing for us, and the whole of the tear: a clause outside `bringIntoView`'s
  // comfortable band makes the open travel, and the caret arrives on the far side of it
  say('clause at ' + JSON.stringify(await clause.evaluate((el) => {
    el.scrollIntoView({ block: 'center' }); scrollBy(0, -320);
    return { top: Math.round(el.getBoundingClientRect().top), key: el.dataset.key, cls: el.className };
  })) + ' — the band bringIntoView leaves alone is 100–300');
  await sleep(200);
  await clause.evaluate((el) => { const r = document.createRange(); r.selectNodeContents(el); r.collapse(false);
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); });
  await page.keyboard.press('Enter');
  // no pause: a person types the next letter straight away, and that is the window
  // one key at a time, reading the draft's model after each: the first key at which the gap's own text stops
  // growing is where the sentence is torn (Q1461), and what rendered last says by whom
  const want = 'This is a pluralist, pan-political space.';
  for (let i = 0; i < want.length; i++) {
    await page.keyboard.type(want[i]);
    await sleep(40);
    const m = await page.evaluate(() => { const d = window.SESSION.SUGGS.find((x) => x.id === 'draft-yours');
      const last = window.__renders[window.__renders.length - 1] || null;
      const el = document.activeElement;
      return { sites: d ? d.sites.map((x) => x.keys[0] + ':' + x.text.length) : null, openId: window.SESSION.openId,
        active: el && ((el.dataset && (el.dataset.lane || el.dataset.key)) || el.id || el.className), renders: window.__renders.length,
        last: last && last.name + '(' + last.keys.join(',') + ') ' + (Date.now() - last.at) + 'ms ago' }; });
    const gap = (m.sites || []).find((x) => /^G/.test(x));
    if (torn === null && (!gap || +gap.split(':')[1] !== i + 1)) { torn = i; say('TORN at key ' + i + ' (“' + want[i] + '”): ' + JSON.stringify(m)); }
    else if (i === 0 || i === want.length - 1) say('key ' + i + ': ' + JSON.stringify(m));
  }
  // the model at the end: one site, the gap's own, holding the whole sentence and nothing else
  const model = await page.evaluate(() => { const d = window.SESSION.SUGGS.find((x) => x.id === 'draft-yours');
    return d ? d.sites.map((x) => ({ keys: x.keys, text: x.text })) : null; });
  const ok = model && model.length === 1 && /^G\d+$/.test(model[0].keys[0]) &&
    model[0].text === 'This is a pluralist, pan-political space.';
  say((ok ? 'the draft is ' : 'THE DRAFT IS NOT one gap site holding the sentence: ') + JSON.stringify(model));
  if (!ok) torn = torn ?? -1;
}
else await page.keyboard.type(' And on the noticeboard.', { delay: 40 });
await sleep(600);
if (GAP) {
  const cmds = [];
  page.on('response', async (r) => { if (r.url().endsWith('/cmd')) cmds.push({ status: r.status(), body: (await r.text().catch(() => '')).slice(0, 300), sent: (r.request().postData() || '').slice(0, 200) }); });
  const look = () => page.evaluate(() => {
    const bs = [...document.querySelectorAll('#charter [data-act="draft-propose"], #charter [data-act="row-commit"]')];
    const d = window.SESSION.SUGGS.find((x) => x.id === 'draft-yours');
    return { gesture: window.SESSION.gesture, wallet: (document.querySelector('#wallet') || {}).textContent,
      editMode: window.SESSION.editMode, docCls: (document.getElementById('doc') || {}).className,
      buttons: bs.map((b) => ({ act: b.dataset.act, pen: !!b.dataset.pen, disabled: b.disabled, title: b.title, vis: b.getBoundingClientRect().width > 0 })),
      draft: d && { sites: d.sites.map((x) => ({ keys: x.keys, text: x.text, origin: x.origin.map((o) => o.text), gap: x.gap })), unproposed: d.unproposed } };
  });
  say('typed: ' + JSON.stringify(await look()));
  say('waiting 8s for a poll or two to rebuild the column under the draft');
  await sleep(8_000);
  const after = await look();
  say('after: ' + JSON.stringify(after));
  const btn = page.locator('#charter [data-act="draft-propose"]:not([data-pen]), #charter [data-act="row-commit"]:not([data-pen])').first();
  await btn.hover();
  const box = await btn.boundingBox();
  if (!box) { say('no propose control on the page'); await browser.close(); process.exit(1); }
  say('pressing ' + JSON.stringify(box));
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await sleep(1600); await page.mouse.up();
  await sleep(3000);
  say('pressed: ' + JSON.stringify(cmds));
  say('then: ' + JSON.stringify(await look()));
  await browser.close();
  // **a new clause is a pure insertion at its own line, and the clause above is untouched**
  const sent = cmds.filter((c) => /propose-text/.test(c.sent) && c.status === 200)
    .map((c) => { try { return JSON.parse(c.sent).args; } catch { return null; } }).filter(Boolean);
  const pure = sent.some((a) => (a.hunks ?? []).length === 1 && a.hunks[0].start === a.hunks[0].end &&
    a.hunks[0].start === CLAUSE + 1 && (a.hunks[0].lines ?? []).join('\n') === 'This is a pluralist, pan-political space.');
  if (!sent.length) say('no propose-text was accepted');
  else if (!pure) say('THE PROPOSAL IS NOT a pure insertion at line ' + (CLAUSE + 1) + ': ' + JSON.stringify(sent));
  else say(`proposed as a pure insertion at line ${CLAUSE + 1}, the clause above untouched`);
  if (torn !== null) say(`torn at key ${torn}`);
  process.exit(torn === null && pure ? 0 : 1);
}
const WHY = LANE ? '#charter [data-lane]' : '#charter .edit-why[data-why]';
const HOLDS = LANE ? '[data-lane]' : '.edit-why';
if (!(await page.locator(WHY).count())) { say('no rationale box appeared — ' + await page.evaluate(() => document.getElementById('doc').className)); await browser.close(); process.exit(2); }
await page.locator(WHY).first().click();
if (LANE) await page.keyboard.press('Control+End');
say(`typing ${LANE ? 'in the lane' : 'a rationale'} for ${SECS}s, one key every 250ms`);
const words = 'because the accounts should be somewhere a member walks past rather than somewhere they must ask for ';
let typed = 0, lostAt = [];
const until = Date.now() + SECS * 1000;
while (Date.now() < until) {
  const held = await page.evaluate((q) => !!(document.activeElement && document.activeElement.closest && document.activeElement.closest(q)), HOLDS);
  if (!held) {
    lostAt.push(typed);
    await page.locator(WHY).first().click().catch(() => {});
    await page.keyboard.press('End');
  }
  await page.keyboard.type(words[typed % words.length]);
  typed += 1;
  await sleep(250);
}
const out = await page.evaluate((q) => ({ steal: window.__steal, renders: window.__renders.length,
  full: window.__renders.filter((r) => r.name === 'setData').length,
  why: (document.querySelector(q) || {}).textContent || null }), WHY);
say(`${typed} keys · focus lost ${lostAt.length} times (at keys ${lostAt.join(', ') || '—'}) · ${out.renders} charter renders, ${out.full} of them full`);
for (const s of out.steal) say('  lost: ' + JSON.stringify(s));
// every key that was pressed is in the box, in order — a swallowed space or a caret put back in the wrong place shows here
const want = Array.from({ length: typed }, (_, i) => words[i % words.length]).join('');
const intact = out.why !== null && (LANE ? out.why.includes(want.trim()) : out.why.trim() === want.trim());
say(`the box holds ${out.why === null ? 'nothing (gone)' : out.why.length + ' chars'} — ${intact ? 'every key, in order' : 'NOT what was typed: “' + String(out.why).slice(0, 120) + '…”'}`);
if (!intact) lostAt.push(-1);
await browser.close();
process.exit(lostAt.length ? 1 : 0);
