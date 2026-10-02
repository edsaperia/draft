/**
 * edit-unchanged.mjs — issue #193 (Ed, 2026-10-02: *When you are in edit mode, and you haven't
 * changed any of the text, clicking on either 🗑️ or ✏️ should leave edit mode with no action.*)
 *
 * On a live dev-server document at 1600, in three seats — the Founder before 🍾 (the
 * `#proserow`'s ✒️), the Founder after 🍾 and a member after 🍾 (the charter's proposal-row) —
 * 📝 enters edit mode and each commit-row control is pressed with the mouse, as a member
 * presses it, in two states of "nothing changed":
 *
 *   untouched   nothing typed at all
 *   typed back  a character typed into the first clause and taken out again — a site that
 *               survives with its origin's own wording (`draftRowState`'s `changed` false)
 *
 * After each press it asserts: edit mode is left; no command was posted (any POST under
 * /api/d/); the wallet the view serves is the same; no page error.
 *
 * Exit 0 when every press passes, 1 on a finding, 2 on a set-up that never got there.
 *
 *   node scripts/repro/edit-unchanged.mjs [<base-url>]
 */
import { chromium } from 'playwright';
import { assertServerBuild, walkBase } from '../lib/assert-server.mjs';
import { say } from '../lib/walk.mjs';

const BASE = walkBase(process.argv, process.env, 'http://127.0.0.1:8401');
const bail = (why) => { say(`SET-UP · ${why}`); process.exit(2); };
const fails = [];
const check = (what, ok, detail = '') => {
  say(`${ok ? 'PASS · ' : 'FAIL · '}${what}${detail ? ` · ${detail}` : ''}`);
  if (!ok) fails.push(what);
};

await assertServerBuild(BASE, 'edit-unchanged');

const browser = await chromium.launch();
const ladder = async (page, to) => page.evaluate(async (to) => {
  const r = await fetch('/api/dev/ladder', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ to, seed: 193 }) });
  return r.ok ? r.json() : { error: r.status + ' ' + (await r.text()).slice(0, 200) };
}, to);

// one seat on one document: enter edit mode, press `which`, read what happened
async function press(p, slug, me, era, which, typedBack) {
  const posts = [];
  const onReq = (rq) => { if (rq.method() === 'POST' && /\/api\/d\//.test(new URL(rq.url()).pathname)) posts.push(new URL(rq.url()).pathname); };
  // the grants a seat accepts are its browser's (CLAUDE.md, Q1541 stage 3b): accepted here, so
  // the ✏️ wallet and the 📝 door stand for a member as they would after the welcome's OKs
  await p.evaluate(({ slug, me }) => {
    localStorage.setItem('draft:grants:' + slug + ':' + me, JSON.stringify(['canpropose', 'grant-pen', 'grant-shield', 'grant-voice', 'canjudge']));
  }, { slug, me });
  await p.goto(BASE + '/d/' + slug);
  await p.waitForSelector('#ridetab .achip[data-tab="text"]', { timeout: 30_000 }).catch(() => bail(`${era}: no 📝 tab`));
  await p.waitForTimeout(1500);
  const wallet = () => p.evaluate(async (slug) => (await (await fetch('/api/d/' + slug + '/view')).json()).wallet, slug);
  const w0 = await wallet();
  await p.evaluate(() => document.querySelector('#ridetab .achip[data-tab="text"]').click());
  await p.waitForTimeout(500);
  const editing = () => p.evaluate(() => document.getElementById('doc').classList.contains('editing'));
  if (!(await editing())) bail(`${era}: 📝 did not enter edit mode`);
  const row = era === 'before 🍾' ? '#proserow' : '#charter [data-proposalrow]';
  if (typedBack) {
    // the first clause's end, one character, taken out again
    const host = era === 'before 🍾' ? '#prose' : '#charter p[data-key]:not(.hblock)';
    // the caret at the end of the first block's words, put there as a click on them would
    const put = await p.evaluate((host) => {
      const el = document.querySelector(host);
      if (!el) return false;
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT,
        { acceptNode: (n) => n.parentElement.closest('.chipcol, .nocaret') || !n.textContent.trim() ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
      let last = null;
      for (let n = walker.nextNode(); n; n = walker.nextNode()) { last = n; if (host === '#prose') break; }
      if (!last) return false;
      (el.closest('[contenteditable="true"]') || el).focus();
      const r = document.createRange();
      r.setStart(last, last.textContent.length); r.collapse(true);
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
      return true;
    }, host);
    if (!put) bail(`${era}: no clause to type into`);
    await p.keyboard.type('x');
    await p.waitForTimeout(400);
    await p.keyboard.press('Backspace');
    await p.waitForTimeout(600);
  }
  p.on('request', onReq);
  const sel = row + ' [data-act="' + (which === '🗑️' ? 'row-discard' : 'row-commit') + '"]' +
    (which === '✒️' ? '[data-pen]' : which === '✏️' ? ':not([data-pen])' : '');
  const btn = await p.evaluate((sel) => {
    const b = document.querySelector(sel);
    if (!b) return null;
    b.scrollIntoView({ block: 'center' });
    const r = b.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, disabled: b.disabled, title: b.title, until: b.dataset.until || null };
  }, sel);
  if (!btn) { p.off('request', onReq); return { absent: true }; }
  // a hold where the gesture is a hold: down, wait past the hold, up (W16)
  await p.mouse.move(btn.x, btn.y);
  await p.mouse.down();
  await p.waitForTimeout(which === '🗑️' ? 60 : 1400);
  await p.mouse.up();
  await p.waitForTimeout(1200);
  const left = !(await editing());
  const w1 = await wallet();
  p.off('request', onReq);
  // back out, whatever happened, so the next press starts in read mode
  if (!left) await p.evaluate(() => document.querySelector('#ridetab .achip[data-tab="text"]').click());
  return { btn, left, posts, w0, w1 };
}

try {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(BASE + '/');
  const seats = [];
  const ready = await ladder(page, 'ready');
  if (!ready || ready.error || !ready.slug) bail('the ladder did not build `ready`: ' + JSON.stringify(ready).slice(0, 300));
  seats.push({ era: 'before 🍾', who: 'Founder', slug: ready.slug, seat: 'founder', presses: ['🗑️', '✒️'] });
  const live = await ladder(page, 'session');
  if (!live || live.error || !live.slug) bail('the ladder did not build `session`: ' + JSON.stringify(live).slice(0, 300));
  const member = live.seats.find((s) => !s.founder);
  // the Founder who kept ✒️ on the Text: the ladder lays every power down at 🍾, so this one is
  // a `ready` document begun by hand with nothing laid down (`laidDown: []`; omitted, the fold lays the Text's pair down)
  const kept = await ladder(page, 'ready');
  if (!kept || kept.error || !kept.slug) bail('the ladder did not build a second `ready`: ' + JSON.stringify(kept).slice(0, 300));
  const begun = await page.evaluate(async (slug) => {
    await fetch('/api/dev/seat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slug, member: 'founder' }) });
    const r = await fetch('/api/d/' + slug + '/cmd', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ cmd: 'begin', args: { laidDown: [] } }) });
    return r.status + ' ' + (await r.text()).slice(0, 200);
  }, kept.slug);
  if (!/^200/.test(begun)) bail('🍾 with the pen kept: ' + begun);
  seats.push({ era: 'after 🍾', who: 'Founder with ✒️', slug: kept.slug, seat: 'founder', presses: ['🗑️', '✒️', '✏️'] });
  seats.push({ era: 'after 🍾', who: 'Founder', slug: live.slug, seat: 'founder', presses: ['🗑️', '✒️', '✏️'] });
  seats.push({ era: 'after 🍾', who: 'member', slug: live.slug, seat: member.id, presses: ['🗑️', '✏️'] });
  for (const s of seats) {
    const r = await page.evaluate(async ({ slug, member }) => (await fetch('/api/dev/seat', { method: 'POST',
      headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slug, member }) })).status, { slug: s.slug, member: s.seat });
    if (r !== 200) bail(`seat ${s.seat} on ${s.slug}: ${r}`);
    for (const typedBack of [false, true]) {
      for (const which of s.presses) {
        const name = `${s.who} ${s.era} · ${typedBack ? 'typed back' : 'untouched'} · ${which}`;
        const r = await press(page, s.slug, s.seat, s.era, which, typedBack);
        if (r.absent) { say(`SKIP · ${name} · not drawn for this seat`); continue; }
        say(`     ${name} · drawn ${r.btn.disabled ? 'dark' : 'live'}${r.btn.until ? ' (data-until=' + r.btn.until + ')' : ''} · "${r.btn.title}"`);
        check(`${name} · edit mode left`, r.left);
        check(`${name} · no command posted`, !r.posts.length, r.posts.join(', '));
        check(`${name} · wallet unchanged`, r.w0 === r.w1, `${r.w0} → ${r.w1}`);
      }
    }
  }
  check('no page error', !errs.length, errs.slice(0, 2).join(' | '));
} finally {
  await browser.close();
}
say(fails.length ? `✗ ${fails.length} finding(s)` : '✓ #193: with nothing changed, 🗑️ and ✏️ (✒️) leave edit mode and do nothing else');
process.exit(fails.length ? 1 : 0);
