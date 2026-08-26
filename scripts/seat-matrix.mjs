/**
 * **The seat matrix** (backlog entry 127, plan-queue 38): N seats × the
 * epochs, the rail asserted per seat against SURFACE §2's audience column.
 *
 * Against a **running server** it founds a document, seats several Playwright
 * contexts as distinct roles — founder, two members who arrive before the
 * post-start rule, one who arrives after it, one who lapses for real, a
 * stranger and an applicant — drives the document through three epochs
 * (`EPOCHS`: before 🍾, live, closed) and after every step snapshots two
 * things per seat: the **rail**, read the way `journey-walk.mjs` reads it, and
 * the server's **`view()`** for that seat, fetched from inside the seat's own
 * page so its cookie rides. The assertion is one column of one table: for
 * each SURFACE §2 event a step triggers, the seats inside the *Audience* cell
 * must carry the entry and the seats outside it must not.
 *
 *   npm run server                      # in another shell, with a dev outbox
 *   npm run seat-matrix -- http://127.0.0.1:8199 [--hat=member|clerk|both]
 *        [--to=before|live|closed] [--out=<file>] [--baseline=<file>]
 *
 * Three tables and one dispatcher: `SEATS` (who), `STEPS` (what happens, in
 * run order, each row naming the §2 events it triggers and the rail key the
 * audience should carry), `AUDIENCE` (SURFACE's audience cells, **character
 * for character**, to a predicate over a seat and a step — a reworded cell is
 * *no rule* until somebody reads it, which is the guard and not a nuisance),
 * and `RUN`, one case per step kind. Adding a step is adding a row.
 *
 * What it does NOT assert: any flight, wash or transition (the automation tab
 * is backgrounded — rAF never fires); copy; the Channel, Ask, Close and
 * Persistence columns. Holds are driven by a real pointer for their full
 * length. One window size, scroll 0.
 *
 * Exit codes: 0 green · 1 any finding, page error, refused command or a seat
 * that could not be stood · 3 **no-rule rows only** (a cell the harness cannot
 * read: red on purpose, so somebody files the Q; distinguishable from a
 * failure so a gate can tell the two apart) · 2 is `assert-server`'s.
 * The last line is machine-readable: `seat-matrix: findings=… noRule=… …`.
 *
 * Two things learned building it (2026-08-27), both load-bearing:
 *  · **Presence is stamped hourly** (`SEEN_EVERY_MS` in session.ts), so a
 *    page that merely polls does not keep a seat alive under a one-minute 💤 —
 *    every quiet seat lapses, page open or not. The non-lapsing seats here
 *    therefore *act* before every snapshot (`keepAlive`: a `set-identity`
 *    re-stating the seat's own name), which is what the module counts.
 *  · **E9's news entry is unbuilt on both sides**: `relinquish` owes no OK and
 *    the page files no news for a laid-down power, so the `lay down` row has
 *    no key and is reported as *no rule* on the page's side.
 */
import { writeFile, readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { assertServerBuild } from './lib/assert-server.mjs';
import { tableAfter } from './lib/surface-tables.mjs';

/* ---- arguments -------------------------------------------------------- */
const BASE = process.argv.find((a) => /^https?:/.test(a)) || 'http://127.0.0.1:8199';
const arg = (name, dflt) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit === undefined ? dflt : hit.slice(name.length + 3);
};
const EPOCHS = ['before', 'live', 'closed'];
const HAT = arg('hat', 'both');
const TO = arg('to', null);
const OUT = arg('out', 'design/tools/seat-matrix.json');
const BASELINE = arg('baseline', null);
if (!['member', 'clerk', 'both'].includes(HAT)) {
  console.log('FAIL: --hat must be member, clerk or both'); process.exit(1);
}
if (TO !== null && !EPOCHS.includes(TO)) {
  console.log('FAIL: --to must be one of ' + EPOCHS.join(', ')); process.exit(1);
}
const say = (...a) => console.log(...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SETTLE_MS = 5000;        // one 4s poll and air — journey's figure
const LAPSE_WAIT_MS = 240_000; // the bound on waiting for the clock to lapse a seat

/* ---- the spec's tables ------------------------------------------------- */
const EVENTS = tableAfter('SURFACE.md', 'events');
const EVENT = Object.fromEntries(EVENTS.map((r) => [r['#'], r]));
// 🍾's hold, read off the page's own ladder rather than guessed (§7.2)
const HOLDS = tableAfter('SURFACE.md', 'holds');
const beginRow = HOLDS.find((r) => (r.control || '').startsWith('🍾'));
const BEGIN_HOLD_MS = beginRow ? Number(beginRow['hold ms']) + 250 : 1250;

/* ---- table 1: the seats ----------------------------------------------- *
 * Data only. `document` says which founder's run a seat belongs to; where in
 * the epochs a seat arrives is the step table's business (`kind: 'seat'`).  */
const SEATS = [
  { name: 'founder', role: 'founder', hat: 'member', document: 'member', person: 'Ada Lovelace' },
  { name: 'clerk', role: 'founder', hat: 'clerk', document: 'clerk', person: 'Ada Lovelace' },
  { name: 'early', role: 'member', stands: 'before-rule', document: 'both', person: 'Bo Marlowe' },
  { name: 'late', role: 'member', stands: 'after-rule', document: 'both', person: 'Dee Latimer' },
  { name: 'lapsed', role: 'member', stands: 'before-rule', lapses: true, document: 'both', person: 'Cy Quiet' },
  { name: 'stranger', role: 'stranger', document: 'both' },
  { name: 'applicant', role: 'applicant', document: 'both', person: 'Rowan Vale' },
];

/* ---- table 3: the audience cells --------------------------------------- *
 * A key is a SURFACE §2 Audience cell **verbatim**; the value a predicate over
 * (seat, step, ctx). `ctx.stoodAt[name]` is the index of the step that stood
 * the seat; `ev.at` the index of the step at which the event happened
 * (defaults to the step it is listed on).                                  */
const isMember = (s) => s.role === 'member' || (s.role === 'founder' && s.hat === 'member');
const AUDIENCE = {
  'the holder': (s) => s.role === 'founder',
  'every member': (s) => isMember(s),
  'every member who had no say **and arrived when it was set**, lapsed included; a later joiner reads it as the document':
    (s, step, ctx, ev) => isMember(s) && s.name !== ctx.actorOf(ev) &&
      ctx.stoodAt[s.name] !== undefined && ctx.stoodAt[s.name] < ev.at,
  'the membership': (s) => isMember(s),
  // no invitee seat stands in this table: every invited seat follows its link
  'every member and invitee': (s) => isMember(s),
};

/* ---- table 2: the steps ------------------------------------------------ *
 * `events`: what the step triggers — the §2 row and the rail key the audience
 * should carry. Keys are on the step and not read off SURFACE's Keys column,
 * which is `spec-check`'s page-keys map and `—` for the rows that matter most
 * here. A key ending in `:` matches by prefix. `key: null` says the page
 * exposes no key for the event, and the row is reported as *no rule* on the
 * page's side with `noKey` as the reason.
 * An acknowledged entry counts as carried (the seat's own `okd` readout), and
 * for the close so does a signature (`view.closed.mySignature`): the ladder's
 * `toClosed` signs for `cast[1..4]` before any snapshot is taken.
 * `oracle`: where `view()` states the audience itself, the line says whether
 * the module agreed with the rail.                                        */
const ORACLE = {
  gates: (p, key) => { const v = p && p.view; return v && v.gates ? (key === 'canpropose' ? v.gates.proposing : v.gates.judging) : null; },
  owed: (p, key) => { const v = p && p.view; return v && Array.isArray(v.owedOks) ? v.owedOks.includes(key) : null; },
  closed: (p) => { const v = p && p.view; return v && 'closed' in v ? v.closed !== null : null; },
};
const E8 = (key) => ({ id: 'E8', key, at: 'seat-early' });
const E4 = (key) => ({ id: 'E4', key, at: 'begin', oracle: 'gates' });
const E5 = (key, at) => ({ id: 'E5', key, at, oracle: 'owed' });
const STEPS = [
  // ---- before 🍾 --------------------------------------------------------
  { id: 'birth', epoch: 'before', kind: 'birth', seat: 'founder', events: [] },
  { id: 'settings', epoch: 'before', kind: 'settings', seat: 'founder', events: [] },
  { id: 'hat', epoch: 'before', kind: 'cmd', seat: 'founder', cmd: 'set-convenor-membership',
    args: (D) => ({ isMember: D.hat === 'member' }), events: [] },
  { id: 'text', epoch: 'before', kind: 'cmd', seat: 'founder', cmd: 'confirm-starting-text',
    args: () => ({ text: 'The clubhouse shall be kept open.\nEvery member may bring one guest.' }), events: [] },
  { id: 'invite-early', epoch: 'before', kind: 'invite', seat: 'founder', who: ['early', 'lapsed'], events: [] },
  // the snapshot where a re-introduced Q639 shows: the pen as a ⏳ tab on a
  // member's band. 🛡️ is staged behind the pen's OK on the founder's page
  // (`blocksOrder`), so its rows begin at `ok-pen`.
  { id: 'seat-early', epoch: 'before', kind: 'seat', seat: 'early', events: [E8('grant-pen')] },
  { id: 'seat-lapsed', epoch: 'before', kind: 'seat', seat: 'lapsed', events: [E8('grant-pen')] },
  { id: 'seat-stranger', epoch: 'before', kind: 'seat', seat: 'stranger', events: [E8('grant-pen')] },
  { id: 'ok-pen', epoch: 'before', kind: 'ok', seat: 'founder', key: 'grant-pen', events: [E8('grant-pen'), E8('grant-shield')] },
  { id: 'ok-shield', epoch: 'before', kind: 'ok', seat: 'founder', key: 'grant-shield', events: [E8('grant-pen'), E8('grant-shield')] },
  // ---- live ---------------------------------------------------------------
  { id: 'begin', epoch: 'live', kind: 'hold', seat: 'founder', key: 'begin', events: [E4('canpropose'), E4('canjudge')] },
  { id: 'ok-propose', epoch: 'live', kind: 'ok', seat: 'founder', key: 'canpropose', ifHat: 'member',
    events: [E4('canpropose'), E4('canjudge')] },
  { id: 'ok-judge', epoch: 'live', kind: 'ok', seat: 'founder', key: 'canjudge', ifHat: 'member',
    events: [E4('canpropose'), E4('canjudge')] },
  { id: 'amend', epoch: 'live', kind: 'cmd', seat: 'founder', cmd: 'set-setting',
    args: () => ({ setting: 'chamber', value: { rung: 'public' }, why: 'so the cohort can read along' }),
    events: [E5('chamber', 'amend')] },
  { id: 'invite-late', epoch: 'live', kind: 'invite', seat: 'founder', who: ['late'], events: [E5('chamber', 'amend')] },
  // E20 does not apply post-start; what is asserted on the arrival is *no
  // `chamber` for late*, which the E5 predicate says by `stoodAt`
  { id: 'seat-late', epoch: 'live', kind: 'seat', seat: 'late', events: [E5('chamber', 'amend')] },
  { id: 'wait-lapsed', epoch: 'live', kind: 'wait', seat: 'lapsed', events: [E5('chamber', 'amend')] },
  { id: 'knock', epoch: 'live', kind: 'knock', seat: 'applicant',
    events: [{ id: 'E21', key: 'adm:', at: 'knock' }] },
  // ✒️ laid down on ⏱️ `rate`, not ⏰ (B14, 2026-08-27): the ladder drives
  // `ending` with the founder's pen and would stall on a relinquished one.
  // The page exposes no key for E9's news (Q571 unbuilt; `relinquish` owes
  // no OK), so the row is reported as *no rule* on the page's side.
  { id: 'lay-down', epoch: 'live', kind: 'cmd', seat: 'founder', cmd: 'relinquish',
    args: () => ({ setting: 'rate', power: 'unilateral' }),
    events: [{ id: 'E9', key: null, at: 'lay-down',
      noKey: 'the page files no news entry for a laid-down power and `relinquish` owes no OK (Q571 unbuilt)' }] },
  // ---- closed -------------------------------------------------------------
  // `toClosing` moves ⏰ with the founder's pen: a constitutional setting set
  // post-start, so E5 on `ending` for every member who was here
  { id: 'ladder-closing', epoch: 'closed', kind: 'ladder', seat: 'founder', to: 'closing',
    events: [E5('ending', 'ladder-closing')] },
  { id: 'ladder-closed', epoch: 'closed', kind: 'ladder', seat: 'founder', to: 'closed',
    events: [{ id: 'E24', key: 'closing', at: 'ladder-closed', oracle: 'closed', orSigned: true }] },
];
const stepIndex = (id) => STEPS.findIndex((s) => s.id === id);

/* ======================================================================== */

/** One document, one founder's hat, the step table over it. */
async function runDocument(hat) {
  const D = {
    hat, slug: null, docbase: null, title: 'Seat matrix ' + Date.now(),
    stamp: String(Date.now()).slice(-8), applicantId: null, closed: false,
    seats: {}, stoodAt: {}, findings: [], noRule: [], errors: [], refused: [], unstood: [], steps: [],
    actorOf: (ev) => (STEPS[ev.at] || {}).seat,
  };
  say(`\n══ document · founder is a ${hat} ══`);
  const mine = SEATS.filter((s) => s.document === 'both' || s.document === hat);
  for (const s of mine) {
    const name = s.role === 'founder' ? 'founder' : s.name; // one founder row per document
    D.seats[name] = { def: s, ctx: null, page: null, stood: false, quiet: false, okd: 0,
      email: name === 'founder' ? 'ada@example.org' : `${name}${D.stamp}@example.org` };
  }
  for (let i = 0; i < STEPS.length; i++) {
    const step = STEPS[i];
    const evs = step.events.map((e) => ({ ...e, at: stepIndex(e.at ?? step.id) }));
    const label = `${step.epoch.padEnd(6)} · ${step.id}` +
      (evs.length ? ' · ' + evs.map((e) => e.id + ' ' + (e.key ?? '(no key)')).join(', ') : '');
    say(`⏭ ${label}`);
    let note = null;
    try { note = await RUN[step.kind](step, D); } catch (e) {
      D.unstood.push(`${hat} · ${step.id}: ${String(e && e.message || e)}`);
      say('   ✗ ' + String(e && e.message || e));
    }
    if (note) say('   · ' + note);
    if (step.kind === 'ladder' && step.to === 'closed') D.closed = true;
    const snap = await snapshot(D, step);
    D.steps.push({ id: step.id, epoch: step.epoch, events: evs.map((e) => ({ id: e.id, key: e.key })), seats: snap });
    assertStep(D, step, evs, snap);
    if (TO !== null && step.epoch === TO && (STEPS[i + 1] === undefined || STEPS[i + 1].epoch !== TO)) {
      say(`   stopped after the ${TO} epoch: ${D.docbase}/d/${D.slug}`);
      break;
    }
  }
  for (const s of Object.values(D.seats)) if (s.ctx) await s.ctx.close().catch(() => {});
  return { hat, findings: D.findings, noRule: D.noRule, errors: D.errors, refused: D.refused,
    unstood: D.unstood, steps: D.steps };
}

/* ---- seats: contexts, nets, pages --------------------------------------- */
async function standUp(D, name) {
  const s = D.seats[name];
  if (!s.ctx) {
    // the locale pinned for the reason Q628 gives: the snapshots are diffed later
    s.ctx = await browser.newContext({ viewport: { width: 1600, height: 1100 },
      locale: 'en-GB', timezoneId: 'Europe/London' });
  }
  s.page = await s.ctx.newPage();
  attachNets(D, name, s.page);
  return s;
}
function attachNets(D, name, page) {
  page.on('pageerror', (e) => D.errors.push(`[${D.hat}/${name}] ` + String(e)));
  // a refused command is a failure even where the surface recovers (journey's rule)
  page.on('response', (r) => { if (r.url().includes('/api/') && r.status() >= 400) {
    const at = D.refused.push(`[${D.hat}/${name}] ` + r.status() + ' ' + r.request().method() + ' ' +
      new URL(r.url()).pathname + ' ' + String(r.request().postData() || '').slice(0, 120)) - 1;
    r.text().then((b) => { D.refused[at] += ' → ' + b.slice(0, 160); }).catch(() => {});
  } });
  page.on('response', (r) => { if (r.request().method() === 'POST' &&
    /give-ok/.test(r.request().postData() || '')) D.seats[name].okd += 1; });
}
/** A command over the wire as a named seat, from inside its page so the cookie rides. */
const cmdAs = (D, name, op, args) => D.seats[name].page.evaluate(async ([slug, op2, args2]) => {
  const r = await fetch(`/api/d/${slug}/cmd`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ cmd: op2, args: args2 }),
  });
  return { status: r.status, body: await r.json().catch(() => null) };
}, [D.slug, op, args]);
const outbox = async () => { const ob = await (await fetch(BASE + '/api/dev/outbox')).json(); return ob.mails || ob; };
const linkIn = (mail) => (JSON.stringify(mail).match(/http:[A-Za-z0-9_?=/:.-]+/) || [])[0];
const landOn = async (page, url) => {
  await page.goto(url);
  for (let i = 0; i < 40 && !page.url().includes('/d/'); i++) await page.waitForTimeout(500);
  await page.waitForTimeout(2600);
};
/** Open a card from the rail or the band on a page. */
const openCard = async (page, k) => {
  const ok = await page.evaluate((kk) => {
    const el = document.querySelector('#rail [data-card="' + kk + '"], #band [data-tab="' + kk + '"]');
    if (!el) return false;
    el.scrollIntoView({ block: 'center' });
    el.click();
    return true;
  }, k);
  await page.waitForTimeout(450);
  return ok;
};
/** A commit is a press: the control under a real pointer, held for `ms` (journey's). */
const press = async (page, ms) => {
  const box = await page.evaluate(() => {
    const b = [...document.querySelectorAll('.setupcard .commitrow button')]
      .find((x) => !x.disabled && !/🗑/.test(x.textContent));
    if (!b) return null;
    b.scrollIntoView({ block: 'center' });
    const r = b.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2,
      label: b.textContent.trim() || b.getAttribute('title') || 'commit' };
  });
  if (!box) return null;
  await page.waitForTimeout(160);
  await page.mouse.move(box.x, box.y);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
  await page.waitForTimeout(460);
  return box.label;
};
const typeIn = (page, sel, v) => page.evaluate((a) => {
  const el = document.querySelector(a[0]);
  if (!el) return false;
  if (el.isContentEditable) { el.textContent = a[1]; el.dispatchEvent(new InputEvent('input', { bubbles: true })); }
  else { el.value = a[1]; el.dispatchEvent(new Event('input', { bubbles: true })); }
  return true;
}, [sel, v]);

/* ---- the dispatcher: one case per step kind ----------------------------- */
const SETTINGS = [
  ['ending', { endsAtMs: null }],
  ['pace', { shape: 'fixed' }],
  ['bar', { pct: 60 }],
  ['quorum', { form: 'count', n: 1 }],
  ['authorship', { rung: 'sealed' }],
  ['judgments', { rung: 'after' }],
  ['chamber', { rung: 'closed' }],          // the setting the amendment moves
  ['lapse', { afterMs: 60_000 }],           // one minute: the lapsed seat lapses for real
  ['removal', { price: 'proposal' }],
  ['rate', { grant: 4, cap: 8, dripMinutes: 240 }],
  ['machines', { enabled: false, budget: 0 }],
  ['applications', { apply: true }],
  ['membership', { price: 'proposal' }],
];
const RUN = {
  /** The birth through the surface: the three cards and the magic link. */
  birth: async (step, D) => {
    const s = await standUp(D, 'founder');
    const page = s.page;
    await page.goto(BASE + '/');
    await page.waitForTimeout(800);
    await openCard(page, 'title');
    await typeIn(page, '.setupcard [data-titlelane]', D.title);
    await press(page, 1250);
    await openCard(page, 'slug');
    await press(page, 1250);
    await openCard(page, 'myemail');
    await typeIn(page, '.setupcard input[type="email"]', s.email);
    await press(page, 1250);
    await page.waitForTimeout(1600);
    const mails = (await outbox()).filter((m) => JSON.stringify(m).includes(D.title));
    if (!mails.length) throw new Error('no creation mail for ' + D.title + ' — is this server using a dev outbox?');
    await landOn(page, linkIn(mails[mails.length - 1]));
    D.slug = (page.url().match(/\/d\/([^/?#]+)/) || [])[1];
    if (!D.slug) throw new Error('the magic link did not land on a document: ' + page.url());
    // a cookie belongs to an origin, and the magic link picks the origin
    D.docbase = new URL(page.url()).origin;
    s.stood = true; D.stoodAt.founder = stepIndex(step.id);
    return 'saved at ' + D.docbase + '/d/' + D.slug;
  },
  /** The rest of the constitution over the wire with the founder's pen. */
  settings: async (step, D) => {
    const bad = [];
    for (const [id, value] of SETTINGS) {
      const r = await cmdAs(D, 'founder', 'set-setting', { setting: id, value });
      if (r.status !== 200) bad.push(id + ' → ' + r.status + ' ' + JSON.stringify(r.body));
    }
    if (bad.length) throw new Error('set-setting refused: ' + bad.join(' · '));
    return SETTINGS.length + ' settings set · 🪪 proposal · 🤝 open · 💤 one minute · 🌍 closed';
  },
  cmd: async (step, D) => {
    const r = await cmdAs(D, step.seat, step.cmd, step.args(D));
    if (r.status !== 200) throw new Error(`${step.cmd} as ${step.seat} → ${r.status} ${JSON.stringify(r.body)}`);
    return `${step.cmd} as ${step.seat}`;
  },
  invite: async (step, D) => {
    for (const who of step.who) {
      const r = await cmdAs(D, 'founder', 'invite', { email: D.seats[who].email });
      if (r.status !== 200) throw new Error(`invite ${who} → ${r.status} ${JSON.stringify(r.body)}`);
    }
    return 'invited ' + step.who.join(', ');
  },
  /** Stand a seat up: a member follows their invitation; a stranger just arrives. */
  seat: async (step, D) => {
    const s = await standUp(D, step.seat);
    if (s.def.role === 'stranger') {
      await s.page.goto(D.docbase + '/d/' + D.slug);
      await s.page.waitForTimeout(2600);
    } else {
      const mail = (await outbox()).find((m) => JSON.stringify(m).includes(s.email));
      const link = mail ? linkIn(mail) : null;
      if (!link) throw new Error(`seat ${step.seat} could not be stood: no invitation link in the outbox for ${s.email}`);
      await landOn(s.page, link);
      if (!s.page.url().includes('/d/')) throw new Error(`seat ${step.seat} could not be stood: landed at ${s.page.url()}`);
    }
    s.stood = true; D.stoodAt[step.seat] = stepIndex(step.id);
    return `${step.seat} at ${s.page.url()}`;
  },
  /** Open a card by key on the founder's page and click its OK. */
  ok: async (step, D) => {
    if (step.ifHat && step.ifHat !== D.hat) return `skipped: the founder is a ${D.hat}, ${step.key} is not theirs`;
    const page = D.seats[step.seat].page;
    if (!(await openCard(page, step.key))) throw new Error(`no ${step.key} card to OK on the ${step.seat}'s page`);
    const pressed = await page.evaluate(() => {
      const b = document.querySelector('.setupcard [data-ok]');
      if (!b || b.disabled) return false;
      b.scrollIntoView({ block: 'center' });
      b.click();
      return true;
    });
    if (!pressed) throw new Error(`${step.key} opened but offers no live OK`);
    await page.waitForTimeout(900);
    return `OK on ${step.key}`;
  },
  /** A real-pointer hold on the open card's commit, for its full length. */
  hold: async (step, D) => {
    const page = D.seats[step.seat].page;
    if (!(await openCard(page, step.key))) {
      const f = await page.evaluate(() => (window.__founding ? window.__founding() : null));
      throw new Error(`no ${step.key} card to hold · readiness ${JSON.stringify(f && f.readiness)} · rail ${JSON.stringify(f && f.rail)}`);
    }
    const label = await press(page, BEGIN_HOLD_MS);
    if (label === null) {
      const f = await page.evaluate(() => (window.__founding ? window.__founding() : null));
      throw new Error(`${step.key} has no live commit · readiness ${JSON.stringify(f && f.readiness)}`);
    }
    if (step.key === 'begin') {
      await page.waitForTimeout(800);
      const begun = await page.evaluate(() => !!document.querySelector('.doc.begun'));
      if (!begun) throw new Error('🍾 was held for ' + BEGIN_HOLD_MS + 'ms and the document did not begin');
    }
    return `held ${label} for ${BEGIN_HOLD_MS}ms`;
  },
  /** The lapsed seat goes quiet: page shut, no act, until the clock lapses it. */
  wait: async (step, D) => {
    const s = D.seats[step.seat];
    if (!s.stood) throw new Error(`${step.seat} was never stood, so it cannot lapse`);
    await s.page.close(); s.page = null; s.quiet = true;
    const t0 = Date.now();
    let lapsed = false; let lastAlive = 0;
    while (Date.now() - t0 < LAPSE_WAIT_MS) {
      await sleep(10_000);
      if (Date.now() - lastAlive > 30_000) { await keepAlive(D); lastAlive = Date.now(); }
      const v = await viewAs(D, 'founder');
      const row = (((v && v.view) || {}).members || []).find((m) => m.email === s.email);
      if (row && row.lapsed) { lapsed = true; break; }
    }
    // reopened for its snapshots: a read does not revive (session.ts `seen`)
    s.page = await s.ctx.newPage(); attachNets(D, step.seat, s.page);
    await s.page.goto(D.docbase + '/d/' + D.slug);
    await s.page.waitForTimeout(2600);
    if (!lapsed) { s.stood = false; throw new Error(`seat ${step.seat} could not be stood: the clock did not lapse it within ${LAPSE_WAIT_MS / 1000}s`); }
    return `${step.seat} lapsed after ${Math.round((Date.now() - t0) / 1000)}s quiet; page reopened, sends nothing from here on`;
  },
  /** A stranger knocks, verifies, and submits an application (applicants-walk's shape). */
  knock: async (step, D) => {
    const s = await standUp(D, 'applicant');
    const r = await fetch(D.docbase + '/api/d/' + D.slug + '/apply', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: s.email }) });
    const body = await r.json().catch(() => null);
    if (r.status !== 200 || !body || !body.devLink) throw new Error(`the door refused the knock → ${r.status} ${JSON.stringify(body)}`);
    await s.page.goto(body.devLink);
    await s.page.waitForTimeout(1800);
    s.stood = true; D.stoodAt.applicant = stepIndex(step.id);
    const sub = await cmdAs(D, 'applicant', 'submit-application', { name: s.def.person, words: 'I bake.' });
    if (sub.status !== 200) throw new Error(`submit-application → ${sub.status} ${JSON.stringify(sub.body)}`);
    // the minted id, so the mask can fold it
    const v = await viewAs(D, 'founder');
    const row = (((v && v.view) || {}).applicants || []).find((a) => a.email === s.email);
    D.applicantId = row ? row.id : null;
    return `${s.def.person} verified and submitted` + (D.applicantId ? ` · id ${D.applicantId}` : '');
  },
  /** Press ⏭ on the founder's ladder bar and wait for the page it lands on. */
  ladder: async (step, D) => {
    const page = D.seats.founder.page;
    const btn = await page.$('#ladnext');
    if (btn === null) throw new Error('the ladder bar has no ⏭ — is the server in dev mail mode?');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60_000 }),
      btn.click(),
    ]);
    await page.waitForTimeout(1500);
    const d = await page.evaluate((slug) => fetch('/api/dev/ladder?slug=' + encodeURIComponent(slug)).then((r) => r.json()), D.slug);
    if (d.phase !== step.to) throw new Error(`⏭ ${step.to}: the ladder reports '${d.phase}' — the rung did not advance (its skipped list is in the server log)`);
    return `the ladder reports ${d.phase}`;
  },
};

/* ---- keeping the non-lapsing seats alive ---------------------------------- *
 * Presence is stamped hourly (`SEEN_EVERY_MS`), so under a one-minute 💤 a
 * polling page keeps nobody alive; only an act does. Every stood member seat
 * that is not the lapsing one re-states its own name before each snapshot —
 * an act that changes nothing the view shows. Not after the close.          */
async function keepAlive(D) {
  if (!D.slug || D.closed) return;
  for (const [name, s] of Object.entries(D.seats)) {
    if (!s.stood || s.quiet || !s.page) continue;
    if (!(s.def.role === 'member' || s.def.role === 'founder')) continue;
    const r = await cmdAs(D, name, 'set-identity', { name: s.def.person }).catch(() => null);
    if (r && r.status !== 200) D.refused.push(`[${D.hat}/${name}] keep-alive set-identity → ${r.status} ${JSON.stringify(r.body)}`);
  }
}

/* ---- the two snapshots per seat ------------------------------------------- */
const viewAs = (D, name) => D.seats[name].page.evaluate((slug) =>
  fetch('/api/d/' + slug + '/view').then((r) => r.json()).catch((e) => ({ error: String(e && e.message) })), D.slug);
const railOf = (page) => page.evaluate(() => ({
  rail: [...document.querySelectorAll('#rail li')].map((li) => {
    const b = li.querySelector('button');
    const st = b ? [...b.classList].find((c) => c.startsWith('st-')) : null;
    return { key: li.dataset.q ?? (li.querySelector('[data-card]') || { dataset: {} }).dataset.card ?? '?',
      kind: st ? st.slice(3) : null,
      mark: (li.querySelector('.subj') || {}).textContent ? li.querySelector('.subj').textContent.trim() : null,
      site: li.dataset.site ?? null };
  }),
  // the band's tabs: the tab, the rail entry and the card are one thing (F17),
  // and a task can stand as a tab the rail never lists — Q639's ⏳ pair did
  band: [...document.querySelectorAll('#band .achip[data-tab], #titlepara .achip[data-tab]')].map((el) => ({
    key: el.dataset.tab, kind: ([...el.classList].find((c) => c.startsWith('st-')) || 'st-?').slice(3) })),
  readout: (() => { const f = window.__founding ? window.__founding() : null;
    return f ? { served: f.served, okd: f.okd, owed: f.owed, amFounder: f.amFounder,
      viewerIsMember: f.viewerIsMember, constituted: f.constituted, readiness: f.readiness } : null; })(),
}));
async function snapshot(D, step) {
  if (!D.slug) return {};
  await keepAlive(D);
  await sleep(SETTLE_MS);
  const out = {};
  for (const [name, s] of Object.entries(D.seats)) {
    if (!s.stood) continue;
    if (!s.page) { out[name] = { unstood: 'page shut, waiting to lapse' }; continue; }
    try {
      const r = await railOf(s.page);
      const v = await viewAs(D, name);
      out[name] = { rail: r.rail, band: r.band, readout: r.readout, view: mask(D, v) };
    } catch (e) {
      out[name] = { unstood: 'snapshot failed: ' + String(e && e.message) };
    }
  }
  return out;
}
/** Volatile fields folded before a snapshot is stored or compared. */
function mask(D, v) {
  let s = JSON.stringify(v);
  if (s === undefined) return null;
  s = s.split(D.title).join('<title>').split(D.slug).join('<slug>').split(D.stamp).join('<stamp>');
  if (D.applicantId) s = s.split(D.applicantId).join('<applicant>');
  const walk = (x) => {
    if (Array.isArray(x)) return x.map(walk);
    if (x && typeof x === 'object') {
      return Object.fromEntries(Object.entries(x).map(([k, val]) => [k,
        (typeof val === 'number' && (/(T|At|Ms)$/.test(k) || /^(t|at|seq|eseq|nowMs|settledAtT)$/.test(k)))
          ? '<n>' : walk(val)]));
    }
    return x;
  };
  return walk(JSON.parse(s));
}

/* ---- the assertion ----------------------------------------------------------- */
function assertStep(D, step, evs, snap) {
  for (const ev of evs) {
    const row = EVENT[ev.id];
    const cell = row ? row.Audience : null;
    if (!row) { D.noRule.push({ hat: D.hat, step: step.id, event: ev.id, cell: '(no such row)', why: 'SURFACE §2 has no ' + ev.id }); continue; }
    if (ev.key === null) {
      D.noRule.push({ hat: D.hat, step: step.id, event: ev.id, cell, why: 'page side — ' + ev.noKey });
      say(`   ? ${ev.id} "${cell}" — no key on the page: ${ev.noKey}`);
      continue;
    }
    const pred = AUDIENCE[cell];
    if (!pred) {
      D.noRule.push({ hat: D.hat, step: step.id, event: ev.id, cell, why: 'no AUDIENCE entry for this cell' });
      say(`   ? ${ev.id} "${cell}" — no rule`);
      continue;
    }
    for (const [name, s] of Object.entries(D.seats)) {
      if (!s.stood || !snap[name] || snap[name].unstood) continue;
      const seat = { ...s.def, name };
      const inAud = !!pred(seat, step, D, ev);
      const rail = snap[name].rail.map((e) => e.key);
      const match = (k) => k === ev.key || (ev.key.endsWith(':') && k.startsWith(ev.key));
      // a settled tab (`done`) asks nothing; every other state is a task standing
      const tabs = (snap[name].band || []).filter((e) => e.kind !== 'done').map((e) => e.key);
      const has = rail.some(match) || tabs.some(match);
      const okd = !!(snap[name].readout && (snap[name].readout.okd || []).includes(ev.key));
      const mv = (snap[name].view || {}).view || {};
      const signed = !!(ev.orSigned && mv.closed && mv.closed.mySignature);
      const carries = has || okd || signed;
      const how = rail.some(match) ? 'carries it'
        : has ? 'carries it as a tab (' + ((snap[name].band || []).find((e) => match(e.key)) || {}).kind + ')'
        : okd ? 'acknowledged it' : signed ? 'signed it' : 'does not carry it';
      if (carries === inAud) continue;
      let module = '';
      if (ev.oracle) {
        const o = ORACLE[ev.oracle](snap[name].view, ev.key);
        module = o === null ? '' : o === inAud
          ? ` — the module ${inAud ? 'owes it too' : 'does not owe it either'}: a page finding`
          : ` — the module ${o ? 'owes it' : 'does not owe it'}, against the rule: a fold finding`;
      }
      const line = `${ev.id} ${ev.key} · ${D.hat}/${name} ${how}, ${inAud ? 'inside' : 'outside'} the audience (${cell})${module} · rail ${JSON.stringify(rail)}`;
      D.findings.push({ hat: D.hat, step: step.id, event: ev.id, key: ev.key, seat: name, expected: inAud, carried: carries, rail, line });
      say('   ✗ ' + line);
    }
  }
}

/* ---- --baseline: rail differences per seat per step, and nothing more -------- */
async function diffAgainst(file, now) {
  let then;
  try { then = JSON.parse(await readFile(file, 'utf8')); } catch (e) { say('baseline   · unreadable: ' + String(e && e.message)); return; }
  let diffs = 0;
  for (const doc of now.documents) {
    const old = (then.documents || []).find((d) => d.hat === doc.hat);
    if (!old) { say(`baseline   · no ${doc.hat} document in ${file}`); continue; }
    for (const st of doc.steps) {
      const ost = old.steps.find((x) => x.id === st.id);
      if (!ost) { say(`baseline   · ${doc.hat}/${st.id}: not in the baseline`); diffs++; continue; }
      for (const [seat, snap] of Object.entries(st.seats)) {
        const a = ((ost.seats || {})[seat] || {}).rail || [];
        const b = snap.rail || [];
        const ak = new Map(a.map((e) => [e.key, e.kind])); const bk = new Map(b.map((e) => [e.key, e.kind]));
        const added = [...bk.keys()].filter((k) => !ak.has(k));
        const gone = [...ak.keys()].filter((k) => !bk.has(k));
        const kind = [...bk.keys()].filter((k) => ak.has(k) && ak.get(k) !== bk.get(k)).map((k) => `${k} ${ak.get(k)}→${bk.get(k)}`);
        if (added.length || gone.length || kind.length) {
          diffs++;
          say(`baseline   · ${doc.hat}/${st.id}/${seat}: ` + [added.length ? 'added ' + added.join(',') : '',
            gone.length ? 'gone ' + gone.join(',') : '', kind.length ? 'kind ' + kind.join(',') : ''].filter(Boolean).join(' · '));
        }
      }
    }
  }
  say('baseline   · ' + (diffs ? diffs + ' rail difference(s) against ' + file : 'no rail differences against ' + file));
}

/* ---- the run, last: everything above is a const, and a top-level await
   before it would meet the temporal dead zone ------------------------------ */
/* ---- the run ------------------------------------------------------------ */
const health = await assertServerBuild(BASE, 'seat-matrix');
say(`seat-matrix against ${BASE} · build ${health.build ?? 'unreported'} · hat=${HAT}` +
  (TO ? ` · to=${TO}` : ''));
say(`tables     · SURFACE §2 events ${EVENTS.length} rows · seats ${SEATS.length} · steps ${STEPS.length}` +
  ` · audience cells ${Object.keys(AUDIENCE).length} · 🍾 hold ${BEGIN_HOLD_MS}ms`);
if (EVENTS.length !== 33) say('  ✗ expected 33 event rows — SURFACE §2 has changed shape');

const browser = await chromium.launch();
const runs = [];
const HATS = HAT === 'both' ? ['member', 'clerk'] : [HAT];
for (const hat of HATS) runs.push(await runDocument(hat));
await browser.close();

/* ---- the report --------------------------------------------------------- */
const findings = runs.flatMap((r) => r.findings);
const noRule = runs.flatMap((r) => r.noRule);
const errors = runs.flatMap((r) => r.errors);
const refused = runs.flatMap((r) => r.refused);
const unstood = runs.flatMap((r) => r.unstood);
say('');
if (findings.length) {
  say(`findings   · ${findings.length}`);
  for (const f of findings) say('  ✗ ' + f.line);
} else say('findings   · none');
if (noRule.length) {
  say(`no rule    · ${noRule.length} — SURFACE states an audience the harness cannot read; file it`);
  for (const n of noRule) say(`  ? ${n.hat} · ${n.event} "${n.cell}" at step ${n.step}` + (n.why ? ` — ${n.why}` : ''));
}
if (unstood.length) { say('unstood    · ' + unstood.length); for (const u of unstood) say('  ✗ ' + u); }
say('errors     · ' + (errors.length ? errors.slice(0, 6).join(' / ') : 'none'));
say('refused    · ' + (refused.length ? refused.slice(0, 6).join(' / ') : 'none'));

const payload = {
  base: BASE, build: health.build ?? null, hat: HAT, to: TO,
  seats: SEATS, epochs: EPOCHS,
  documents: runs.map((r) => ({ hat: r.hat, slug: '<slug>', steps: r.steps })),
  findings, noRule, unstood, errors, refused,
};
await writeFile(OUT, JSON.stringify(payload, null, 1));
say('written    · ' + OUT);
if (BASELINE !== null) await diffAgainst(BASELINE, payload);

const red = findings.length || errors.length || refused.length || unstood.length;
const code = red ? 1 : noRule.length ? 3 : 0;
say(`\nseat-matrix: findings=${findings.length} noRule=${noRule.length} errors=${errors.length}` +
  ` refused=${refused.length} unstood=${unstood.length} exit=${code}`);
process.exit(code);
