#!/usr/bin/env node
/**
 * stale-key — **does a draft follow its paragraph when the text moves under it?** (Q1463;
 * Ed, 2026-09-18: *follow the paragraph, and refuse if lost*)
 *
 *   node scripts/repro/stale-key.mjs http://127.0.0.1:8208
 *
 * A draft's sites are keyed by engine line (`L8`, a gap `G9`) and the hunks it sends are read
 * off those keys, while the version it sends is read fresh at the press. So an adoption that
 * inserts a line *above* an unproposed draft used to leave the key naming somebody else's
 * clause — and the proposal went out against that one, accepted, because the version was
 * current and the engine's own *targets version N* guard had nothing to fire on.
 *
 * Three documents, one case each, all on a dev server with the founder's pen (which is how an
 * adoption is made to land on demand — `pen-text` passes the instant it is submitted):
 *
 *   follow   a draft on the last clause; one line inserted at index 2. The site must re-key
 *            L8 → L9, and the `propose-text` that goes out must replace the line the origin
 *            wording now stands on — read out of the served text, never assumed.
 *   lost     a draft on the last clause; that clause replaced. The site must be stranded, the
 *            card must say so, and ✏️ must send nothing at all.
 *   gap      a draft in the trailing gap; one line inserted at index 2. The gap must re-key
 *            G9 → G10 and propose as a pure insertion after the clause it was made after.
 *
 * Exit 0 only if all three pass; exit 1 on any failure, 2 on a broken set-up.
 */
import { chromium } from 'playwright';
import { post as postTo, followLink, sleep } from '../lib/walk.mjs';

const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || 'http://127.0.0.1:8208').replace(/\/$/, '');
const ONLY = (argv.find((a) => a.startsWith('--case=')) || '').slice(7);
const say = (s) => console.log(`[${new Date().toTimeString().slice(0, 8)}] ${s}`);
const die = (m) => { console.error(`stale-key: ${m}`); process.exit(2); };

const health = await (await fetch(`${BASE}/healthz`)).json();
if (health.devMail !== true) die(`${BASE} is not a dev server`);
const post = (path, body, cookie) => postTo(BASE, path, body, cookie);

// the last line, the one every case drafts on — line 8 of nine
const LAST = 'Accounts are shown at the annual meeting and may be inspected by any member at any time.';
const TEXT = (run) => [
  `# Stale ${run}`, '## Meetings',
  'The society shall meet on the first Tuesday of every month, in the upstairs room, at seven.',
  'Every meeting opens with the minutes of the last one, read aloud by whoever kept them.',
  'A member who misses three meetings in a row shall be written to, kindly, by the secretary.',
  '## Money',
  'Subscriptions are due in January and are the same for every member, whatever their means.',
  'The treasurer may spend up to fifty pounds without asking; anything more goes to a meeting.',
  LAST,
];

// ---- a document per case, founded with the founder keeping the pen --------
async function found(run) {
  const founderEmail = `founder-${run}@example.org`, testerEmail = `tester-${run}@example.org`;
  const created = await (await post('/api/docs', { title: `Stale ${run}`, email: founderEmail, isMember: true })).json();
  if (!created.ok || !created.devLink) die(`creation refused: ${JSON.stringify(created)}`);
  const slug = created.slug;
  const founder = (await followLink(created.devLink)).cookie;
  const cmd = async (name, args = {}) => {
    const r = await post(`/api/d/${slug}/cmd`, { cmd: name, args }, founder);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) die(`${name} refused (${r.status}): ${JSON.stringify(j)}`);
    return j.result ?? j;
  };
  // the ✒️ decree, always against the version the document is holding now
  const decree = async (hunks, why) => {
    const v = await (await fetch(`${BASE}/api/d/${slug}/view`, { headers: { cookie: founder } })).json();
    return cmd('pen-text', { baseVersion: v.textVersion ?? 0, hunks, why });
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
  await cmd('invite', { email: testerEmail });
  // **an empty `laidDown` keeps every power**, the Text's pen included (SPEC
  // §9.7 rule 8): a Founder who can decree is how an adoption is landed on
  // demand here, rather than by waiting on a room to carry one
  await cmd('begin', { laidDown: [] });
  const tail = await (await fetch(`${BASE}/api/dev/outbox`)).json();
  const mail = (tail.mails ?? []).find((m) => m.to === testerEmail && m.link);
  if (!mail) die('no invitation for the page seat in the dev outbox');
  return { slug, cmd, decree, link: mail.link };
}

const textOf = async (slug, cookie) => {
  const v = await (await fetch(`${BASE}/api/d/${slug}/view`, { headers: { cookie } })).json();
  return String(v.text || '').split('\n');
};

// ---- the page seat --------------------------------------------------------
async function seat(browser, link, slug) {
  const page = await (await browser.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  const errs = [];
  page.on('pageerror', (e) => { errs.push(e.message); say(`pageerror: ${e.message}`); });
  await page.goto(link);
  await page.waitForURL(new RegExp(`/d/${slug}`), { timeout: 20_000 });
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
  await sleep(500);
  return { page, errs };
}

// what the page believes it would send, and what its model holds — read in one
// round trip so nothing between them can move
const model = (page) => page.evaluate(() => {
  const d = window.SESSION.SUGGS.find((x) => x.id === 'draft-yours');
  if (!d) return null;
  const card = document.querySelector('.sugg[data-card="draft-yours"]');
  return {
    stranded: !!d.stranded, refusal: d.refusal || null,
    sites: d.sites.map((s) => ({ keys: s.keys, text: s.text, lost: !!s.lost,
      origin: s.origin.map((o) => o.text), after: s.insertAfterKey ?? null, afterText: s.afterText ?? null })),
    note: card ? [...card.querySelectorAll('.setnote, .refusal')].map((p) => p.textContent.trim()) : null,
    mark: [...document.querySelectorAll('#queue .qitem[data-q="draft-yours"] .mk')].map((m) => m.className),
  };
});

// the ✏️ hold, and every /cmd that leaves while it is pressed
async function pressPropose(page) {
  const sent = [];
  const onResp = async (r) => {
    if (!r.url().endsWith('/cmd')) return;
    sent.push({ status: r.status(), sent: r.request().postData() || '', body: (await r.text().catch(() => '')).slice(0, 200) });
  };
  page.on('response', onResp);
  say('  controls: ' + JSON.stringify(await page.evaluate(() => ({
    openId: window.SESSION.openId, editMode: window.SESSION.editMode, gesture: window.SESSION.gesture,
    wallet: (document.querySelector('#wallet') || {}).textContent,
    btns: [...document.querySelectorAll('[data-act="draft-propose"], [data-act="row-commit"]')].map((b) => ({
      act: b.dataset.act, pen: !!b.dataset.pen, dis: b.disabled, w: Math.round(b.getBoundingClientRect().width),
      where: b.closest('[data-proposalrow]') ? 'row' : 'card' })),
  }))));
  // **the hold is the proposal-row's ✏️** (Q1382), journey's own control
  const btn = page.locator('#charter [data-proposalrow] [data-act="row-commit"]:not([data-pen])').first();
  await btn.scrollIntoViewIfNeeded().catch(() => {});
  const box = await btn.boundingBox().catch(() => null);
  if (!box) { page.off('response', onResp); return { sent, pressed: false }; }
  // **the commit gesture is a setting** (SURFACE §7.2): a click on one build,
  // a hold on the other, and a hold against a click page commits nothing
  const held = await page.evaluate(() => window.SESSION.gesture === 'hold');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  if (held) { await page.mouse.down(); await sleep(1600); await page.mouse.up(); }
  else await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await sleep(2500);
  page.off('response', onResp);
  return { sent, pressed: true };
}
const proposals = (sent) => sent.filter((c) => /"propose-text"/.test(c.sent))
  .map((c) => { try { return { args: JSON.parse(c.sent).args, status: c.status }; } catch { return null; } }).filter(Boolean);

// type into a clause: the caret at its very end, then the words
async function typeInto(page, page_text, words) {
  const clause = page.locator('#charter .anch, #charter [data-key]').filter({ hasText: page_text }).first();
  await clause.click();
  await clause.evaluate((el) => { const r = document.createRange(); r.selectNodeContents(el); r.collapse(false);
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); });
  await page.keyboard.type(words, { delay: 30 });
  await sleep(600);
}

const fails = [];
const check = (name, ok, detail) => { say(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); if (!ok) fails.push(name); };
const browser = await chromium.launch();

/* ======================================================================== *
 * 1 · follow — a line inserted above must carry the draft with it
 * ======================================================================== */
if (!ONLY || ONLY === 'follow') {
  say('case follow: a draft on the last clause, one line adopted above it');
  const run = 'f' + Date.now().toString(36);
  const { slug, decree, link } = await found(run);
  const { page } = await seat(browser, link, slug);
  await typeInto(page, 'Accounts are shown', ' And on the noticeboard.');
  const before = await model(page);
  say('  drafted: ' + JSON.stringify(before.sites.map((s) => s.keys)));
  check('the draft starts on the last clause', before.sites.length === 1 && before.sites[0].keys[0] === 'L8',
    JSON.stringify(before.sites[0] && before.sites[0].keys));

  // the adoption: one line into the middle of the Meetings section
  await decree([{ start: 2, end: 2,
    lines: ['Notice of every meeting goes up a week before it, on the board by the door.'] }], 'notice');
  say('  one line inserted at index 2 by the Founder’s pen');
  await sleep(9_000);                          // two turns of the 4s poll

  const after = await model(page);
  const cookie = 'unused';
  say('  after: ' + JSON.stringify(after.sites.map((s) => ({ keys: s.keys, lost: s.lost }))));
  check('the site follows its paragraph', after.sites[0].keys[0] === 'L9', 'key ' + after.sites[0].keys[0]);
  check('nothing is stranded', !after.stranded && !after.sites[0].lost);
  check('the words are untouched', after.sites[0].text.endsWith('And on the noticeboard.'));

  const { sent, pressed } = await pressPropose(page);
  const out = proposals(sent);
  say('  pressed: ' + pressed + ' · ' + JSON.stringify(sent.map((c) => c.status + ' ' + c.sent.slice(0, 60))) +
    ' · after the press ' + JSON.stringify(await model(page)));
  check('✏️ sent a proposal', pressed && out.length === 1 && out[0].status === 200,
    JSON.stringify(sent.map((c) => c.status + ' ' + c.sent.slice(0, 80))));
  if (out.length) {
    const lines = await textOf(slug, (await page.context().cookies()).map((c) => `${c.name}=${c.value}`).join('; '));
    const want = lines.indexOf(LAST);
    const h = out[0].args.hunks[0];
    check('it replaces the line the origin wording is on now',
      want >= 0 && h.start === want && h.end === want + 1, `origin at ${want}, hunk [${h.start}, ${h.end})`);
  }
  void cookie;
  await page.context().close();
}

/* ======================================================================== *
 * 2 · lost — the paragraph itself replaced: stranded, and nothing sent
 * ======================================================================== */
if (!ONLY || ONLY === 'lost') {
  say('case lost: the drafted clause replaced under the draft');
  const run = 'l' + Date.now().toString(36);
  const { slug, decree, link } = await found(run);
  const { page } = await seat(browser, link, slug);
  await typeInto(page, 'Accounts are shown', ' And on the noticeboard.');
  const before = await model(page);
  check('the draft starts on the last clause', before.sites[0].keys[0] === 'L8');

  await decree([{ start: 8, end: 9,
    lines: ['The books are open to any member who asks the treasurer for them.'] }], 'plainer');
  say('  the drafted clause itself replaced by the Founder’s pen');
  await sleep(9_000);

  const after = await model(page);
  say('  after: ' + JSON.stringify({ stranded: after.stranded, lost: after.sites.map((s) => s.lost), note: after.note }));
  check('the site is lost', after.sites[0].lost === true);
  check('the draft is stranded', after.stranded === true);
  check('the words are kept', after.sites[0].text.endsWith('And on the noticeboard.'));
  check('the card says what happened',
    (after.note || []).some((n) => /could not be carried across/.test(n)), JSON.stringify(after.note));

  const { sent } = await pressPropose(page);
  check('✏️ sent nothing', proposals(sent).length === 0, JSON.stringify(sent.map((c) => c.sent.slice(0, 80))));
  const said = await model(page);
  check('and said why on the card', /moved while you were writing/.test(String(said && said.refusal)), JSON.stringify(said && said.refusal));
  await page.context().close();
}

/* ======================================================================== *
 * 3 · gap — a new clause in the trailing gap, a line inserted above it
 * ======================================================================== */
if (!ONLY || ONLY === 'gap') {
  say('case gap: a draft in the trailing gap, one line adopted above it');
  const run = 'g' + Date.now().toString(36);
  const { slug, decree, link } = await found(run);
  const { page } = await seat(browser, link, slug);
  // the trailing gap is a real paragraph in edit mode (`blocksOf`'s `G<nLines>`)
  const gap = page.locator('#charter [data-key^="G"]').first();
  if (!(await gap.count())) die('no trailing gap paragraph in edit mode');
  await gap.click();
  await page.keyboard.type('This is a pluralist, pan-political space.', { delay: 30 });
  await sleep(600);
  const before = await model(page);
  say('  drafted: ' + JSON.stringify(before.sites.map((s) => ({ keys: s.keys, after: s.after }))));
  check('the draft starts in the gap after the last clause',
    before.sites.length === 1 && before.sites[0].keys[0] === 'G9' && before.sites[0].after === 'L8',
    JSON.stringify(before.sites[0] && { k: before.sites[0].keys, a: before.sites[0].after }));

  await decree([{ start: 2, end: 2,
    lines: ['Notice of every meeting goes up a week before it, on the board by the door.'] }], 'notice');
  say('  one line inserted at index 2 by the Founder’s pen');
  await sleep(9_000);

  const after = await model(page);
  say('  after: ' + JSON.stringify(after.sites.map((s) => ({ keys: s.keys, after: s.after, lost: s.lost }))));
  check('the gap follows the clause it sits after',
    after.sites[0].keys[0] === 'G10' && after.sites[0].after === 'L9',
    JSON.stringify({ k: after.sites[0].keys, a: after.sites[0].after }));
  check('nothing is stranded', !after.stranded && !after.sites[0].lost);

  const { sent, pressed } = await pressPropose(page);
  const out = proposals(sent);
  check('✏️ sent a proposal', pressed && out.length === 1 && out[0].status === 200,
    JSON.stringify(sent.map((c) => c.status + ' ' + c.sent.slice(0, 80))));
  if (out.length) {
    const lines = await textOf(slug, (await page.context().cookies()).map((c) => `${c.name}=${c.value}`).join('; '));
    const want = lines.indexOf(LAST);
    const h = out[0].args.hunks[0];
    check('it inserts straight after the clause it was made after',
      want >= 0 && h.start === h.end && h.start === want + 1, `origin at ${want}, hunk [${h.start}, ${h.end})`);
  }
  await page.context().close();
}

await browser.close();
say(fails.length ? `FAILED: ${fails.join(' · ')}` : 'all cases pass');
process.exit(fails.length ? 1 : 0);
