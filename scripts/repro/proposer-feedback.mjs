#!/usr/bin/env node
/**
 * proposer-feedback — **what is a proposer told?** (Q1484, Q1485; Ed, the room
 * of 2026-09-20: *submitting a proposal doesn't close the card so the proposer
 * doesn't always understand that it's live*; *when the text changes under a
 * proposal, it is not very well communicated to the proposer that their
 * proposal is no longer live*.)
 *
 *   node scripts/repro/proposer-feedback.mjs http://127.0.0.1:8402 [--case=<name>] [--shots=<dir>]
 *
 * A RECORDER, not a guard: it asserts nothing and exits 0 unless the set-up
 * breaks (2).  It drives a dev server and prints, for the proposer's own page,
 * every visible change in order with its time:
 *
 *   Part 1 (Q1485) — the press.  A member types a change and presses ✏️; the
 *   page is sampled every 50ms from the press for six seconds: is edit mode
 *   still on, which card is open and of what kind, what the foot row holds,
 *   what the rail entry reads and how tall it is, the wallet's count, the
 *   window's scroll, the pencil in flight, and every sentence on the page
 *   that says anything about the proposal being in.
 *     press/one      one clause edited
 *     press/two      a draft at two places
 *     press/gap      a new clause, Enter at a clause's end
 *     press/seeded   ✏️ propose edit on a rival's lane
 *     press/pen      the Founder's ✒️
 *     press/seedkeep ✏️ propose edit on the current text's own lane
 *     press/motion   a proposal about a RULE (⏱️), from the rule's own card
 *     press/narrow   the same at 390×844 — where the doors are hidden
 *   The first wide case is then re-read at 390×844 (the same seat, a second page).
 *
 *   Part 2 (Q1484) — the text moves.  The proposer's page stands open (one
 *   page at 1600×1000, one at 390×844, the same seat) while other seats act
 *   over the wire, and what the two pages show is printed before and after.
 *     moved/rival     a rival wording on the same clause is carried
 *     moved/overlap   a patch over the same lines is carried from another race
 *     moved/rejected  everybody prefers the current text, so it can no longer pass
 *     moved/above     a clause is carried in above it
 *     moved/decree    the Founder's ✒️ rewrites the clause
 *     moved/draft     an UNPROPOSED draft while its clause is rewritten, then ✏️
 *
 * Screenshots of the key moments go to --shots (default: none).
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { post as postTo, followLink, sleep, landOn } from '../lib/walk.mjs';

const BASE = (process.argv.find((a) => /^https?:/.test(a)) || 'http://127.0.0.1:8402').replace(/\/$/, '');
const ONLY = (process.argv.find((a) => a.startsWith('--case=')) || '').slice(7);
const SHOTS = (process.argv.find((a) => a.startsWith('--shots=')) || '').slice(8);
// --lag=<ms>: every answer from the document's API is held that long on the proposer's page, to stand in for a busy live host
const LAG = +((process.argv.find((a) => a.startsWith('--lag=')) || '').slice(6)) || 0;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const post = (p, b, c) => postTo(BASE, p, b, c);
const say = (s) => console.log(`[${new Date().toTimeString().slice(0, 8)}] ${s}`);
const die = (m) => { console.error(`proposer-feedback: ${m}`); process.exit(2); };

const health = await (await fetch(`${BASE}/healthz`)).json().catch(() => ({}));
if (health.devMail !== true) die(`${BASE} is not a dev server`);

const TEXT = ['# Tea Charter', 'Yorkshire tea, eight teabags to the pot.', 'No sugar goes in the pot.',
  'Milk goes in last.', '# Biscuits', 'Two biscuits each.', 'Dunking is allowed.',
  '# Washing up', 'Whoever brews does not wash up.', 'Mugs go back on the hooks.'].join('\n');

const H = (v, h) => {
  const lines = v.text === '' || v.text == null ? [''] : String(v.text).split('\n');
  return h.map((x) => (x.start === x.end
    ? { ...x, after: x.start === 0 ? null : (lines[x.start - 1] ?? null) }
    : { ...x, was: lines.slice(x.start, x.end) }));
};

let N = 0;
async function found(members, laidDown = [{ setting: 'startingText', power: 'assent' }]) {
  const run = `pf${++N}-${Date.now().toString(36)}`;
  const created = await (await post('/api/docs', { title: `Proposer feedback ${run}`, email: `f-${run}@example.org`, isMember: true })).json();
  if (!created.ok) die(`creation refused: ${JSON.stringify(created)}`);
  const slug = created.slug;
  const founder = (await followLink(created.devLink)).cookie;
  const cmd = async (name, args = {}, cookie = founder) => {
    const r = await post(`/api/d/${slug}/cmd`, { cmd: name, args }, cookie);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`${name} refused (${r.status}): ${JSON.stringify(j)}`);
    return j.result ?? j;
  };
  await cmd('confirm-starting-text', { text: TEXT });
  await cmd('set-convenor-membership', { isMember: true });
  for (const [setting, value] of Object.entries({
    rate: { grant: 8, cap: 12, dripMinutes: 1 }, pace: { shape: 'fixed' }, quorum: { form: 'share', n: 50 },
    authorship: { rung: 'sealedElective' }, judgments: { rung: 'after' }, applications: { apply: false },
    admission: { price: 'pen' }, removal: { price: 'proposal' }, machines: { enabled: false, budget: 0 },
    lapse: { afterMs: 5 * 60_000 }, ending: { endsAtMs: Date.now() + 6 * 3_600_000 }, bar: { pct: 50 },
    chamber: { rung: 'link' },
  })) {
    await (await post(`/api/d/${slug}/cmd`, { cmd: 'reclaim', args: { setting } }, founder)).text();
    await cmd('set-setting', { setting, value });
  }
  for (const m of members) await cmd('invite', { email: `${m}-${run}@example.org` });
  await cmd('begin', { laidDown });
  const tail = await (await fetch(`${BASE}/api/dev/outbox`)).json();
  const cookies = { founder };
  for (const m of members) {
    const mail = (tail.mails ?? []).find((x) => x.to === `${m}-${run}@example.org`);
    if (!mail) die(`no invitation for ${m}`);
    cookies[m] = (await followLink(mail.link)).cookie;
  }
  const view = (who = 'founder') => fetch(`${BASE}/api/d/${slug}/view`, { headers: { cookie: cookies[who] } }).then((r) => r.json());
  const as = (who) => (name, args) => cmd(name, args, cookies[who]);
  return { slug, cmd, as, cookies, view, members, run };
}

/** propose over the wire as `who`; answers the candidate id */
async function propose(d, who, hunks, why) {
  const v = await d.view(who);
  return (await d.as(who)('propose-text', { baseVersion: v.textVersion, hunks: H(v, hunks), why })).id;
}

/**
 * every seat named votes for `cid` wherever it is asked about it, and against `losers` wherever it is asked
 * about one of those alone — a few rounds, since the engine deals one pair per race at a time; answers whether
 * `cid` was adopted
 */
async function carry(d, cid, voters, losers = []) {
  let cast = 0;
  const adopted = async () => { const v = await d.view();
    return (v.records || []).some((x) => x.outcome === 'adopted' && (x.candidateId === cid || x.field?.some((f) => f.candidateId === cid && f.outcome === 'adopted'))); };
  for (let round = 0; round < 4 && !(await adopted()); round++) {
    for (const m of voters) {
      const v = await d.view(m);
      const cards = [...(v.raceCards ?? []), ...(v.clauses ?? []).map((c) => c.ask).filter(Boolean)];
      for (const card of cards) {
        const ids = [card.a.id, card.b.id];
        let outcome = null;
        if (ids.includes(cid)) outcome = card.a.id === cid ? 'a' : 'b';
        else if (losers.includes(card.a.id)) outcome = 'b';
        else if (losers.includes(card.b.id)) outcome = 'a';
        if (!outcome) continue;
        try { await d.as(m)('judge-race', { a: card.a.id, b: card.b.id, outcome }); cast++; } catch { /* judged already, or it carried */ }
      }
    }
  }
  const ok = await adopted();
  if (!ok) { const v = await d.view(voters[0]);
    say('  carry: not adopted — the view holds ' + JSON.stringify({ clauses: (v.clauses || []).map((c) => ({ id: c.id, cands: (c.candidates || []).map((k) => k.id), ask: c.ask && [c.ask.a.id, c.ask.b.id] })), cards: (v.raceCards || []).map((c) => [c.a.id, c.b.id]) })); }
  say(`  carry ${cid}: ${cast} judgment(s), ${ok ? 'ADOPTED' : 'NOT adopted'}`);
  return ok;
}

/** a page for a seat whose cookie we already hold, at a given window size */
async function seat(browser, d, who, size = { width: 1600, height: 1000 }, touch = false) {
  const ctx = await browser.newContext({ viewport: size, hasTouch: touch, isMobile: false });
  const [name, ...rest] = d.cookies[who].split('=');
  await ctx.addCookies([{ name, value: rest.join('='), url: BASE }]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => say(`  pageerror[${who}@${size.width}]: ${e.message}`));
  const refused = [];
  page.on('response', async (r) => {
    if (/\/cmd$/.test(r.url()) && r.status() >= 400) refused.push(r.status() + ' ' + (await r.text().catch(() => '')).slice(0, 160));
  });
  if (LAG) await page.route('**/api/d/**', async (route) => { await sleep(LAG); await route.continue(); });
  await landOn(page, `${BASE}/d/${d.slug}`);
  await page.waitForSelector('#charter', { timeout: 20_000 });
  await sleep(1000);
  await page.evaluate(() => fetch(location.pathname.replace('/d/', '/api/d/') + '/view').then((r) => r.json())
    .then((v) => localStorage.setItem('draft:grants:' + location.pathname.split('/')[2] + ':' + (v.me || ''),
      JSON.stringify(['canpropose', 'grant-pen', 'grant-shield', 'grant-voice', 'canjudge']))));
  await page.reload();
  await page.waitForSelector('#charter', { timeout: 20_000 });
  await sleep(1500);
  return { page, refused, who, size };
}

/** one reading of everything a proposer could notice (runs inside the page) */
const READ = () => {
  const S = window.SESSION;
  const vis = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0; };
  const inWin = (el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; };
  const charOf = (el) => { const g = el && el.querySelector('[data-char]'); return g ? g.getAttribute('data-char') : null; };
  const mine = (S.SUGGS || []).filter((g) => g.mine || g.id === S.DRAFT_ID);
  const cards = [...document.querySelectorAll('#charter .sugg')].map((c) => {
    const kind = ['editcard', 'minecard', 'strandedcard', 'quick-open', 'race-open', 'patch-open']
      .filter((k) => c.classList.contains(k)).join('+') || c.className.replace(/\s+/g, '.');
    const r = c.getBoundingClientRect();
    return { kind, card: c.getAttribute('data-card'), site: c.getAttribute('data-site'), top: Math.round(r.top), h: Math.round(r.height),
      row: [...c.querySelectorAll('.commitrow button')].map((b) => (b.getAttribute('data-act') || '-') + (b.disabled ? '(off)' : '') +
        (b.getAttribute('aria-pressed') === 'true' ? '[pressed]' : '') + ':' + ((window.CARDS.glyphTextOf(b) || b.textContent || '').trim())),
      notes: [...c.querySelectorAll('.setnote, .refusal, .draftrefusal, .changedsince')].map((n) => n.textContent.trim()) };
  });
  const footRow = [...document.querySelectorAll('#charter [data-proposalrow] button, #editdoor button, #patchrow button')]
    .filter(vis).map((b) => (b.getAttribute('data-act') || '-') + (b.dataset.pen ? '/pen' : '') + (b.disabled ? '(off)' : '') +
      (b.getAttribute('aria-pressed') === 'true' ? '[pressed]' : ''));
  const rowmid = [...document.querySelectorAll('#charter [data-proposalrow] .rowmid')].map((m) => m.textContent.trim()).filter(Boolean);
  const rail = mine.map((g) => {
    const li = [...document.querySelectorAll('#rail li.qitem')].find((x) => x.getAttribute('data-q') === g.id);
    const b = li && li.querySelector('button');
    const r = li && li.getBoundingClientRect();
    return { id: g.id, there: !!li, shown: !!(li && vis(li)), inWindow: !!(li && vis(li) && inWin(li)),
      cls: b ? b.className : null, h: r ? Math.round(r.height) : null, top: r ? Math.round(r.top) : null,
      text: li ? li.textContent.replace(/\s+/g, ' ').trim().slice(0, 140) : null, title: b ? b.title : null, mark: charOf(li) };
  });
  const tabs = mine.flatMap((g) => [...document.querySelectorAll('#charter .achip')]
    .filter((t) => t.getAttribute('data-anchor') === g.id || t.getAttribute('data-tab') === g.id)
    .map((t) => ({ id: g.id, shown: vis(t), inWindow: vis(t) && inWin(t), title: t.title, char: charOf(t) || t.textContent.trim() })));
  const said = (document.body.innerText || '').split('\n').map((l) => l.trim())
    .filter((l) => /submitted|in the race|just in|your proposal|no longer|could not be carried|text moved|has changed|awaiting|withdrawn|rejected|passed/i.test(l)).slice(0, 8);
  const ae = document.activeElement;
  return {
    editing: document.getElementById('doc') ? document.getElementById('doc').classList.contains('editing') : null,
    openId: S.openId, cards, footRow, rowmid,
    mine: mine.map((g) => ({ id: g.id, unproposed: !!g.unproposed, stranded: !!g.stranded, awaiting: !!g.awaiting,
      cap: g.cap || '', refusal: g.refusal || null, sites: (g.sites || []).map((s) => s.keys.join('+') + (s.lost ? '(lost)' : '')) })),
    records: (S.SUGGS || []).filter((g) => String(g.id).startsWith('rec:')).map((g) => {
      const li = [...document.querySelectorAll('#rail li.qitem')].find((x) => x.getAttribute('data-q') === g.id);
      const b = li && li.querySelector('button');
      return { id: g.id, cap: g.cap, mineIn: (g.mineIn || []).length, early: !!g.early, railThere: !!li,
        railShown: !!(li && vis(li)), inWindow: !!(li && vis(li) && inWin(li)), unread: !!(b && !b.classList.contains('filed')),
        railText: li ? li.textContent.replace(/\s+/g, ' ').trim().slice(0, 100) : null, mark: charOf(li) }; }),
    rail, tabs,
    wallet: { held: S.editsHeld, text: ((document.getElementById('wallet') || {}).textContent || '').trim(),
      pencils: document.querySelectorAll('#wallet i').length, shown: vis(document.getElementById('wallet')) },
    flying: !!document.querySelector('.flypencil'), holding: !!S.holding,
    scrollY: Math.round(scrollY),
    focus: ae ? (ae.id ? '#' + ae.id : ae.dataset && ae.dataset.lane ? 'lane:' + ae.dataset.lane : ae.tagName.toLowerCase() + '.' + String(ae.className).split(' ')[0]) : null,
    railEntries: document.querySelectorAll('#rail li.qitem').length,
    said,
  };
};

/** start the in-page recorder: a reading every 50ms, kept only where it changed */
const record = (page) => page.evaluate((src) => {
  const read = new Function('return (' + src + ')()');
  window.__pf = []; const t0 = performance.now(); let last = '';
  clearInterval(window.__pfTimer);
  window.__pfTimer = setInterval(() => {
    let r; try { r = read(); } catch (e) { r = { threw: String(e && e.message) }; }
    const k = JSON.stringify(r);
    if (k !== last) { last = k; window.__pf.push({ t: Math.round(performance.now() - t0), r }); }
  }, 50);
}, READ.toString());
const stop = (page) => page.evaluate(() => { clearInterval(window.__pfTimer); return window.__pf; });

/** print a recording as the changes between readings */
function printTimeline(tl, label) {
  let prev = {};
  for (const { t, r } of tl) {
    const changes = [];
    for (const k of Object.keys(r)) {
      const a = JSON.stringify(prev[k]), b = JSON.stringify(r[k]);
      if (a !== b) changes.push(`${k}: ${b}`);
    }
    say(`  ${label} +${String(t).padStart(5)}ms  ${changes.join('\n' + ' '.repeat(30))}`);
    prev = r;
  }
}
const readNow = (page) => page.evaluate((src) => new Function('return (' + src + ')()')(), READ.toString());
const shot = async (page, name) => { if (SHOTS) { await page.screenshot({ path: `${SHOTS}/${name}.png` }); say(`  shot: ${SHOTS}/${name}.png`); } };
const brief = (r) => JSON.stringify({ editing: r.editing, openId: r.openId, cards: r.cards, footRow: r.footRow, rowmid: r.rowmid, mine: r.mine,
  records: r.records, rail: r.rail, tabs: r.tabs, wallet: r.wallet, railEntries: r.railEntries, said: r.said, scrollY: r.scrollY, focus: r.focus });

/* ---- hands ---------------------------------------------------------------- */
const enterEdit = async (page) => {
  const how = await page.evaluate(() => {
    const t = document.querySelector('#ridetab .achip[data-tab="text"]') || document.querySelector('#editdoor [data-act="edit-door"]');
    if (!t) return null;
    const cs = getComputedStyle(t.closest('#ridetab, #editdoor'));
    t.click();
    return { via: t.closest('#ridetab') ? 'ridetab' : 'editdoor', doorDisplay: cs.display };
  });
  await sleep(500);
  return how;
};
/** a caret `off` characters into the clause whose words start with `starts` (-1: its end) */
const caretIn = (page, starts, off = -1) => page.evaluate(([st, o]) => {
  const p = [...document.querySelectorAll('#charter .prose .editable[data-key]')]
    .find((x) => !x.closest('.sugg') && !x.classList.contains('gap') && x.textContent.replace(/^(#{1,3}|-)\s+/, '').startsWith(st));
  if (!p) return null;
  p.scrollIntoView({ block: 'center' });
  const r = document.createRange();
  if (o < 0) { r.selectNodeContents(p); r.collapse(false); }
  else { const tn = [...p.childNodes].find((n) => n.nodeType === 3 && n.length > o); if (!tn) return null; r.setStart(tn, o); r.collapse(true); }
  const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  return p.dataset.key;
}, [starts, off]);
/** press the commit the way a member does: a real pointer on the visible control */
async function pressCommit(page, pen = false) {
  const sel = pen
    ? '#charter [data-proposalrow] [data-act="row-commit"][data-pen]:not([disabled]), .sugg [data-act="draft-pen"]:not([disabled])'
    : '#charter [data-proposalrow] [data-act="row-commit"]:not([data-pen]):not([disabled]), .sugg [data-act="draft-propose"]:not([disabled])';
  const box = await page.evaluate((s) => {
    // the one a member can reach: inside the window first (the foot row floats there), else the card's, brought into view
    const all = [...document.querySelectorAll(s)].filter((x) => { const r = x.getBoundingClientRect(); return r.width > 0 && getComputedStyle(x).visibility !== 'hidden'; });
    const inWin = (x) => { const r = x.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; };
    const b = all.find((x) => x.closest('[data-proposalrow]') && inWin(x)) || all.find(inWin) || all[0];
    if (!b) return null;
    if (!inWin(b)) b.scrollIntoView({ block: 'center' });
    const r = b.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, where: b.closest('[data-proposalrow]') ? 'foot row' : 'card', title: b.title,
      gesture: window.SESSION.gesture };
  }, sel);
  if (!box) return null;
  await page.mouse.move(box.x, box.y);
  if (box.gesture === 'click') await page.mouse.click(box.x, box.y);
  else { await page.mouse.down(); await sleep(1300); await page.mouse.up(); }
  return box;
}

async function pressAndWatch(s, label, { pen = false, ms = 6500 } = {}) {
  const { page } = s;
  const before = await readNow(page);
  say(`  BEFORE the press: ${brief(before)}`);
  await shot(page, `${label}-1-before`);
  await record(page);
  // every data swap during the press, with the ids the page's own items arrive under and what is open after it:
  // a card that shuts because its item came back under another name shows here as openId going null on a swap
  await page.evaluate(() => { const S = window.SESSION; if (S.__pfWrapped) return; S.__pfWrapped = true; window.__pfSwaps = [];
    const orig = S.setData; const t0 = performance.now();
    S.setData = (next) => { const before = S.openId; const r = orig(next);
      window.__pfSwaps.push({ t: Math.round(performance.now() - t0), openBefore: before, openAfter: S.openId,
        mine: S.SUGGS.filter((g) => g.mine).map((g) => g.id) }); return r; }; });
  const box = await pressCommit(page, pen);
  say(`  pressed: ${JSON.stringify(box)}`);
  if (box && box.where === 'foot row') {
    // with the draft's card closed the first press only opens it (Q1296); press again if so
    await sleep(700);
    const r = await readNow(page);
    if (r.mine.some((g) => g.unproposed) && !r.flying && !r.holding) { say('  (the first press opened the card and proposed nothing; pressing again)'); await pressCommit(page, pen); }
  }
  await sleep(1500);
  await shot(page, `${label}-2-just-after`);
  await sleep(ms - 1500);
  const tl = await stop(page);
  printTimeline(tl, label);
  say('  data swaps during the press: ' + JSON.stringify(await page.evaluate(() => window.__pfSwaps || [])));
  const after = await readNow(page);
  say(`  AFTER (${ms}ms): ${brief(after)}`);
  say(`  refused commands: ${JSON.stringify(s.refused)}`);
  await shot(page, `${label}-3-after`);
  return after;
}

const browser = await chromium.launch();
const ran = [];
async function run(name, fn) {
  if (ONLY && name !== ONLY && !name.startsWith(ONLY)) return;
  ran.push(name);
  say(`\n=== ${name}`);
  try { await fn(); } catch (e) { say(`  *** ${name} threw: ${e && e.stack || e}`); }
}
const NARROW = { width: 390, height: 844 };

/* ======================= Part 1 — the press ============================== */
await run('press/one', async () => {
  const d = await found(['p', 'a', 'b']);
  const s = await seat(browser, d, 'p');
  say(`  edit mode: ${JSON.stringify(await enterEdit(s.page))}`);
  say(`  caret in: ${await caretIn(s.page, 'No sugar', 3)}`);
  await s.page.keyboard.type('brown ', { delay: 30 });
  await sleep(600);
  await pressAndWatch(s, 'press-one-1600');
  // the same seat, read on a phone
  const n = await seat(browser, d, 'p', NARROW, true);
  say(`  the same proposal at 390: ${brief(await readNow(n.page))}`);
  await shot(n.page, 'press-one-390-afterwards');
  await n.page.context().close(); await s.page.context().close();
});

await run('press/two', async () => {
  const d = await found(['p', 'a', 'b']);
  const s = await seat(browser, d, 'p');
  await enterEdit(s.page);
  say(`  caret 1: ${await caretIn(s.page, 'Yorkshire', 3)}`);
  await s.page.keyboard.type('Strong ', { delay: 30 });
  await sleep(600);
  say(`  caret 2: ${await caretIn(s.page, 'Mugs go', 3)}`);
  await s.page.keyboard.type('Clean ', { delay: 30 });
  await sleep(600);
  await pressAndWatch(s, 'press-two-1600');
  await s.page.context().close();
});

await run('press/gap', async () => {
  const d = await found(['p', 'a', 'b']);
  const s = await seat(browser, d, 'p');
  await enterEdit(s.page);
  say(`  caret at the end of: ${await caretIn(s.page, 'Milk goes', -1)}`);
  await s.page.keyboard.press('Enter');
  await sleep(500);
  await s.page.keyboard.type('Oat milk is milk.', { delay: 30 });
  await sleep(600);
  await pressAndWatch(s, 'press-gap-1600');
  await s.page.context().close();
});

await run('press/seeded', async () => {
  const d = await found(['p', 'a', 'b']);
  await propose(d, 'a', [{ start: 5, end: 6, lines: ['Three biscuits each.'] }], 'two is mean');
  const s = await seat(browser, d, 'p');
  const opened = await s.page.evaluate(() => {
    const S = window.SESSION;
    const it = S.SUGGS.find((g) => g.raceId && (g.kind === 'quick' || g.kind === 'race'));
    if (!it) return null;
    const li = [...document.querySelectorAll('#rail li.qitem button')].find((x) => x.getAttribute('data-q') === it.id);
    if (li) li.click(); else S.toggle(it.id, false);
    return it.id;
  });
  say(`  race card opened: ${opened}`);
  await sleep(1200);
  const pe = await s.page.evaluate(() => {
    const b = [...document.querySelectorAll('.sugg .lanepropose')];
    if (!b.length) return { none: true };
    const x = b[b.length - 1]; x.scrollIntoView({ block: 'center' }); x.click();
    return { from: x.getAttribute('data-propose-from'), n: b.length };
  });
  say(`  ✏️ propose edit: ${JSON.stringify(pe)}`);
  await sleep(900);
  await s.page.evaluate(() => { const lane = document.querySelector('.sugg.editcard [data-lane]'); if (!lane) return;
    lane.focus(); const r = document.createRange(); r.selectNodeContents(lane); r.collapse(false);
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); });
  await s.page.keyboard.type(' On Fridays.', { delay: 30 });
  await sleep(600);
  await pressAndWatch(s, 'press-seeded-1600');
  await s.page.context().close();
});

await run('press/seedkeep', async () => {
  const d = await found(['p', 'a', 'b']);
  await propose(d, 'a', [{ start: 5, end: 6, lines: ['Three biscuits each.'] }], 'two is mean');
  const s = await seat(browser, d, 'p');
  await s.page.evaluate(() => {
    const S = window.SESSION;
    const it = S.SUGGS.find((g) => g.raceId && (g.kind === 'quick' || g.kind === 'race'));
    const li = it && [...document.querySelectorAll('#rail li.qitem button')].find((x) => x.getAttribute('data-q') === it.id);
    if (li) li.click(); else if (it) S.toggle(it.id, false);
  });
  await sleep(1200);
  const pe = await s.page.evaluate(() => {
    const b = [...document.querySelectorAll('.sugg .lanepropose')];
    if (!b.length) return { none: true };
    b[0].scrollIntoView({ block: 'center' }); b[0].click();
    return { from: b[0].getAttribute('data-propose-from'), n: b.length };
  });
  say(`  ✏️ propose edit (the current text's lane): ${JSON.stringify(pe)}`);
  await sleep(900);
  await s.page.evaluate(() => { const lane = document.querySelector('.sugg.editcard [data-lane]'); if (!lane) return;
    lane.focus(); const r = document.createRange(); r.selectNodeContents(lane); r.collapse(false);
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); });
  await s.page.keyboard.type(' On Fridays, three.', { delay: 30 });
  await sleep(600);
  await pressAndWatch(s, 'press-seedkeep-1600');
  await s.page.context().close();
});

/** a proposal about a rule: the member opens ⏱️ in the constitution, types another interval and presses ✏️ */
const READ_BAND = () => {
  const c = document.querySelector('.setupcard');
  const G = window.CARDS.glyphTextOf;
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight; };
  return { card: c ? c.dataset.setupcard : null,
    cardText: c ? (G(c) || c.innerText).replace(/\s+/g, ' ').trim().slice(0, 420) : null,
    commit: c ? [...c.querySelectorAll('.commitrow button')].map((b) => (G(b) || b.textContent).trim() + (b.disabled ? '(off)' : '')) : null,
    rail: [...document.querySelectorAll('#rail [data-card], #rail li.qitem')].map((e) => (e.dataset.card || e.dataset.q) + (vis(e) ? '' : '(off screen)') + ' “' + (G(e) || '').replace(/\s+/g, ' ').trim().slice(0, 50) + '”'),
    tabs: [...document.querySelectorAll('#band [data-tab^="mo:"], #band [data-tab="rate"]')].map((t) => t.dataset.tab + ':' + (t.title || '')),
    pencils: document.querySelectorAll('#wallet i:not(.gone)').length, held: window.SESSION.editsHeld,
    flying: !!document.querySelector('.flypencil'), scrollY: Math.round(scrollY) };
};
await run('press/motion', async () => {
  const d = await found(['p', 'a', 'b']);
  const s = await seat(browser, d, 'p');
  const how = await s.page.evaluate(() => { const t = document.querySelector('#band [data-tab="rate"]'); if (!t) return null;
    t.scrollIntoView({ block: 'center' }); const r = t.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  if (!how) { say('  no ⏱️ tab'); return; }
  await s.page.mouse.click(how.x, how.y);
  await sleep(1200);
  const f = await s.page.evaluate(() => { const x = document.querySelector('.setupcard [data-mrate]'); if (!x) return null;
    x.scrollIntoView({ block: 'center' }); const r = x.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  if (!f) { say('  the ⏱️ card offers this member no field: ' + JSON.stringify(await s.page.evaluate(READ_BAND))); return; }
  await s.page.mouse.click(f.x, f.y); await s.page.keyboard.press('Control+A'); await s.page.keyboard.type('7', { delay: 60 });
  await sleep(500);
  say('  BEFORE the press: ' + JSON.stringify(await s.page.evaluate(READ_BAND)));
  await shot(s.page, 'press-motion-1600-1-before');
  await s.page.evaluate((src) => { const read = new Function('return (' + src + ')()'); window.__pf = []; const t0 = performance.now(); let last = '';
    window.__pfTimer = setInterval(() => { const r = read(); const k = JSON.stringify(r); if (k !== last) { last = k; window.__pf.push({ t: Math.round(performance.now() - t0), r }); } }, 50); }, READ_BAND.toString());
  const b = await s.page.evaluate(() => { const x = document.querySelector('.setupcard [data-putmotion]'); if (!x) return null;
    x.scrollIntoView({ block: 'center' }); const r = x.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, disabled: x.disabled, title: x.title }; });
  say('  the commit: ' + JSON.stringify(b));
  if (b) { await s.page.mouse.move(b.x, b.y); await s.page.mouse.click(b.x, b.y); }
  if (b && b.disabled) {
    // the ✏️ was dark at the press (the field had not been left): the click lit it, a second press commits — Q1486's ground, not this walk's
    await sleep(600);
    say('  (the commit was dark at the first press; pressing again)');
    await s.page.mouse.click(b.x, b.y);
  }
  await sleep(1500); await shot(s.page, 'press-motion-1600-2-just-after');
  await sleep(5000);
  printTimeline(await stop(s.page), 'press-motion-1600');
  say('  AFTER: ' + JSON.stringify(await s.page.evaluate(READ_BAND)));
  say(`  refused commands: ${JSON.stringify(s.refused)}`);
  await shot(s.page, 'press-motion-1600-3-after');
  await s.page.context().close();
});

await run('press/pen', async () => {
  const d = await found(['p', 'a', 'b']);
  const s = await seat(browser, d, 'founder');
  await enterEdit(s.page);
  say(`  caret in: ${await caretIn(s.page, 'Dunking', 3)}`);
  await s.page.keyboard.type('Quiet ', { delay: 30 });
  await sleep(600);
  await pressAndWatch(s, 'press-pen-1600', { pen: true });
  await s.page.context().close();
});

await run('press/narrow', async () => {
  const d = await found(['p', 'a', 'b']);
  const s = await seat(browser, d, 'p', NARROW, true);
  const doors = await s.page.evaluate(() => ['#ridetab', '#editdoor', '.lanepropose'].map((q) => {
    const el = document.querySelector(q); return q + ': ' + (el ? getComputedStyle(el).display : 'absent'); }));
  say(`  the doors at 390: ${JSON.stringify(doors)}`);
  await shot(s.page, 'press-narrow-390-0-read');
  // hidden, not gated (Q1350): the door is still in the DOM, so it is pressed from script to see what a paired keyboard meets
  say(`  edit mode (from script): ${JSON.stringify(await enterEdit(s.page))}`);
  say(`  caret in: ${await caretIn(s.page, 'No sugar', 3)}`);
  await s.page.keyboard.type('brown ', { delay: 30 });
  await sleep(600);
  await pressAndWatch(s, 'press-narrow-390');
  await s.page.context().close();
});

/* ======================= Part 2 — the text moves ========================= */
async function twoPages(d, who) {
  return { wide: await seat(browser, d, who), narrow: await seat(browser, d, who, NARROW, true) };
}
async function readBoth(pp, label, shotName) {
  for (const k of ['wide', 'narrow']) {
    const r = await readNow(pp[k].page);
    say(`  ${label} [${k} ${pp[k].size.width}]: ${brief(r)}`);
    if (shotName) await shot(pp[k].page, `${shotName}-${pp[k].size.width}`);
  }
}
/** what the narrow drawer holds, opened the way a thumb opens it */
async function drawer(s, shotName) {
  const got = await s.page.evaluate(() => {
    const door = document.getElementById('drawerright');
    if (!door) return { door: null };
    const label = door.textContent.replace(/\s+/g, ' ').trim();
    const badge = door.querySelector('*') ? getComputedStyle(door.querySelector('*')).backgroundColor : null;
    door.click();
    return { door: label, badge };
  });
  await sleep(700);
  got.entries = await s.page.evaluate(() => [...document.querySelectorAll('#rail li.qitem')]
    .filter((li) => { const r = li.getBoundingClientRect(); return getComputedStyle(li).display !== 'none' && r.height > 0 && r.left < innerWidth && r.right > 0; })
    .map((li) => li.textContent.replace(/\s+/g, ' ').trim().slice(0, 90)));
  say(`  the drawer at 390: ${JSON.stringify(got)}`);
  if (shotName) await shot(s.page, shotName);
  await s.page.keyboard.press('Escape');
  await sleep(400);
}
/** open the proposer's own entry (or, failing one, the first record) and read the card */
async function openMine(s, label, shotName) {
  const id = await s.page.evaluate(() => {
    const S = window.SESSION;
    const g = S.SUGGS.find((x) => x.mine) || S.SUGGS.find((x) => String(x.id).startsWith('rec:'));
    if (!g) return null;
    if (S.openId !== g.id) S.toggle(g.id, false);
    return g.id;
  });
  await sleep(1500);
  // opened from script, so nothing travelled: bring the card to the reader for the picture
  await s.page.evaluate(() => { const c = document.querySelector('#charter .sugg'); if (c) { c.scrollIntoView({ block: 'center' }); } });
  await sleep(500);
  const r = await readNow(s.page);
  say(`  ${label} — opened ${id}: cards ${JSON.stringify(r.cards)} · the card reads: ` +
    JSON.stringify(await s.page.evaluate(() => { const c = document.querySelector('#charter .sugg'); return c ? c.innerText.replace(/\s+/g, ' ').slice(0, 600) : null; })));
  if (shotName) await shot(s.page, shotName);
}
const viewSays = async (d, who, mineId) => {
  const v = await d.view(who);
  say(`  the view says — my id ${mineId} · mine: ${JSON.stringify((v.mine || []).map((m) => ({ id: m.id, state: m.state, at: m.at, hunks: m.patch && m.patch.hunks.map((h) => [h.start, h.end]) })))} · records: ` +
    JSON.stringify((v.records || []).map((r) => ({ race: r.raceId, cand: r.candidateId, outcome: r.outcome, early: !!r.early,
      field: (r.field || []).map((f) => f.candidateId + ':' + f.outcome) }))) +
    ` · wallet: ${JSON.stringify(v.wallet ?? v.edits ?? v.tokens ?? null)}`);
};

await run('moved/rival', async () => {
  const d = await found(['p', 'a', 'b', 'c']);
  const mineId = await propose(d, 'p', [{ start: 2, end: 3, lines: ['No white sugar goes in the pot.'] }], 'brown is fine');
  const pp = await twoPages(d, 'p');
  await readBoth(pp, 'BEFORE — my proposal is live', 'moved-rival-0-before');
  await drawer(pp.narrow, 'moved-rival-0-before-drawer-390');
  await record(pp.wide.page);
  const rival = await propose(d, 'a', [{ start: 2, end: 3, lines: ['Sugar is a private matter.'] }], 'live and let live');
  await carry(d, rival, ['founder', 'b', 'c', 'a'], [mineId]);
  await sleep(9000);
  printTimeline(await stop(pp.wide.page), 'moved-rival');
  await viewSays(d, 'p', mineId);
  await readBoth(pp, 'AFTER — a rival was carried', 'moved-rival-1-after');
  await drawer(pp.narrow, 'moved-rival-1-after-drawer-390');
  await openMine(pp.wide, 'wide', 'moved-rival-2-opened-1600');
  await openMine(pp.narrow, 'narrow', 'moved-rival-2-opened-390');
  await pp.wide.page.context().close(); await pp.narrow.page.context().close();
});

await run('moved/overlap', async () => {
  const d = await found(['p', 'a', 'b', 'c']);
  const mineId = await propose(d, 'p', [{ start: 2, end: 3, lines: ['No white sugar goes in the pot.'] }], 'brown is fine');
  const pp = await twoPages(d, 'p');
  await readBoth(pp, 'BEFORE — my proposal is live');
  await record(pp.wide.page);
  // a patch over lines 1–3: a wider footprint than mine
  const big = await propose(d, 'a', [{ start: 1, end: 4, lines: ['Tea is made in the big pot, strong, with nothing added.'] }], 'one clause not three');
  const vv = await d.view('b');
  say(`  races now: ${JSON.stringify((vv.clauses || []).map((r) => ({ id: r.id, cands: r.candidates.map((c) => c.id) })))}`);
  await carry(d, big, ['founder', 'b', 'c', 'a'], [mineId]);
  await sleep(9000);
  printTimeline(await stop(pp.wide.page), 'moved-overlap');
  await viewSays(d, 'p', mineId);
  await readBoth(pp, 'AFTER — an overlapping patch was carried', 'moved-overlap-1-after');
  await drawer(pp.narrow, 'moved-overlap-1-after-drawer-390');
  await openMine(pp.wide, 'wide', 'moved-overlap-2-opened-1600');
  await openMine(pp.narrow, 'narrow', 'moved-overlap-2-opened-390');
  await pp.wide.page.context().close(); await pp.narrow.page.context().close();
});

await run('moved/rejected', async () => {
  const d = await found(['p', 'a', 'b', 'c']);
  const mineId = await propose(d, 'p', [{ start: 2, end: 3, lines: ['No white sugar goes in the pot.'] }], 'brown is fine');
  const pp = await twoPages(d, 'p');
  await readBoth(pp, 'BEFORE — my proposal is live');
  await record(pp.wide.page);
  let cast = 0;
  for (const m of ['founder', 'a', 'b', 'c']) {
    const v = await d.view(m);
    const cards = [...(v.raceCards ?? []), ...(v.clauses ?? []).map((c) => c.ask).filter(Boolean)];
    for (const card of cards) {
      if (card.a.id !== mineId && card.b.id !== mineId) continue;
      try { await d.as(m)('judge-race', { a: card.a.id, b: card.b.id, outcome: card.a.id === mineId ? 'b' : 'a' }); cast++; } catch (e) { say('  (vote refused: ' + e.message.slice(0, 80) + ')'); }
    }
  }
  say(`  ${cast} seat(s) preferred the current text`);
  await sleep(9000);
  printTimeline(await stop(pp.wide.page), 'moved-rejected');
  await viewSays(d, 'p', mineId);
  await readBoth(pp, 'AFTER — the room preferred the current text', 'moved-rejected-1-after');
  await drawer(pp.narrow, 'moved-rejected-1-after-drawer-390');
  await openMine(pp.wide, 'wide', 'moved-rejected-2-opened-1600');
  await openMine(pp.narrow, 'narrow', 'moved-rejected-2-opened-390');
  await pp.wide.page.context().close(); await pp.narrow.page.context().close();
});

await run('moved/above', async () => {
  const d = await found(['p', 'a', 'b', 'c']);
  const mineId = await propose(d, 'p', [{ start: 8, end: 9, lines: ['Whoever brews never washes up.'] }], 'firmer');
  const pp = await twoPages(d, 'p');
  await readBoth(pp, 'BEFORE — my proposal is live');
  await record(pp.wide.page);
  const ins = await propose(d, 'a', [{ start: 2, end: 2, lines: ['The pot is warmed first.'] }], 'obviously');
  await carry(d, ins, ['founder', 'b', 'c', 'a']);
  await sleep(9000);
  printTimeline(await stop(pp.wide.page), 'moved-above');
  await viewSays(d, 'p', mineId);
  await readBoth(pp, 'AFTER — a clause was carried in above', 'moved-above-1-after');
  await pp.wide.page.context().close(); await pp.narrow.page.context().close();
});

await run('moved/decree', async () => {
  const d = await found(['p', 'a', 'b', 'c']);
  const mineId = await propose(d, 'p', [{ start: 2, end: 3, lines: ['No white sugar goes in the pot.'] }], 'brown is fine');
  const pp = await twoPages(d, 'p');
  await readBoth(pp, 'BEFORE — my proposal is live');
  await record(pp.wide.page);
  const v0 = await d.view('founder');
  await d.cmd('pen-text', { baseVersion: v0.textVersion, hunks: H(v0, [{ start: 2, end: 3, lines: ['Sugar is kept off the table.'] }]), why: 'tidiness' });
  await sleep(9000);
  printTimeline(await stop(pp.wide.page), 'moved-decree');
  await viewSays(d, 'p', mineId);
  await readBoth(pp, 'AFTER — the Founder rewrote the clause', 'moved-decree-1-after');
  await openMine(pp.wide, 'wide', 'moved-decree-2-opened-1600');
  await pp.wide.page.context().close(); await pp.narrow.page.context().close();
});

await run('moved/draft', async () => {
  const d = await found(['p', 'a', 'b', 'c']);
  const s = await seat(browser, d, 'p');
  await enterEdit(s.page);
  say(`  caret in: ${await caretIn(s.page, 'No sugar', 3)}`);
  await s.page.keyboard.type('brown ', { delay: 30 });
  await sleep(600);
  say(`  DRAFTING: ${brief(await readNow(s.page))}`);
  await record(s.page);
  // first a clause carried in ABOVE the draft (it should follow), then its own clause rewritten (it should strand)
  const ins = await propose(d, 'a', [{ start: 1, end: 1, lines: ['The pot is warmed first.'] }], 'obviously');
  await carry(d, ins, ['founder', 'b', 'c', 'a']);
  await sleep(6000);
  say(`  AFTER a clause above: ${brief(await readNow(s.page))}`);
  const v1 = await d.view('a');
  const at = String(v1.text).split('\n').findIndex((l) => l.startsWith('No sugar'));
  const rw = await propose(d, 'a', [{ start: at, end: at + 1, lines: ['Sugar is a private matter.'] }], 'live and let live');
  await carry(d, rw, ['founder', 'b', 'c', 'a']);
  await sleep(6000);
  printTimeline(await stop(s.page), 'moved-draft');
  say(`  AFTER its own clause was rewritten: ${brief(await readNow(s.page))}`);
  say('  the card reads: ' + JSON.stringify(await s.page.evaluate(() => { const c = document.querySelector('#charter .sugg'); return c ? c.innerText.replace(/\s+/g, ' ').slice(0, 600) : null; })));
  await shot(s.page, 'moved-draft-1-stranded-1600');
  say('  …and the member presses ✏️ anyway:');
  await pressAndWatch(s, 'moved-draft-press', { ms: 4000 });
  await s.page.context().close();
});

await browser.close();
say(`\nran: ${ran.join(', ') || '(nothing matched --case)'}`);
process.exit(0);
