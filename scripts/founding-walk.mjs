/**
 * A founder's walk, from a blank arrival to a settled constitution.
 *
 * Drives design/session-view.html headless: the birth (title, link, email and
 * the magic link), then every task the rail offers, one at a time — opening
 * each, recording what it says, choosing an answer and committing it. What it
 * prints is the founder's own sequence: the order tasks arrive, the sentence
 * each clause carries, and every string on the card. That is the material a
 * STYLE.md audit reads.
 *
 *   node scripts/founding-walk.mjs            # the walk
 *   node scripts/founding-walk.mjs --json     # the same, as data
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const DESIGN = join(resolve(fileURLToPath(new URL('..', import.meta.url))), 'design');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const AS_JSON = process.argv.includes('--json');
/**
 * `--delegate=<key>` hands one setting to the membership instead of answering
 * it, and then asserts the founder is served **their own** question before
 * 🍾 (Q645). It has to be its own mode, because the ordinary walk can never
 * reach the case: with the founder alone on the roster `roomExists()` is
 * false, so the founder's answer tasks depend entirely on Q408's *unless
 * nothing else is outstanding* — which 🍾 made unreachable by counting itself
 * as outstanding. It cannot ride `journey-walk.mjs` either, and for a reason
 * worth keeping: a delegated question never resolves on one voice (Q413), so
 * `begin` refuses and the live journey would correctly stall short of a begun
 * document. What it checks is pure page logic, identical in the fixture and
 * live, so the fixture is an honest place to check it.
 */
const DELEGATE = (process.argv.find((a) => a.startsWith('--delegate')) || '')
  .split('=')[1] || (process.argv.includes('--delegate') ? 'chamber' : null);

const srv = createServer(async (req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  try {
    const buf = await readFile(join(DESIGN, p === '/' ? '/session-view.html' : p));
    res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'text/plain' });
    res.end(buf);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => srv.listen(0, r));
const base = 'http://127.0.0.1:' + srv.address().port;

const browser = await chromium.launch();
// **The walk pins its locale** (Q628 (a), 2026-08-22). The page dates the
// Founded line with the *reader's* own locale, so this machine renders
// "22 August 2026" and a CI runner renders "August 22, 2026" — and the
// golden's mask matches one form, so the guard failed every push from CI and
// passed every run here, which is the worst shape a check can have. Pinning
// it makes the golden record one deterministic string, and a real change to
// the date's copy still shows as a diff. It deliberately does **not** pin the
// locale in the page: what every member reads is a product question, open as
// Q628 (c).
const page = await browser.newPage({ locale: 'en-GB', timezoneId: 'Europe/London',
  viewport: { width: 1600, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(base + '/session-view.html');
await page.waitForTimeout(400);

const snap = () => page.evaluate(() => {
  const txt = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : null);
  const rail = [...document.querySelectorAll('#rail li')].map((li) => ({
    k: li.dataset.q || (li.querySelector('[data-card]') || {dataset:{}}).dataset.card || null,
    title: txt(li.querySelector('.qt')),
    sub: txt(li.querySelector('.qwhy')),
    all: txt(li),
  }));
  const paras = [...document.querySelectorAll('#band .cpara')].map((p) => ({
    k: p.dataset.para || (p.querySelector('[data-tab]') || { dataset: {} }).dataset.tab || '?',
    text: txt(p.querySelector('.cpv')),
  })).filter((p) => p.text);
  const c = document.querySelector('.setupcard');
  const card = c ? {
    eyebrow: txt(c.querySelector('.headlab')),
    head: txt(c.querySelector('.headrule, .headtitle')),
    lock: txt(c.querySelector('.lockline')),
    body: txt(c.querySelector('.field')),
    options: [...c.querySelectorAll('[data-set],[data-ans]')].map((el) => ({
      set: el.dataset.set || el.dataset.ans || null,
      val: el.dataset.val || el.dataset.ansval || null,
      on: el.classList.contains('on') || el.getAttribute('aria-checked') === 'true',
      label: txt(el),
    })),
    inputs: [...c.querySelectorAll('input,textarea')].map((i) => ({
      type: i.type || 'text', value: i.value, ph: i.placeholder || null,
    })),
    foot: [...c.querySelectorAll('.commitrow button, .race-mid button')].map((b) => ({
      label: txt(b) || b.title, title: b.title || null, disabled: b.disabled,
    })),
  } : null;
  return { rail, paras, card, title: txt(document.querySelector('.doctitle')) };
});

const openCard = async (k) => {
  const ok = await page.evaluate((kk) => {
    const sel = '[data-card="' + kk + '"], [data-tab="' + kk + '"]';
    const el = document.querySelector('#rail ' + sel) || document.querySelector('#band ' + sel);
    if (!el) return false;
    el.click();
    return true;
  }, k);
  await page.waitForTimeout(320);
  return ok;
};
const clickIn = async (sel) => {
  const ok = await page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el || el.disabled) return false;
    el.click();
    return true;
  }, sel);
  await page.waitForTimeout(280);
  return ok;
};
const typeIn = async (sel, v) => {
  const ok = await page.evaluate((a) => {
    const el = document.querySelector(a[0]);
    if (!el) return false;
    if (el.isContentEditable) {
      el.textContent = a[1];
      el.dispatchEvent(new InputEvent('input', { bubbles: true }));
    } else {
      el.value = a[1];
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
    return true;
  }, [sel, v]);
  await page.waitForTimeout(260);
  return ok;
};

/**
 * **A power laid down before the start takes effect at 🍾** (R-048), and this
 * is the walk that can see both halves of that: the founder releases 👥's pen
 * the moment the setting has a value, and the surface has to say *released,
 * from the start* while still handing them the pen they are holding until the
 * press. The pen wallet's own count is the witness for the second half —
 * unchanged by the release, one lower after 🍾 — because a page that says
 * *may not amend this at will* while the tooltip still counts the setting
 * would be telling the founder two different things about one hand.
 */
const clauseText = (k) => page.evaluate((kk) => {
  const p = [...document.querySelectorAll('#band .cpara')].find((el) =>
    (el.dataset.para || (el.querySelector('[data-tab]') || { dataset: {} }).dataset.tab) === kk);
  const v = p && p.querySelector('.cpv');
  return v ? v.textContent.replace(/\s+/g, ' ').trim() : null;
}, k);
const penCount = async () => {
  const t = await page.evaluate(() => {
    const el = document.querySelector('#penwallet');
    return el ? el.title || '' : '';
  });
  const m = /\b(\d+)\s+settings?\b/.exec(t);
  return m ? +m[1] : null;
};

const log = [];
const record = async (step, note) => {
  const s = await snap();
  log.push(Object.assign({ step: step, note: note || null }, s));
  return s;
};

await record('arrive');

/* ---- the birth ------------------------------------------------------- */
await openCard('title');
await record('open title');
await typeIn('.setupcard [data-titlelane]', 'Hollow Oak Club Charter');
await clickIn('.setupcard [data-confirm]');
await record('commit title');

await openCard('slug');
await record('open slug');
await clickIn('.setupcard [data-confirm]');
await record('commit slug');

await openCard('myemail');
await record('open myemail');
await typeIn('.setupcard input[type="email"]', 'ada@example.org');
await clickIn('.setupcard [data-confirm]');
await record('commit myemail (sends)');
await clickIn('[data-act="clickmail"]');
await page.waitForTimeout(600);
await record('follow the magic link');

/* ---- then whatever the rail asks for, one at a time ------------------- */
const PEN_RELEASE = 'quorum';         // 👥, whose value the walk sets itself
let penHeldAtRelease = null;
const releasePen = async (k) => {
  penHeldAtRelease = await penCount();
  // a settled setting's tabs are a closed pile, and the ones behind the front
  // carry no click hook — open the value's own card first and the pile becomes
  // the card's tabs, which is the only way a founder reaches ✒️ either
  await openCard(k);
  if (!(await openCard('pw:u:' + k))) {
    errors.push('no ✒️ tab on ' + k + ' to lay the pen down from');
    return;
  }
  await record('open pw:u:' + k);
  const gave = await clickIn('.setupcard [data-set="pw:u:' + k + '"][data-val="given"]');
  if (!gave) {
    errors.push('the ✒️ tab on ' + k + ' would not let the pen go on a setting that has a value');
    return;
  }
  await clickIn('.setupcard [data-confirm]');
  await record('commit pw:u:' + k);
  const said = await clauseText(k);
  if (!/From the start, the Founder may not amend this at will\./.test(said || '')) {
    errors.push(k + ' released the pen but its clause does not say so: ' + said);
  }
  const now = await penCount();
  if (now !== penHeldAtRelease) {
    errors.push('the pen left before 🍾 — the wallet counted ' + penHeldAtRelease +
      ' settings before the release and ' + now + ' after');
  }
};

const seen = new Set();
for (let i = 0; i < 40; i++) {
  const s = await snap();
  const next = s.rail.find((e) => e.k && !seen.has(e.k));
  if (!next) break;
  seen.add(next.k);
  const opened = await openCard(next.k);
  if (!opened) {
    log.push({ step: 'cannot open ' + next.k, rail: s.rail, paras: s.paras, card: null });
    continue;
  }
  const before = await record('open ' + next.k);
  const opts = (before.card && before.card.options) || [];
  // delegation is an option on the card like any value (Q511), so handing the
  // setting over is the same gesture as answering it
  const opt = next.k === DELEGATE ? null : opts.find((o) => o.set && o.val && !o.on);
  if (next.k === DELEGATE) {
    const gave = await clickIn('.setupcard .delegrung [data-val="roster"]');
    if (!gave) log.push({ step: 'could not delegate ' + next.k, rail: before.rail, card: null });
  }
  if (opt) {
    const picked = await clickIn('.setupcard [data-set="' + opt.set + '"][data-val="' + opt.val + '"]');
    if (!picked) await clickIn('.setupcard [data-ans="' + opt.set + '"][data-ansval="' + opt.val + '"]');
  }
  // with no defaults a card waits for its numbers: fill whatever is empty
  await page.evaluate(() => {
    document.querySelectorAll('.setupcard input, .setupcard textarea').forEach((i) => {
      if (i.value || /^(email|radio|checkbox|file|hidden|range|color)$/.test(i.type)) return;
      if (i.type === 'number') i.value = String(Math.max(+i.min || 1, 5));
      else if (i.type === 'datetime-local') i.value = '2026-09-18T18:00';
      else i.value = 'Ada Lovell';
      i.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });
  await page.waitForTimeout(200);
  const committed = (await clickIn('.setupcard [data-confirm]')) ||
    (await clickIn('.setupcard [data-ok]')) || (await clickIn('.setupcard [data-hatgo]'));
  await record('commit ' + next.k, committed ? null : 'no commit control');
  if (next.k === PEN_RELEASE) await releasePen(next.k);
}

/* ---- and at 🍾 the release is spent (R-048) ---------------------------- */
if (penHeldAtRelease !== null && log.some((e) => e.step === 'commit begin')) {
  const said = await clauseText(PEN_RELEASE);
  if (/may (not )?amend this at will/.test(said || '')) {
    errors.push(PEN_RELEASE + ' still speaks of the pen after 🍾: ' + said);
  }
  // two settings leave the pen wallet at the press: 👥, released above, and
  // 📄 the Text, which 🍾 lays down by itself (§9.7 rule 8)
  const now = await penCount();
  if (now !== null && now !== penHeldAtRelease - 2) {
    errors.push('🍾 did not spend the release — the wallet counted ' + penHeldAtRelease +
      ' settings before it and ' + now + ' after, where ' + (penHeldAtRelease - 2) +
      ' is 👥 released and 📄 laid down');
  }
}

/* ---- --delegate: is the founder served their own question? ------------ */
let verdict = null;
if (DELEGATE) {
  const want = 'ans-' + DELEGATE;
  // **Offered, not still pending.** The founder answers their own question as
  // soon as it is served, so by the end of the walk it is settled and gone
  // from the rail — asserting on the *final* rail fails on a surface that is
  // working. What this is about is whether the question was ever put to them.
  const steps = log.map((e) => e.step);
  const at = steps.indexOf('open ' + want);
  const ok = at >= 0;
  const answered = steps.includes('commit ' + want);
  verdict = { want, ok, answered, after: ok ? steps[at - 1] : null };
  // The founder answers on their own surface (§9.0b) and the Proposing gate
  // waits on it, so a founder who is never asked cannot begin their own
  // document — the module refuses while the question is still collecting.
  if (!ok) errors.push('the founder was never served ' + want +
    ' — the walk was offered [' + steps.filter((s) => s.startsWith('open ')).map((s) => s.slice(5)).join(', ') + ']');
  else if (!answered) errors.push(want + ' was offered but could not be answered');
}

const out = { log: log, errors: errors, ...(verdict ? { verdict } : {}) };
if (AS_JSON) {
  console.log(JSON.stringify(out, null, 1));
} else {
  for (const e of log) {
    console.log('\n=== ' + e.step + (e.note ? '  [' + e.note + ']' : ''));
    const rail = (e.rail || []).map((r) => (r.k || '?') + '·' + (r.title || r.all || '').slice(0, 44));
    console.log('  rail: ' + (rail.join(' | ') || '(empty)'));
    if (e.card) {
      console.log('  head: ' + e.card.head);
      if (e.card.lock) console.log('  lock: ' + e.card.lock);
      console.log('  body: ' + (e.card.body || '').slice(0, 240));
      if (e.card.options.length) {
        console.log('  options: ' + e.card.options.map((o) => (o.on ? '[x] ' : '[ ] ') + (o.label || '').slice(0, 44)).join(' / '));
      }
      console.log('  foot: ' + e.card.foot.map((f) => (f.label || '') + (f.disabled ? ' (off)' : '')).join(' | '));
    }
    if (e.paras && e.paras.length) {
      console.log('  clauses:');
      for (const p of e.paras) console.log('    ' + p.k + ': ' + (p.text || '').slice(0, 78));
    }
  }
  if (verdict) {
    console.log('\ndelegated ' + DELEGATE + ' · ' + (verdict.ok
      ? 'the founder is served ' + verdict.want + ' (after ' + verdict.after + ')' +
        (verdict.answered ? ' and answers it' : ' but CANNOT answer it')
      : 'FAIL: the founder was never served ' + verdict.want));
  }
  console.log('\npage errors: ' + (errors.length ? errors.slice(0, 4).join(' / ') : 'none'));
}
await browser.close();
srv.close();
if (verdict && !verdict.ok) process.exit(1);
