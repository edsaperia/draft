#!/usr/bin/env node
/**
 * wrong-line-room — **does a decision card ever head itself with the wrong
 * wording, and does ✏️ *propose edit* ever start from the wrong wording or aim
 * at the wrong lines, in a document shaped like a real convention's?**
 * (Q1477 seen again and Q1483; Ed, the room of 2026-09-20, build 5929a6e: *the
 * status quo text shown in a decision card isn't always the right text;
 * sometimes it's off by one line* · *the propose edit button doesn't always
 * pick up the right text*.)
 *
 *   PORT=8401 DRAFT_BASE_URL=http://127.0.0.1:8401 DRAFT_DATA_DIR=<fresh> npm run server
 *   node scripts/repro/wrong-line-room.mjs http://127.0.0.1:8401 [--case=<name>] [--width=390]
 *
 * What it drives.  `line-above.mjs` held the document fixed at the tea room's
 * three short lines; this holds the *reader* fixed and varies the document: a
 * SYNTHETIC text in the shape of the room's — blank lines at 1 and 3, headings
 * with backslash escapes, bullets with trailing double spaces, bold runs, a
 * code span, no trailing newline — and the proposal shapes the room's feed
 * shows: a run of two lines rewritten as one, one line split in two, a
 * deletion, a heading and a bullet as the contested line, an insertion, rivals
 * on overlapping spans, and a run across a blank line.  A THIRD PARTY's page
 * (seat `r`) and an AUTHOR's page (seat `b`) are open throughout.
 *
 * What it asserts, on both pages, for every card the page holds:
 *   head      the card's head — *what stands* — is the wording the candidate(s)
 *             on it actually replace, read from that seat's own view JSON;
 *   seed      a draft begun by ✏️ *propose edit* on a lane starts from that
 *             lane's whole wording (the head's lane: everything the head shows);
 *   aim       …and the hunk the press sends — the page's own `propose-text`,
 *             caught and refused on the wire so the room gains no candidate —
 *             replaces exactly the lines that wording is a reading OF; a
 *             narrower hunk doubles the lines it leaves behind;
 *   sendable  …and the page's own guard (`misaimed`, Q1463) lets it go at all;
 *   reading   a proposal's block reads what the engine would make of its hunks.
 *
 * Cases (`--case=<name>`, a family by its prefix; `--width=390` for a phone):
 *   shapes        every shape at once, nothing adopted; then the reader answers
 *                 each pair dealt so the rival pairs and the two-challenger
 *                 cards (headed by the union of both spans) are read too
 *   patches       candidates of several hunks: an insertion and a replacement
 *                 at one line, two places a line apart, two places far apart
 *   record        the sealed record's *Previous text* and place, where a rival
 *                 closed early (Q1440) is frozen in an older line space
 *   deadlock      the ⚔️ card, the host's `deadlocked` flag forced on the wire:
 *                 its head against its field, and ✏️ under a field wording
 *   overlap       rivals on overlapping runs, one carried from under the others
 *   shift/idle    line-count-changing proposals carried ABOVE live races, the
 *                 reader with nothing open
 *   shift/open    …with the contested card open across the adoptions
 *   shift/other   …with another clause's card open across them
 *
 * As found on 5929a6e (2026-09-20): RED at seed · aim · sendable (shapes),
 * reading (patches), record and deadlock; GREEN at head in every live card,
 * static and across every adoption, at 1600 and at 390.  Diagnosis only — the
 * walk is the reproduction, not a fix.
 *
 * Exit 0 when nothing is wrong; 1 on any finding, 2 on a broken set-up.
 */
import { chromium } from 'playwright';
import { post as postTo, followLink, sleep } from '../lib/walk.mjs';

const BASE = (process.argv.find((a) => /^https?:/.test(a)) || 'http://127.0.0.1:8401').replace(/\/$/, '');
const ONLY = (process.argv.find((a) => a.startsWith('--case=')) || '').slice(7);
const WIDTH = +((process.argv.find((a) => a.startsWith('--width=')) || '').slice(8) || 1600);
const post = (p, b, c) => postTo(BASE, p, b, c);
const say = (s) => console.log(`[${new Date().toTimeString().slice(0, 8)}] ${s}`);
const die = (m) => { console.error(`wrong-line-room: ${m}`); process.exit(2); };

const health = await (await fetch(`${BASE}/healthz`)).json().catch(() => ({}));
if (health.devMail !== true) die(`${BASE} is not a dev server`);

/* the synthetic charter: the room's shape, nobody's words */
const TEXT = [
  'This charter rests on the values the garden club shares:',                                  // 0
  '',                                                                                           // 1  blank
  '**Patience.** We give seedlings and each other time to settle.  ',                           // 2
  '',                                                                                           // 3  blank
  '**Plain dealing.** We say what we mean at the potting bench.',                               // 4
  '## 1\\. The plot register',                                                                  // 5
  'A plot is ours if and only if it is written in the register.',                               // 6
  'The register is a ledger kept in the shed (`shed/register.md`). Every change is dated.',     // 7
  'Every entry in the register records:',                                                       // 8
  '- The day it was made  ',                                                                    // 9
  '- Who dug the bed  ',                                                                        // 10
  '- What was planted there  ',                                                                 // 11
  '## 2\\. Watering',                                                                           // 12
  '### Summer rota',                                                                            // 13
  'Each member waters twice a week between May and September.',                                 // 14
  '**Hoses.** The long hose stays coiled by the tap.',                                          // 15
  '**Cans.** Cans go back to the rack, upside down.',                                           // 16
  '### Winter',                                                                                 // 17
  'Nobody waters in frost.',                                                                    // 18
  '## 3\\. Disputes',                                                                           // 19
  '**Step 1 — A word.** The two members talk at the gate.',                                     // 20
  '**Step 2 — A witness.** If that fails, a third member listens to both.',                     // 21
  '**Step 3 — The bench.** If unresolved, the whole club hears it at the bench.',               // 22
  'Remedies run from an apology to the loss of a plot for a season.',                           // 23
  'Decisions bind the two members and nobody else.',                                            // 24
  '## 4\\. Expiry',                                                                             // 25
  'This charter lapses on 29 November 2026\\.',                                                 // 26
  'If it is not renewed it lapses and the plots return to the parish.',                         // 27
].join('\n');

/** what a patch states it is replacing (Q1463 (1)), over the served text */
const H = (v, h) => {
  const lines = v.text === '' || v.text == null ? [''] : String(v.text).split('\n');
  return h.map((x) => (x.start === x.end
    ? { ...x, after: x.start === 0 ? null : (lines[x.start - 1] ?? null) }
    : { ...x, was: lines.slice(x.start, x.end) }));
};

let N = 0;
async function found(text, members, pageSeats = []) {
  const run = `wl${++N}-${Date.now().toString(36)}`;
  const created = await (await post('/api/docs', { title: `Wrong line ${run}`, email: `f-${run}@example.org`, isMember: true })).json();
  if (!created.ok) die(`creation refused: ${JSON.stringify(created)}`);
  const slug = created.slug;
  const founder = (await followLink(created.devLink)).cookie;
  const cmd = async (name, args = {}, cookie = founder) => {
    const r = await post(`/api/d/${slug}/cmd`, { cmd: name, args }, cookie);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`${name} refused (${r.status}): ${JSON.stringify(j)}`);
    return j.result ?? j;
  };
  await cmd('confirm-starting-text', { text });
  await cmd('set-convenor-membership', { isMember: true });
  for (const [setting, value] of Object.entries({
    rate: { grant: 10, cap: 12, dripMinutes: 1 }, pace: { shape: 'fixed' }, quorum: { form: 'share', n: 50 },
    authorship: { rung: 'sealedElective' }, judgments: { rung: 'after' }, applications: { apply: false },
    admission: { price: 'pen' }, removal: { price: 'proposal' }, machines: { enabled: false, budget: 0 },
    lapse: { afterMs: 60 * 60_000 }, ending: { endsAtMs: Date.now() + 6 * 3_600_000 }, bar: { pct: 50 },
    chamber: { rung: 'link' },
  })) {
    await (await post(`/api/d/${slug}/cmd`, { cmd: 'reclaim', args: { setting } }, founder)).text();
    await cmd('set-setting', { setting, value });
  }
  for (const m of members) await cmd('invite', { email: `${m}-${run}@example.org` });
  await cmd('begin', { laidDown: [{ setting: 'startingText', power: 'assent' }] });
  const tail = await (await fetch(`${BASE}/api/dev/outbox`)).json();
  const links = {}, cookies = {};
  for (const m of members) {
    const mail = (tail.mails ?? []).find((x) => x.to === `${m}-${run}@example.org`);
    if (!mail) die(`no invitation for ${m}`);
    links[m] = mail.link;
    if (!pageSeats.includes(m)) cookies[m] = (await followLink(mail.link)).cookie;
  }
  const view = (cookie = founder) => fetch(`${BASE}/api/d/${slug}/view`, { headers: { cookie } }).then((r) => r.json());
  return { slug, cmd, founder, cookies, links, view, members, run };
}

async function propose(d, who, hunks, why) {
  const cookie = who === 'founder' ? d.founder : d.cookies[who];
  const v = await d.view(cookie);
  return (await d.cmd('propose-text', { baseVersion: v.textVersion, hunks: H(v, hunks), why }, cookie)).id;
}

/** every API seat votes for `cid`, which is how a room adopts */
async function carry(d, cid, voters) {
  let cast = 0;
  for (const m of voters) {
    const c = m === 'founder' ? d.founder : d.cookies[m];
    if (!c) continue;
    const v = await d.view(c);
    const clause = (v.clauses ?? []).find((r) => r.candidates?.some((k) => k.id === cid));
    if (!clause) break;
    // the pair that puts `cid` against the current text, dealt or not
    const pair = { a: clause.incumbentId, b: cid };
    try { await d.cmd('judge-race', { a: pair.a, b: pair.b, outcome: 'b' }, c); cast++; } catch { /* its own author */ }
  }
  const v = await d.view();
  const still = (v.clauses ?? []).some((r) => r.candidates?.some((k) => k.id === cid));
  if (still) die(`${cid} did not carry after ${cast} judgment(s) — floor ${v.floor}`);
  return v;
}

async function seat(browser, link, slug) {
  const page = await (await browser.newContext({ viewport: { width: WIDTH, height: WIDTH < 600 ? 844 : 1000 } })).newPage();
  const errs = [];
  page.on('pageerror', (e) => { errs.push(e.message); say(`  pageerror: ${e.message}`); });
  // a propose-text the PAGE sends is caught and refused on the wire, so the walk reads the hunks a
  // press would have sent without the room ever gaining a candidate (the walk's own proposals go by
  // fetch from inside the page with a marker the route lets through)
  await page.route('**/api/d/*/cmd', async (route) => {
    let body = null;
    try { body = JSON.parse(route.request().postData() || '{}'); } catch { /* not json */ }
    if (body && body.cmd === 'propose-text' && !(body.args && body.args.why && /^walk:/.test(body.args.why))) {
      page.__caught = body.args;
      return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'caught by the walk' }) });
    }
    return route.continue();
  });
  await page.goto(link);
  await page.waitForURL(new RegExp(`/d/${slug}`), { timeout: 20_000 });
  await page.waitForSelector('#charter', { timeout: 20_000, state: 'attached' });
  await sleep(1200);
  await page.evaluate(() => fetch(location.pathname.replace('/d/', '/api/d/') + '/view').then((r) => r.json())
    .then((v) => localStorage.setItem('draft:grants:' + location.pathname.split('/')[2] + ':' + (v.me || ''),
      JSON.stringify(['canpropose', 'grant-pen', 'grant-shield', 'grant-voice', 'canjudge']))));
  await page.reload();
  await page.waitForSelector('#charter', { timeout: 20_000, state: 'attached' });
  await sleep(1500);
  return { page, errs };
}

/** a proposal made from a page seat's own cookie */
const proposeFromPage = (page, hunks, why) => page.evaluate(async ({ hunks, why }) => {
  const api = location.pathname.replace('/d/', '/api/d/');
  const v = await (await fetch(api + '/view')).json();
  const lines = String(v.text).split('\n');
  const hs = hunks.map((x) => (x.start === x.end
    ? { ...x, after: x.start === 0 ? null : lines[x.start - 1] } : { ...x, was: lines.slice(x.start, x.end) }));
  const r = await fetch(api + '/cmd', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ cmd: 'propose-text', args: { baseVersion: v.textVersion, hunks: hs, why: 'walk: ' + why } }) });
  const j = await r.json();
  return (j.result || j).id || JSON.stringify(j);
}, { hunks, why });

const norm = (t) => String(t == null ? '' : t).replace(/[^A-Za-z0-9]+/g, '').toLowerCase();

const bad = [];
const flag = (label, what, detail) => {
  bad.push({ label, what, ...detail });
  say(`  *** ${what} [${label}] ${JSON.stringify(detail).slice(0, 600)}`);
};

/**
 * Every card the page holds, opened one at a time and read — and the truth for
 * each, from the same seat's own view JSON fetched inside the page.
 */
async function audit(page, label, { edit = true, seen = null } = {}) {
  const ids = await page.evaluate(() => window.SESSION.SUGGS
    .filter((g) => (g.raceId && (g.kind === 'quick' || g.kind === 'race')) || (g.kind === 'draft' && g.candidate))
    .map((g) => g.id));
  say(`  ${label}: ${ids.length} card(s) to read`);
  let read = 0;
  for (const id of ids) {
    if (seen) { if (seen.has(id)) continue; seen.add(id); }
    const r = await page.evaluate(async (id) => {
      const wait = (ms) => new Promise((res) => setTimeout(res, ms));
      const S = window.SESSION;
      const it = S.SUGGS.find((g) => g.id === id);
      if (!it) return { gone: true };
      if (S.openId !== id) S.toggle(id, false);
      await wait(900);
      const api = location.pathname.replace('/d/', '/api/d/');
      const v = await (await fetch(api + '/view')).json();
      const lines = String(v.text || '').split('\n');
      const cand = (cid) => { for (const c of v.clauses || []) for (const k of c.candidates) if (k.id === cid) return k; return (v.mine || []).find((m) => m.id === cid) || null; };
      const hunksOfCand = (k) => (k ? (k.hunks || (k.patch && k.patch.hunks) || []) : []);
      let sideIds = [];
      if (it.kind === 'draft') sideIds = [it.candidate];
      else if (it.card) sideIds = [it.card.a, it.card.b];
      else if (it.kind === 'quick') sideIds = [it.candId];
      else sideIds = [it.race.a.id, it.race.b.id];
      const hs = sideIds.map(cand).flatMap(hunksOfCand);
      const span = hs.length ? { start: Math.min(...hs.map((h) => h.start)), end: Math.max(...hs.map((h) => h.end)) } : null;
      const truth = span ? lines.slice(span.start, span.end).filter((l) => l.trim()) : null;
      const cards = [...document.querySelectorAll('.sugg[data-card="' + CSS.escape(id) + '"]')];
      const heads = cards.map((c) => { const h = c.querySelector('.clausehead .rtext'); return h ? h.textContent.trim() : null; });
      // per-site truth for an author's own multi-site card
      const siteTruth = it.kind === 'draft'
        ? hunksOfCand(cand(it.candidate)).map((h) => lines.slice(h.start, h.end).filter((l) => l.trim()))
        : null;
      // what the proposal's block says the clause would read — the dels taken out
      const laneTexts = cards.flatMap((c) => [...c.querySelectorAll('.propblock .rtext')].map((el) => {
        const k = el.cloneNode(true); k.querySelectorAll('del').forEach((x) => x.remove()); return k.textContent.trim(); }));
      // …and what the engine would make of it: hunks applied in order over the whole text,
      // an insertion at a line standing BEFORE a replacement that starts there
      const engineReading = (k) => {
        const hs2 = hunksOfCand(k).slice().sort((a, b) => a.start - b.start || a.end - b.end);
        if (!span || !hs2.length) return null;
        const out = []; let at = span.start;
        for (const h of hs2) { out.push(...lines.slice(at, h.start)); out.push(...h.lines); at = h.end; }
        out.push(...lines.slice(at, span.end));
        return out.filter((l) => l.trim());
      };
      const engine = {};
      for (const sid of sideIds) { const k = cand(sid); if (k) engine[sid] = engineReading(k); }
      const btns = cards.flatMap((c) => [...c.querySelectorAll('[data-propose-from]')].map((b) => b.getAttribute('data-propose-from')));
      const readings = {};
      for (const sid of sideIds) {
        const k = cand(sid); if (!k || !span) continue;
        const region = lines.slice(span.start, span.end);
        for (const h of hunksOfCand(k).slice().sort((a, b) => b.start - a.start)) region.splice(h.start - span.start, h.end - h.start, ...h.lines);
        readings[sid] = region.filter((l) => l.trim());
      }
      return { kind: it.kind, keys: it.keys, isInsert: !!it.isInsert, card: it.card || null, candId: it.candId || null,
        race: it.race ? { a: it.race.a.id, b: it.race.b.id } : null,
        span, truth, siteTruth, heads, btns, readings, laneTexts, engine, open: S.openId === id, nCards: cards.length };
    }, id);
    if (r.gone) continue;
    read++;
    if (!r.nCards) { flag(label, 'NO-CARD', { id, keys: r.keys }); continue; }
    // ---- head
    if (r.kind === 'draft') {
      r.heads.forEach((h, i) => {
        const want = (r.siteTruth[i] || []);
        const insert = !want.length;
        if (insert ? !/no text here/i.test(h || '') : norm(h) !== norm(want.join('')))
          flag(label, 'HEAD(mine)', { id, site: i, head: h, want });
      });
    } else if (r.span && r.span.end === r.span.start) {
      if (!/no text here/i.test(r.heads[0] || '')) flag(label, 'HEAD(insert)', { id, head: r.heads[0] });
    } else if (norm(r.heads[0]) !== norm((r.truth || []).join(''))) {
      flag(label, 'HEAD', { id, keys: r.keys, span: r.span, head: r.heads[0], want: r.truth });
    }
    // ---- the proposal's own block reads what the engine would make of the candidate
    if (r.kind === 'quick' && r.candId && r.engine[r.candId] && r.engine[r.candId].length && r.laneTexts.length && !r.isInsert) {
      if (norm(r.laneTexts[0]) !== norm(r.engine[r.candId].join(''))) {
        flag(label, 'READING', { id, shows: r.laneTexts[0], engine: r.engine[r.candId] });
      }
    }
    // ---- ✏️ propose edit, every lane that offers one
    if (!edit || r.kind === 'draft') continue;
    for (const from of r.btns) {
      const lane = from.split('|')[1];
      const got = await page.evaluate(async (from) => {
        const wait = (ms) => new Promise((res) => setTimeout(res, ms));
        const S = window.SESSION;
        const b = [...document.querySelectorAll('[data-propose-from]')].find((x) => x.getAttribute('data-propose-from') === from);
        if (!b) return { none: true };
        b.click();
        await wait(1100);
        const d = S.SUGGS.find((x) => x.id === S.DRAFT_ID);
        if (!d) return { noDraft: true };
        const seeded = d.sites.map((s) => ({ keys: s.keys.slice(), text: s.text, origin: (s.origin || []).map((o) => o.text) }));
        return { seeded };
      }, from);
      if (got.none || got.noDraft) { flag(label, 'EDIT-DID-NOT-OPEN', { id, from, got }); continue; }
      // a real keystroke, so the draft counts as changed and would be sent
      const laneSel = '[data-lane="' + got.seeded[0].keys[0] + '"]';
      let typed = false;
      try {
        await page.evaluate((sel) => {
          const lane = document.querySelector(sel); if (!lane) return;
          lane.focus();
          const rg = document.createRange(); rg.selectNodeContents(lane); rg.collapse(false);
          const s = getSelection(); s.removeAllRanges(); s.addRange(rg);
        }, laneSel);
        await page.keyboard.type(' zz');
        typed = true;
      } catch { /* no lane */ }
      await sleep(500);
      // the press itself, with the command caught on the wire: what the page
      // would have sent is read off the request and the host never hears it
      page.__caught = null;
      await page.evaluate(() => {
        const b = document.querySelector('.sugg [data-act="draft-propose"]:not([data-pen])');
        if (b && !b.disabled) b.click();
      });
      await sleep(1600);
      const sent = await page.evaluate(() => {
        const S = window.SESSION;
        const d = S.SUGGS.find((x) => x.id === S.DRAFT_ID);
        return { refusal: d ? (d.refusal || null) : null, text: d ? d.sites.map((x) => x.text) : null, keys: d ? d.sites.map((x) => x.keys) : null };
      });
      sent.hunks = page.__caught ? page.__caught.hunks.map((h) => ({ start: h.start, end: h.end, n: h.lines.length, lines: h.lines })) : null;
      sent.misaimed = page.__caught ? null : (sent.refusal || 'nothing was sent');
      // what the pressed lane reads, whole
      const wantText = lane === 'keep' ? (r.truth || [])
        : (r.readings[lane === 'approve' ? (r.candId || (r.card && (r.card.inc === 'a' ? r.card.b : r.card.a))) : (r.race ? r.race[lane] : null)] || null);
      const seedText = got.seeded.map((s) => s.text).join('\n');
      if (wantText && norm(seedText) !== norm(wantText.join(''))) {
        flag(label, 'SEED', { id, lane, seeded: seedText, want: wantText });
      }
      if (sent && Array.isArray(sent.hunks) && r.span) {
        const h = sent.hunks[0];
        if (!h || sent.hunks.length !== 1 || h.start !== r.span.start || h.end !== r.span.end) {
          flag(label, 'AIM', { id, lane, span: r.span, sends: sent.hunks.map((x) => [x.start, x.end, x.n]), keys: sent.keys, typed });
        }
      }
      if (sent && sent.misaimed) flag(label, 'REFUSED', { id, lane, says: sent.misaimed });
      // put the draft down again, the way a member would
      await page.evaluate(async () => {
        const wait = (ms) => new Promise((res) => setTimeout(res, ms));
        const b = document.querySelector('.sugg [data-act="draft-cancel"], [data-proposalrow] [data-act="row-discard"]');
        if (b) b.click();
        await wait(700);
        const S = window.SESSION;
        if (S.SUGGS.find((x) => x.id === S.DRAFT_ID)) { S.SUGGS.splice(S.SUGGS.findIndex((x) => x.id === S.DRAFT_ID), 1); }
      });
      // and back to the card the next lane is on
      await page.evaluate(async (id) => { const S = window.SESSION; if (S.openId !== id) S.toggle(id, false); await new Promise((res) => setTimeout(res, 800)); }, id);
    }
  }
  if (!read && !seen) flag(label, 'NOTHING-READ', {});
  await page.evaluate(() => { const S = window.SESSION; if (S.openId) S.toggle(S.openId, false); });
  await sleep(500);
}

/** the room's shapes, put by API seats `a` and `c` and the page seat `b` */
async function shapes(d, authorPage) {
  const ids = {};
  ids.single = await propose(d, 'a', [{ start: 6, end: 7, lines: ['A plot is ours once it is entered in the register and countersigned.'] }], 'countersigning');
  ids.merge = await propose(d, 'c', [{ start: 6, end: 8, lines: ['A plot is ours when the shed ledger (`shed/register.md`) says so.'] }], 'one sentence');
  ids.split = await propose(d, 'a', [{ start: 15, end: 16, lines: ['**Hoses.** The long hose stays coiled by the tap.', 'The short hose lives in the greenhouse.'] }], 'two hoses');
  ids.del = await propose(d, 'c', [{ start: 16, end: 17, lines: [] }], 'nobody uses cans');
  ids.heading = await propose(d, 'a', [{ start: 13, end: 14, lines: ['### Summer watering rota'] }], 'say what rota');
  ids.bullet = await propose(d, 'c', [{ start: 10, end: 11, lines: ['- Who dug and who manured the bed  '] }], 'manure matters');
  ids.insert = await propose(d, 'a', [{ start: 25, end: 25, lines: ['Either member may ask once for the bench to look again.'] }], 'a second look');
  ids.run8 = await propose(d, 'c', [{ start: 22, end: 24, lines: ['**Step 3 — A jury.** Three members drawn by lot hear it and choose the remedy.'] }], 'a jury');
  ids.run9 = await propose(d, 'a', [{ start: 23, end: 25, lines: ['Remedies run from an apology to a season without a plot, and bind only the two members.'] }], 'one sentence');
  ids.blank = await propose(d, 'founder', [{ start: 0, end: 3, lines: ['This charter rests on two values:', '**Patience.** Seedlings and members both get time.'] }], 'tighter');
  if (authorPage) {
    ids.mineRun = await proposeFromPage(authorPage, [{ start: 26, end: 28, lines: ['This charter lapses at midnight on 30 November 2026 unless renewed.'] }], 'one line');
    ids.mine22 = await proposeFromPage(authorPage, [{ start: 20, end: 22, lines: ['**Step 1 — A quiet word.** The two members talk at the gate.', '**Step 2 — A listener.** If that fails, a third member listens to both.'] }], 'gentler names');
  }
  return ids;
}

const browser = await chromium.launch();
const ran = [];
async function run(name, fn) {
  if (ONLY && name !== ONLY && !name.startsWith(ONLY + '/')) return;
  ran.push(name);
  say(`=== ${name} (width ${WIDTH})`);
  await fn();
}

const MEMBERS = ['a', 'b', 'c', 'e', 'g', 'r'];
const VOTERS = ['founder', 'a', 'c', 'e', 'g'];

await run('shapes', async () => {
  const d = await found(TEXT, MEMBERS, ['b', 'r']);
  const R = await seat(browser, d.links.r, d.slug);
  const B = await seat(browser, d.links.b, d.slug);
  const ids = await shapes(d, B.page);
  say('  proposals: ' + JSON.stringify(ids));
  await sleep(5000);
  const seenR = new Set();
  await audit(R.page, 'shapes/reader', { seen: seenR });
  await audit(B.page, 'shapes/author');
  // …and deeper into each race: the reader answers every pair dealt (a tie moves nothing),
  // so the router deals the next — the rival against the current text, then rival against
  // rival, whose card is headed by the union of both spans
  for (let round = 1; round <= 3; round++) {
    const n = await R.page.evaluate(async () => {
      const api = location.pathname.replace('/d/', '/api/d/');
      const v = await (await fetch(api + '/view')).json();
      const pairs = [...(v.raceCards || []).filter((c) => c.kind === 'edge'), ...(v.clauses || []).map((c) => c.ask).filter(Boolean)];
      let k = 0;
      for (const c of pairs) {
        const r = await fetch(api + '/cmd', { method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ cmd: 'judge-race', args: { a: c.a.id, b: c.b.id, outcome: 'tie' } }) });
        if (r.ok) k++;
      }
      return k;
    });
    say('  round ' + round + ': the reader answered ' + n + ' pair(s)');
    if (!n) break;
    await sleep(5500);
    await audit(R.page, 'shapes/reader/round' + round, { seen: seenR });
  }
  await R.page.context().close(); await B.page.context().close();
});

await run('patches', async () => {
  const d = await found(TEXT, MEMBERS, ['b', 'r']);
  const R = await seat(browser, d.links.r, d.slug);
  const ids = {};
  // an insertion standing before a clause that the same proposal rewrites
  ids.insrep = await propose(d, 'a', [{ start: 14, end: 14, lines: ['The rota is pinned in the shed each April.'] },
    { start: 14, end: 15, lines: ['Each member waters twice a week from May to September.'] }], 'ins + rep at one line');
  // two places with an untouched line between them
  ids.twosite = await propose(d, 'c', [{ start: 9, end: 10, lines: ['- The day and hour it was made  '] },
    { start: 11, end: 12, lines: ['- What was sown or planted there  '] }], 'two bullets');
  // a clause rewritten and a line added after it
  ids.repins = await propose(d, 'a', [{ start: 18, end: 19, lines: ['Nobody waters in a frost.'] },
    { start: 19, end: 19, lines: ['Taps are lagged from November.'] }], 'rep + ins after');
  // two places far apart
  ids.far = await propose(d, 'c', [{ start: 6, end: 7, lines: ['A plot is ours once the register says so.'] },
    { start: 26, end: 27, lines: ['This charter lapses on 30 November 2026.'] }], 'far apart');
  say('  proposals: ' + JSON.stringify(ids));
  await sleep(5000);
  await audit(R.page, 'patches/reader');
  await R.page.context().close();
});

/* **The sealed record's *Previous text*.**  Two rivals on overlapping runs; the later-numbered one is
   closed early (Q1440: enough of the room prefers the current text to it), so its patch is frozen in
   the line space of that moment; a line is then carried in ABOVE the clause; then the first rival is
   carried.  The record files both under one race, and its *Previous text* must be the lines the
   winner replaced — not those lines and a neighbour. */
await run('record', async () => {
  const d = await found(TEXT, MEMBERS, ['r']);
  const R = await seat(browser, d.links.r, d.slug);
  const X = await propose(d, 'a', [{ start: 22, end: 24, lines: ['**Step 3 — A jury.** Three members drawn by lot hear it and choose the remedy.'] }], 'a jury');
  const Y = await propose(d, 'c', [{ start: 21, end: 23, lines: ['**Step 2 — The bench.** If that fails the whole club hears it at once.'] }], 'skip the witness');
  say('  X=' + X + ' on [22,24) · Y=' + Y + ' on [21,23)');
  // four of seven prefer the current text to Y: with its author for it and two silent, Y can never win
  for (const m of ['founder', 'a', 'e', 'g']) {
    const c = m === 'founder' ? d.founder : d.cookies[m];
    const v = await d.view(c);
    const clause = (v.clauses || []).find((r) => r.candidates.some((k) => k.id === Y));
    if (!clause) break;
    await d.cmd('judge-race', { a: clause.incumbentId, b: Y, outcome: 'a' }, c);
  }
  let gone = false;
  for (let i = 0; i < 40 && !gone; i++) {
    const v = await d.view();
    gone = !(v.clauses || []).some((r) => r.candidates.some((k) => k.id === Y));
    if (!gone) await sleep(3000);
  }
  if (!gone) die('Y was never closed as dominated');
  say('  Y closed early; X still racing');
  // a line carried in above the clause: every key beneath moves down by one
  const Z = await propose(d, 'e', [{ start: 5, end: 5, lines: ['**Thrift.** We mend before we buy.'] }], 'a third value');
  await carry(d, Z, VOTERS);
  await carry(d, X, VOTERS);
  const v = await d.view();
  const rec = (v.records || []).find((x) => (x.field || []).some((f) => f.candidateId === X));
  // the record is the whole field's: Y ran over Step 2 and Step 3, X over Step 3 and the remedies
  const WANT = ['**Step 2 — A witness.** If that fails, a third member listens to both.', '**Step 3 — The bench.** If unresolved, the whole club hears it at the bench.', 'Remedies run from an apology to the loss of a plot for a season.'];
  say('  the host record: field=' + JSON.stringify((rec.field || []).map((f) => [f.candidateId, f.outcome, f.hunks.map((h) => [h.start, h.end])])) +
    ' version=' + rec.version + ' at=' + JSON.stringify(rec.at));
  say('  displaced=' + JSON.stringify(rec.displaced));
  if (norm(rec.displaced.join('')) !== norm(WANT.join(''))) flag('record/host', 'PREVIOUS-TEXT', { displaced: rec.displaced, want: WANT });
  await sleep(6000);
  const seen = await R.page.evaluate(async (raceId) => {
    const S = window.SESSION;
    const it = S.SUGGS.find((g) => g.id === 'rec:' + raceId);
    if (!it) return { none: true, ids: S.SUGGS.map((g) => g.id) };
    S.toggle(it.id, false); await new Promise((res) => setTimeout(res, 1000));
    const card = document.querySelector('.sugg[data-card="' + CSS.escape(it.id) + '"]');
    return { keys: it.keys, replaced: it.replaced, slate: (it.slate || []).map((x) => x.text), card: card ? card.innerText.slice(0, 900) : null };
  }, rec.raceId);
  say('  the record card on the reader page: ' + JSON.stringify(seen).slice(0, 1200));
  if (seen.replaced != null && norm(seen.replaced) !== norm(WANT.join(''))) flag('record/reader', 'PREVIOUS-TEXT', { replaced: seen.replaced, want: WANT });
  await R.page.context().close();
});

/* **The ⚔️ card.**  The host is made to say *deadlocked* on the wire (twenty measured comparisons are
   a long drive; the flag is the whole of what the page is told), and everything else is the page's
   own derivation.  The slate's wordings are readings over the RACE's span; the card they are drawn
   on is keyed, headed and diffed over the judged PAIR's span (Q1407). */
await run('deadlock', async () => {
  const d = await found(TEXT, MEMBERS, ['r']);
  const R = await seat(browser, d.links.r, d.slug);
  const ids = {};
  ids.run8 = await propose(d, 'c', [{ start: 22, end: 24, lines: ['**Step 3 — A jury.** Three members drawn by lot hear it and choose the remedy.'] }], 'a jury');
  ids.run9 = await propose(d, 'a', [{ start: 23, end: 25, lines: ['Remedies run from an apology to a season without a plot, and bind only the two members.'] }], 'one sentence');
  ids.tail = await propose(d, 'e', [{ start: 24, end: 25, lines: ['Decisions bind the two members, and are written in the register.'] }], 'write it down');
  await sleep(5000);
  for (let round = 1; round <= 4; round++) {
    const n = await R.page.evaluate(async () => {
      const api = location.pathname.replace('/d/', '/api/d/');
      const v = await (await fetch(api + '/view')).json();
      const pairs = [...(v.raceCards || []).filter((c) => c.kind === 'edge'), ...(v.clauses || []).map((c) => c.ask).filter(Boolean)];
      let k = 0;
      for (const c of pairs) {
        const r = await fetch(api + '/cmd', { method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ cmd: 'judge-race', args: { a: c.a.id, b: c.b.id, outcome: 'tie' } }) });
        if (r.ok) k++;
      }
      return k;
    });
    if (!n) break;
    await sleep(1500);
  }
  await R.page.route('**/api/d/*/view*', async (route) => {
    // asked without its since-query, so the answer is always a whole view and never the short one
    const resp = await route.fetch({ url: route.request().url().split('?')[0] });
    let j = null; try { j = await resp.json(); } catch { return route.fulfill({ response: resp }); }
    if (j && Array.isArray(j.clauses)) { for (const c of j.clauses) c.deadlocked = true; j.eseq = (j.eseq || 0) + 0.5; }
    return route.fulfill({ response: resp, json: j });
  });
  await sleep(9000);
  const got = await R.page.evaluate(async () => {
    const S = window.SESSION;
    const out = [];
    for (const it of S.SUGGS.filter((g) => g.raceId && g.deadlocked && g.state === 'deciding')) {
      S.toggle(it.id, false); await new Promise((res) => setTimeout(res, 900));
      const card = document.querySelector('.sugg.dead-open');
      const h = card && card.querySelector('.clausehead .rtext');
      out.push({ id: it.id, keys: it.keys, dead: !!card, head: h ? h.textContent.trim() : null,
        field: card ? [...card.querySelectorAll('.field .propblock .rtext')].map((e) => { const k = e.cloneNode(true); k.querySelectorAll('del').forEach((x) => x.remove()); return k.textContent.trim(); }) : null });
    }
    return out;
  });
  const RACE = ['**Step 3 — The bench.** If unresolved, the whole club hears it at the bench.', 'Remedies run from an apology to the loss of a plot for a season.', 'Decisions bind the two members and nobody else.'];
  if (!got.length) flag('deadlock', 'NOTHING-READ', {});
  // …and ✏️ *propose edit* under a wording of the field: the seed is that wording's reading of the
  // whole race, the site it is put on is the card's first block alone
  const slateEdit = await R.page.evaluate(async () => {
    const S = window.SESSION;
    const it = S.SUGGS.find((g) => g.raceId && g.deadlocked && g.state === 'deciding' && (g.keys || []).length === 1);
    if (!it) return null;
    if (S.openId !== it.id) S.toggle(it.id, false);
    await new Promise((res) => setTimeout(res, 900));
    const b = document.querySelector('.sugg.dead-open [data-propose-from]');
    if (!b) return { none: true };
    const from = b.getAttribute('data-propose-from');
    b.click(); await new Promise((res) => setTimeout(res, 1200));
    const dd = S.SUGGS.find((x) => x.id === S.DRAFT_ID);
    return { card: it.id, cardKeys: it.keys, from, draft: dd ? dd.sites.map((x) => ({ keys: x.keys, text: x.text })) : null };
  });
  say('  ⚔️ propose edit: ' + JSON.stringify(slateEdit));
  if (slateEdit && slateEdit.draft && slateEdit.draft[0] && slateEdit.draft[0].text.split(String.fromCharCode(10)).length > slateEdit.draft[0].keys.length) {
    flag('deadlock', 'AIM(⚔️)', { card: slateEdit.card, siteKeys: slateEdit.draft[0].keys, seededLines: slateEdit.draft[0].text.split(String.fromCharCode(10)).length });
  }
  for (const g of got) {
    say('  ⚔️ ' + g.id + ' keys=' + JSON.stringify(g.keys) + ' head=' + JSON.stringify(g.head));
    if (g.dead && norm(g.head) !== norm(RACE.join(''))) flag('deadlock', 'HEAD(⚔️)', { id: g.id, keys: g.keys, head: g.head, field: g.field, want: RACE });
  }
  await R.page.context().close();
});

/* rivals on overlapping runs, one of them carried: its overlapping rival is stranded, the one it
   does not touch is rebased a line up, and the reader has judgments standing on the old race */
await run('overlap', async () => {
  const d = await found(TEXT, MEMBERS, ['b', 'r']);
  const R = await seat(browser, d.links.r, d.slug);
  const B = await seat(browser, d.links.b, d.slug);
  const ids = await shapes(d, B.page);
  ids.tail = await propose(d, 'e', [{ start: 24, end: 25, lines: ['Decisions bind the two members, and are written in the register.'] }], 'write it down');
  await sleep(5000);
  for (let round = 1; round <= 2; round++) {
    const n = await R.page.evaluate(async () => {
      const api = location.pathname.replace('/d/', '/api/d/');
      const v = await (await fetch(api + '/view')).json();
      const pairs = [...(v.raceCards || []).filter((c) => c.kind === 'edge'), ...(v.clauses || []).map((c) => c.ask).filter(Boolean)];
      let k = 0;
      for (const c of pairs) {
        const r = await fetch(api + '/cmd', { method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ cmd: 'judge-race', args: { a: c.a.id, b: c.b.id, outcome: 'tie' } }) });
        if (r.ok) k++;
      }
      return k;
    });
    say('  round ' + round + ': the reader answered ' + n + ' pair(s)');
    await sleep(5000);
  }
  // the reader sits on the run8 card while it is carried from under its rivals
  await R.page.evaluate((cid) => { const S = window.SESSION; const it = S.SUGGS.find((g) => g.raceId && g.card && (g.card.a === cid || g.card.b === cid)); if (it) S.toggle(it.id, false); }, ids.run9);
  await sleep(900);
  for (const k of ['run8', 'merge']) {
    await carry(d, ids[k], VOTERS);
    say('  carried ' + k + '; lines now ' + String((await d.view()).text).split(String.fromCharCode(10)).length);
    await sleep(6000);
    await audit(R.page, 'overlap/after-' + k + '/reader', { edit: false });
    await audit(B.page, 'overlap/after-' + k + '/author', { edit: false });
  }
  await R.page.context().close(); await B.page.context().close();
});

for (const state of ['idle', 'open', 'other']) {
  await run('shift/' + state, async () => {
    const d = await found(TEXT, MEMBERS, ['b', 'r']);
    const R = await seat(browser, d.links.r, d.slug);
    const B = await seat(browser, d.links.b, d.slug);
    const ids = await shapes(d, B.page);
    await sleep(5000);
    const openOn = async (page, cid) => page.evaluate(async (cid) => {
      const S = window.SESSION;
      const it = S.SUGGS.find((g) => g.raceId && ((g.candId === cid) || (g.card && (g.card.a === cid || g.card.b === cid))));
      if (!it) return null;
      S.toggle(it.id, false); await new Promise((res) => setTimeout(res, 900));
      return it.id;
    }, cid);
    if (state === 'open') say('  reader opens the contested run: ' + await openOn(R.page, ids.run8));
    if (state === 'other') say('  reader opens another clause: ' + await openOn(R.page, ids.heading));
    const headNow = () => R.page.evaluate(() => {
      const c = document.querySelector('.sugg.quick-open, .sugg.race-open');
      const h = c && c.querySelector('.clausehead .rtext');
      return c ? { card: c.getAttribute('data-card'), head: h ? h.textContent.trim() : null } : null;
    });
    const before = await headNow();
    // carried ABOVE the live races: the run across the blank (−1 line), then
    // the split (+1) and the deletion (−1) in the middle of the document
    for (const k of ['blank', 'split', 'del']) {
      await carry(d, ids[k], VOTERS);
      say(`  carried ${k}; lines now ${String((await d.view()).text).split('\n').length}`);
      const t0 = Date.now();
      while (Date.now() - t0 < 6000) {
        const h = await headNow();
        if (before && h && h.card === before.card && norm(h.head) !== norm(before.head)) {
          flag('shift/' + state, 'HEAD-MOVED-UNDER-OPEN-CARD', { after: k, was: before.head, now: h.head });
          break;
        }
        await sleep(150);
      }
    }
    await audit(R.page, 'shift/' + state + '/reader');
    await audit(B.page, 'shift/' + state + '/author', { edit: false });
    await R.page.context().close(); await B.page.context().close();
  });
}

await browser.close();
console.log('');
if (bad.length) {
  const by = {};
  for (const b of bad) by[b.what] = (by[b.what] || 0) + 1;
  console.log(`wrong-line-room: ${bad.length} finding(s) — ${JSON.stringify(by)}`);
  process.exit(1);
}
console.log(`wrong-line-room: every card read the clause it is about, and every propose-edit started from and aimed at its lane (${ran.join(', ')})`);
process.exit(0);
