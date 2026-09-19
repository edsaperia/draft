#!/usr/bin/env node
/**
 * untouched-place — **does a draft send only the places it says it changed?** (issue #43's
 * page half; Q1479 (b), Ed 2026-09-19)
 *
 *   node scripts/repro/untouched-place.mjs http://127.0.0.1:8360
 *
 * **Asserting**, like `admit-keep.mjs` and `closed-unacked.mjs`: exit 1 on the defect, 2 on a
 * set-up that never got there.
 *
 * An untouched place in a draft survives on purpose (Q1382: a site whose text has come back
 * to its origin keeps its card). `draftRowState` counts only the places that *changed*, so
 * the row beside the draft says **1 place changed** — and `hunksOf` sent every site the draft
 * held. A member who typed into two paragraphs and put one back proposed both: the untouched
 * clause joined the candidate's footprint, the candidate was unioned into whatever race was
 * running on that clause, and an adoption either way stranded the other author over a change
 * nobody had made.
 *
 * Four cases, each on its own document, the Founder keeping the Text's pen so the ✒️ road can
 * be walked on the last one. Each holds **two** sites, so the filter is exercised and not
 * merely bypassed; the two clauses are deliberately not adjacent, since neighbours merge into
 * one run (`addDraftSite`) and there would be nothing to filter.
 *
 *   two-places  clause A really changed, clause B typed into and put back. The row says one
 *               place, and exactly one hunk goes over the wire — A's, carrying A's own `was`.
 *               Read off the `propose-text` request itself, then off the next view: one hunk
 *               in the candidate's patch, and a footprint that does not cover B's line.
 *   deletion    clause B emptied, clause A typed into and put back. Q1415's deletion must
 *               survive the filter: one hunk, `lines: []`, on B's span.
 *   gap         a sentence typed into the trailing gap, clause A typed into and put back. A
 *               pure insertion (`start === end`) after the last clause, and nothing else.
 *   pen         the Founder's own page and the ✒️ road: the same two-place draft, one place
 *               put back, sends one hunk as `pen-text`.
 *
 * Red on the pre-fix page at *exactly one hunk goes out* in all four: `d.sites.map` sent the
 * untouched site too, an empty gap site as one blank line.
 */
import { chromium } from 'playwright';
import { post as postTo, followLink, sleep } from '../lib/walk.mjs';
import { assertServerBuild, walkBase } from '../lib/assert-server.mjs';

const argv = process.argv.slice(2);
const BASE = walkBase(argv, process.env, 'http://127.0.0.1:8360');
const ONLY = (argv.find((a) => a.startsWith('--case=')) || '').slice(7);
const say = (s) => console.log(`[${new Date().toTimeString().slice(0, 8)}] ${s}`);
const die = (m) => { console.error(`untouched-place: ${m}`); process.exit(2); };

await assertServerBuild(BASE, 'untouched-place');
const post = (path, body, cookie) => postTo(BASE, path, body, cookie);

// the two clauses every case drafts on, one in each section so they never merge
// into one run — `addDraftSite` joins adjacent blocks, and a run is one place
const A = 'The society shall meet on the first Tuesday of every month, in the upstairs room, at seven.';
const B = 'Accounts are shown at the annual meeting and may be inspected by any member at any time.';
const TEXT = (run) => [
  `# Untouched ${run}`,                                                                        // 0
  '## Meetings',                                                                               // 1
  A,                                                                                           // 2
  'A member who misses three meetings in a row shall be written to, kindly, by the secretary.', // 3
  '## Money',                                                                                  // 4
  'Subscriptions are due in January and are the same for every member, whatever their means.',  // 5
  B,                                                                                           // 6
];

// ---- a document per case, the Founder keeping every power ------------------
async function found(run) {
  const founderEmail = `founder-${run}@example.org`, memberEmail = `member-${run}@example.org`;
  const created = await (await post('/api/docs', { title: `Untouched ${run}`, email: founderEmail, isMember: true })).json();
  if (!created.ok || !created.devLink) die(`creation refused: ${JSON.stringify(created)}`);
  const slug = created.slug;
  const founder = (await followLink(created.devLink)).cookie;
  const cmd = async (name, args = {}, cookie = founder) => {
    const r = await post(`/api/d/${slug}/cmd`, { cmd: name, args }, cookie);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) die(`${name} refused (${r.status}): ${JSON.stringify(j)}`);
    return j.result ?? j;
  };
  await cmd('confirm-starting-text', { text: TEXT(run).join('\n') });
  await cmd('set-convenor-membership', { isMember: true });
  for (const [setting, value] of Object.entries({
    rate: { grant: 5, cap: 8, dripMinutes: 1 }, pace: { shape: 'fixed' }, quorum: { form: 'share', n: 30 },
    authorship: { rung: 'sealedElective' }, judgments: { rung: 'after' }, applications: { apply: false },
    admission: { price: 'pen' }, removal: { price: 'proposal' }, machines: { enabled: false, budget: 0 },
    lapse: { afterMs: 5 * 60_000 }, ending: { endsAtMs: Date.now() + 6 * 3_600_000 }, bar: { pct: 50 },
    chamber: { rung: 'link' },
  })) {
    await (await post(`/api/d/${slug}/cmd`, { cmd: 'reclaim', args: { setting } }, founder)).text();
    await cmd('set-setting', { setting, value });
  }
  await cmd('invite', { email: memberEmail });
  // **an empty `laidDown` keeps every power**, the Text's pen included (SPEC §9.7 rule 8):
  // the ✒️ road is a case here, and the Founder is the only seat that has one
  await cmd('begin', { laidDown: [] });
  const tail = await (await fetch(`${BASE}/api/dev/outbox`)).json();
  const mail = (tail.mails ?? []).find((m) => m.to === memberEmail && m.link);
  if (!mail) die('no invitation for the page seat in the dev outbox');
  const member = (await followLink(mail.link)).cookie;
  return { slug, cmd, founder, member };
}

const view = async (slug, cookie) =>
  (await fetch(`${BASE}/api/d/${slug}/view`, { headers: { cookie } })).json();
const linesOf = async (slug, cookie) => String((await view(slug, cookie)).text || '').split('\n');

// ---- the page seat, in edit mode, every grant already acknowledged --------
async function seat(browser, cookie, slug) {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const [n, ...rest] = cookie.split('=');
  await ctx.addCookies([{ name: n, value: rest.join('='), url: BASE }]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => say(`pageerror: ${e.message}`));
  await page.goto(`${BASE}/d/${slug}`);
  await page.waitForSelector('#charter', { timeout: 20_000 });
  await sleep(1200);
  // the grants' OKs live in localStorage, one key per document and seat
  await page.evaluate(() => fetch(location.pathname.replace('/d/', '/api/d/') + '/view').then((r) => r.json())
    .then((v) => localStorage.setItem('draft:grants:' + location.pathname.split('/')[2] + ':' + (v.me || ''),
      JSON.stringify(['canpropose', 'grant-pen', 'grant-shield', 'grant-voice', 'canjudge']))));
  await page.reload();
  await page.waitForSelector('#charter', { timeout: 20_000 });
  await sleep(1200);
  // the floating 📝 hides while the resting 📝 tab is below it (Q1380), so the
  // reader is put past the tab before the door is pressed
  await page.evaluate(() => { const c = document.querySelector('#ridetab .achip[data-tab="text"]');
    if (c) { c.scrollIntoView({ block: 'start' }); window.scrollBy(0, -200); } });
  await sleep(300);
  await page.click('#editdoor [data-act="edit-door"]');
  await sleep(600);
  return page;
}

// what the draft holds, and what the row says about it
const model = (page) => page.evaluate(() => {
  const d = (window.SESSION.SUGGS || []).find((x) => x.id === 'draft-yours');
  const row = document.querySelector('#charter [data-proposalrow] .rowmid');
  return {
    sites: d ? d.sites.map((s) => ({ keys: s.keys, text: s.text,
      origin: (s.origin || []).map((o) => o.text) })) : [],
    rowmid: row ? row.textContent.trim() : null,
  };
});

// the caret at a clause's very end, then the words
async function typeAtEnd(page, match, words) {
  const clause = page.locator('#charter .anch, #charter [data-key]').filter({ hasText: match }).first();
  await clause.click();
  await clause.evaluate((el) => { const r = document.createRange(); r.selectNodeContents(el); r.collapse(false);
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); });
  if (words) await page.keyboard.type(words, { delay: 30 });
  await sleep(600);
}
// **the site that survives**: a character typed in and taken straight out again,
// which leaves the site standing with its origin's own wording (Q1382)
async function touchAndRestore(page, match) {
  await typeAtEnd(page, match, 'x');
  await page.keyboard.press('Backspace');
  await sleep(600);
}
// a clause emptied: its whole contents selected and deleted (Q1415's deletion)
async function emptyClause(page, match) {
  const clause = page.locator('#charter .anch, #charter [data-key]').filter({ hasText: match }).first();
  await clause.click();
  await clause.evaluate((el) => { const r = document.createRange(); r.selectNodeContents(el);
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); });
  await page.keyboard.press('Backspace');
  await sleep(600);
}

// the row's commit, and every /cmd that leaves while it is pressed
async function pressRow(page, { pen = false } = {}) {
  const sent = [];
  const onResp = async (r) => {
    if (!r.url().endsWith('/cmd')) return;
    sent.push({ status: r.status(), sent: r.request().postData() || '' });
  };
  page.on('response', onResp);
  const sel = '#charter [data-proposalrow] [data-act="row-commit"]' + (pen ? '[data-pen]' : ':not([data-pen])');
  const btn = page.locator(sel).first();
  await btn.scrollIntoViewIfNeeded().catch(() => {});
  const box = await btn.boundingBox().catch(() => null);
  if (!box) { page.off('response', onResp); return { sent, pressed: false }; }
  // **the commit gesture is a setting** (SURFACE §7.2): a click on one build, a
  // hold on the other, and a hold against a click page commits nothing
  const held = await page.evaluate(() => window.SESSION.gesture === 'hold');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  if (held) { await page.mouse.down(); await sleep(1600); await page.mouse.up(); }
  else await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await sleep(2500);
  page.off('response', onResp);
  return { sent, pressed: true };
}
const cmdsOf = (sent, name) => sent.filter((c) => new RegExp(`"${name}"`).test(c.sent))
  .map((c) => { try { return { args: JSON.parse(c.sent).args, status: c.status }; } catch { return null; } })
  .filter(Boolean);

const fails = [];
const check = (name, ok, detail) => { say(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); if (!ok) fails.push(name); };
const browser = await chromium.launch();

/* ======================================================================== *
 * 1 · two-places — one clause changed, one put back: one hunk goes out
 * ======================================================================== */
if (!ONLY || ONLY === 'two-places') {
  say('case two-places: clause A changed, clause B typed into and put back');
  const run = 't' + Date.now().toString(36);
  const { slug, member } = await found(run);
  const page = await seat(browser, member, slug);
  await typeAtEnd(page, 'The society shall meet', ' Tea is provided.');
  await touchAndRestore(page, 'Accounts are shown');

  const m = await model(page);
  say('  draft: ' + JSON.stringify(m.sites.map((s) => ({ k: s.keys, t: s.text.slice(-28) }))) + ' · row ' + JSON.stringify(m.rowmid));
  // **the premise**: both sites stand, and the one put back is back
  check('the draft holds two places', m.sites.length === 2, JSON.stringify(m.sites.map((s) => s.keys)));
  const back = m.sites.find((s) => s.keys[0] === 'L6');
  check('the second place is back to its own wording', !!back && back.text === back.origin.join('\n'),
    JSON.stringify(back && { text: back.text.slice(-30), origin: back.origin.join('\n').slice(-30) }));
  check('the row counts one place changed', m.rowmid === '1 place changed', JSON.stringify(m.rowmid));

  const { sent, pressed } = await pressRow(page);
  const out = cmdsOf(sent, 'propose-text');
  say('  sent: ' + JSON.stringify(sent.map((c) => c.status + ' ' + c.sent.slice(0, 60))));
  check('✏️ sent a proposal, and the host took it', pressed && out.length === 1 && out[0].status === 200,
    JSON.stringify(sent.map((c) => c.status + ' ' + c.sent.slice(0, 90))));
  if (out.length) {
    const lines = await linesOf(slug, member);
    const iA = lines.indexOf(A), iB = lines.indexOf(B);
    const hs = out[0].args.hunks || [];
    // **the assertion**: what the row counts is what goes out
    check('exactly one hunk goes over the wire', hs.length === 1, JSON.stringify(hs));
    if (hs.length) {
      check('and it is the clause that changed', hs[0].start === iA && hs[0].end === iA + 1 &&
        String(hs[0].lines[0]).endsWith('Tea is provided.') && (hs[0].was || [])[0] === A,
        JSON.stringify({ at: [hs[0].start, hs[0].end], want: iA, lines: hs[0].lines, was: hs[0].was }));
      check('no hunk touches the place that was put back',
        !hs.some((h) => h.start <= iB && iB < h.end), JSON.stringify({ iB, hs: hs.map((h) => [h.start, h.end]) }));
    }
    // and the same, one step later: the candidate the host actually minted
    await sleep(1200);
    const v = await view(slug, member);
    const live = (v.mine || []).find((x) => x.state === 'live') || (v.mine || [])[0];
    const fp = (live && live.footprint) || [];
    say('  candidate: ' + JSON.stringify({ state: live && live.state, footprint: fp,
      hunks: live && live.patch && live.patch.hunks.map((h) => [h.start, h.end]) }));
    check('the candidate carries one hunk', !!live && (live.patch.hunks || []).length === 1,
      JSON.stringify(live && live.patch && live.patch.hunks));
    check('and its race does not cover the untouched clause',
      fp.length > 0 && !fp.some((s) => s.start <= iB && iB < s.end), JSON.stringify({ iB, fp }));
  }
  await page.context().close();
}

/* ======================================================================== *
 * 2 · deletion — an emptied site is still a deletion (Q1415)
 * ======================================================================== */
if (!ONLY || ONLY === 'deletion') {
  say('case deletion: clause B emptied, clause A typed into and put back');
  const run = 'd' + Date.now().toString(36);
  const { slug, member } = await found(run);
  const page = await seat(browser, member, slug);
  await emptyClause(page, 'Accounts are shown');
  await touchAndRestore(page, 'The society shall meet');

  const m = await model(page);
  say('  draft: ' + JSON.stringify(m.sites.map((s) => ({ k: s.keys, t: s.text }))) + ' · row ' + JSON.stringify(m.rowmid));
  check('the draft holds two places', m.sites.length === 2, JSON.stringify(m.sites.map((s) => s.keys)));
  const gone = m.sites.find((s) => s.keys[0] === 'L6');
  check('the emptied place is empty', !!gone && !String(gone.text).trim(), JSON.stringify(gone && gone.text));

  const { sent, pressed } = await pressRow(page);
  const out = cmdsOf(sent, 'propose-text');
  say('  sent: ' + JSON.stringify(sent.map((c) => c.status + ' ' + c.sent.slice(0, 60))));
  check('✏️ sent a proposal, and the host took it', pressed && out.length === 1 && out[0].status === 200,
    JSON.stringify(sent.map((c) => c.status + ' ' + c.sent.slice(0, 90))));
  if (out.length) {
    const lines = await linesOf(slug, member);
    const iB = lines.indexOf(B);
    const hs = out[0].args.hunks || [];
    check('exactly one hunk goes over the wire', hs.length === 1, JSON.stringify(hs));
    // **the filter must not swallow a deletion**: an emptied site differs from
    // its origin, so it is a place that changed
    check('and it is the deletion', hs.length === 1 && hs[0].start === iB && hs[0].end === iB + 1 &&
      Array.isArray(hs[0].lines) && hs[0].lines.length === 0,
      JSON.stringify({ want: iB, hunk: hs[0] }));
    await sleep(1200);
    const v = await view(slug, member);
    const live = (v.mine || []).find((x) => x.state === 'live') || (v.mine || [])[0];
    check('the candidate carries the deletion alone',
      !!live && (live.patch.hunks || []).length === 1 && (live.patch.hunks[0].lines || []).length === 0,
      JSON.stringify(live && live.patch && live.patch.hunks));
  }
  await page.context().close();
}

/* ======================================================================== *
 * 3 · gap — a gap with words in it is still a pure insertion
 * ======================================================================== */
if (!ONLY || ONLY === 'gap') {
  say('case gap: a sentence in the trailing gap, clause A typed into and put back');
  const run = 'g' + Date.now().toString(36);
  const { slug, member } = await found(run);
  const page = await seat(browser, member, slug);
  const gap = page.locator('#charter [data-key^="G"]').first();
  if (!(await gap.count())) die('no trailing gap paragraph in edit mode');
  await gap.click();
  await page.keyboard.type('The society keeps a noticeboard by the door.', { delay: 30 });
  await sleep(600);
  await touchAndRestore(page, 'The society shall meet');

  const m = await model(page);
  say('  draft: ' + JSON.stringify(m.sites.map((s) => ({ k: s.keys, t: s.text.slice(0, 30) }))) + ' · row ' + JSON.stringify(m.rowmid));
  check('the draft holds two places', m.sites.length === 2, JSON.stringify(m.sites.map((s) => s.keys)));
  check('the row counts one place changed', m.rowmid === '1 place changed', JSON.stringify(m.rowmid));

  const { sent, pressed } = await pressRow(page);
  const out = cmdsOf(sent, 'propose-text');
  say('  sent: ' + JSON.stringify(sent.map((c) => c.status + ' ' + c.sent.slice(0, 60))));
  check('✏️ sent a proposal, and the host took it', pressed && out.length === 1 && out[0].status === 200,
    JSON.stringify(sent.map((c) => c.status + ' ' + c.sent.slice(0, 90))));
  if (out.length) {
    const lines = await linesOf(slug, member);
    const iB = lines.indexOf(B);
    const hs = out[0].args.hunks || [];
    check('exactly one hunk goes over the wire', hs.length === 1, JSON.stringify(hs));
    check('and it is a pure insertion after the last clause',
      hs.length === 1 && hs[0].start === hs[0].end && hs[0].start === iB + 1 &&
      String(hs[0].lines[0]).startsWith('The society keeps a noticeboard') && hs[0].after === B,
      JSON.stringify(hs[0]));
  }
  await page.context().close();
}

/* ======================================================================== *
 * 4 · pen — the Founder's ✒️ road takes the same filter
 * ======================================================================== */
if (!ONLY || ONLY === 'pen') {
  say('case pen: the Founder’s own page, clause A changed and clause B put back');
  const run = 'p' + Date.now().toString(36);
  const { slug, founder } = await found(run);
  const page = await seat(browser, founder, slug);
  await typeAtEnd(page, 'The society shall meet', ' Tea is provided.');
  await touchAndRestore(page, 'Accounts are shown');

  const m = await model(page);
  say('  draft: ' + JSON.stringify(m.sites.map((s) => s.keys)) + ' · row ' + JSON.stringify(m.rowmid));
  check('the draft holds two places', m.sites.length === 2, JSON.stringify(m.sites.map((s) => s.keys)));

  const { sent, pressed } = await pressRow(page, { pen: true });
  const out = cmdsOf(sent, 'pen-text');
  say('  sent: ' + JSON.stringify(sent.map((c) => c.status + ' ' + c.sent.slice(0, 60))));
  check('✒️ decreed, and the host took it', pressed && out.length === 1 && out[0].status === 200,
    JSON.stringify(sent.map((c) => c.status + ' ' + c.sent.slice(0, 90))));
  if (out.length) {
    const before = TEXT(run);
    const iA = before.indexOf(A), iB = before.indexOf(B);
    const hs = out[0].args.hunks || [];
    check('exactly one hunk goes over the wire', hs.length === 1, JSON.stringify(hs));
    check('and it is the clause that changed',
      hs.length === 1 && hs[0].start === iA && hs[0].end === iA + 1 &&
      String(hs[0].lines[0]).endsWith('Tea is provided.'), JSON.stringify(hs[0]));
    // the decree passes the instant it is submitted, so the document itself says it
    await sleep(1200);
    const lines = await linesOf(slug, founder);
    check('the document carries the change, and the other clause is untouched',
      String(lines[iA]).endsWith('Tea is provided.') && lines[iB] === B,
      JSON.stringify({ a: lines[iA], b: lines[iB] }));
  }
  await page.context().close();
}

await browser.close();
say(fails.length ? `FAILED: ${fails.join(' · ')}` : 'all cases pass');
process.exit(fails.length ? 1 : 0);
