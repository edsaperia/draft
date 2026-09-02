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
/**
 * `--shape=<meeting|conference|ongoing|custom>` (entry 166) picks that rung on
 * 🧭 before 📧, so the walk prints the **shortened** order — the rail as it
 * stands at the save and every task the founder is still served — which is
 * what Ed asked to see. Default none: the walk answers 🧭 *custom*, which is
 * today's founding untouched.
 */
const SHAPE = (process.argv.find((a) => a.startsWith('--shape=')) || '').split('=')[1] || 'custom';

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
  // the title as the founder sees it: the big heading before the save, the
  // charter's own heading at the head of the prose column after it (backlog
  // 33) — the pre-save heading is still in the DOM, hidden, so the first
  // `.doctitle` in document order is no longer the one on screen
  const shown = [...document.querySelectorAll('.doctitle')].find((el) => el.offsetParent);
  return { rail, paras, card, title: txt(shown || null) };
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

/**
 * **The column stays live until 🍾** (Q824, backlog 56), and since backlog 204
 * **there is no OK**: 📝 is the door into edit mode, the founder writes, and
 * the row's ✒️ is the confirm (`confirm-starting-text`, every press — Q1080).
 * So this runs *after the founder's first ✒️*, keeping the two halves Q824
 * needed. The **caret**: is the column on screen and editable in edit mode,
 * and read-only again on leaving? The **text**: do words written after the
 * first ✒️ reach the charter at 🍾? A column left editable with nowhere to
 * send its keystrokes is the phantom power the old freeze existed to prevent,
 * so a page that passes the first and fails the second is worse than one that
 * fails both.
 */
const POST_OK_LINE = 'Written after the first ✒️, before the cork.';
let proseWasLive = false;
const afterFirstPen = async () => {
  // 📝: the riding tab, from the save
  const entered = await page.evaluate(() => {
    const tab = document.querySelector('#ridetab .achip[data-tab="text"]');
    if (!tab) return null;
    tab.click();
    const el = document.getElementById('prose');
    return { shown: !!el.offsetParent, editable: el.getAttribute('contenteditable'),
      row: !!document.querySelector('#proserow [data-act="row-commit"]') };
  });
  if (!entered) { errors.push('there is no 📝 tab at the save'); return; }
  if (!entered.shown) errors.push('the prose column is hidden at the save — it is the founder’s until 🍾');
  if (entered.editable !== 'true') {
    errors.push('📝 did not make the column editable (contenteditable=' + entered.editable + ')');
  }
  if (!entered.row) errors.push('edit mode drew no proposal-row under the column');
  // the first ✒️: a line, the page's own input event, the row's commit
  await page.evaluate(() => {
    const el = document.getElementById('prose');
    const d = document.createElement('div');
    d.textContent = 'The first line, saved by the first ✒️.';
    el.appendChild(d);
    el.classList.remove('empty');
    el.dispatchEvent(new InputEvent('input', { bubbles: true }));
  });
  await page.waitForTimeout(200);
  const pressed = await clickIn('#proserow [data-act="row-commit"]');
  if (!pressed) errors.push('the row’s ✒️ would not press with a changed column');
  await record('first ✒️ on the text');
  // …and the column is still live afterwards: a second line, written after
  // the first confirm — unsent until ✒️ or 🍾, which is the only save since
  // Ed's ruling of 2026-08-30 (Q821's debounced re-confirm is gone)
  const st = await page.evaluate((line) => {
    const el = document.getElementById('prose');
    const d = document.createElement('div');
    d.textContent = line;
    el.appendChild(d);
    el.dispatchEvent(new InputEvent('input', { bubbles: true }));
    return { shown: !!el.offsetParent, editable: el.getAttribute('contenteditable') };
  }, POST_OK_LINE);
  proseWasLive = st.shown && st.editable === 'true';
  if (!proseWasLive) errors.push('the prose column is not live after the first ✒️ (contenteditable=' + st.editable + ')');
  await page.waitForTimeout(200);
  await record('write after the first ✒️');
  // leaving: 📝 again, and the column is read-only
  await page.evaluate(() => document.querySelector('#ridetab .achip[data-tab="text"]').click());
  await page.waitForTimeout(200);
  const left = await page.evaluate(() => document.getElementById('prose').getAttribute('contenteditable'));
  if (left !== 'false') errors.push('📝 again did not leave edit mode (contenteditable=' + left + ')');
};

const log = [];
const record = async (step, note) => {
  const s = await snap();
  log.push(Object.assign({ step: step, note: note || null }, s));
  return s;
};

/**
 * **At the birth the title clause says who the Founder is** (Ed, 2026-08-27,
 * backlog 140). The birth's first clause is the founder's first meeting with
 * the word *Founder*, and until this sentence nothing on the page has told
 * them it means them — so it carries *(that’s you!)*, once, on the title and
 * nowhere else. Three assertions, because the aside has three ways to be
 * wrong: absent at the birth, still there after the save (where the clause is
 * read by members who are *not* the Founder, and must be byte-identical to
 * what it always was), or repeated down the band, where it reads as a tic.
 * The apostrophe is the page's own curly `Q`, which `snap()` preserves — it
 * only collapses whitespace — so a straight quote here would pass vacuously.
 */
const BIRTH_TITLE =
  /^The document is titled “Hollow Oak Club Charter”\. The Founder \(that’s you!\) may amend this at will\.$/;
const SAVED_TITLE =
  'The document is titled “Hollow Oak Club Charter”. The Founder may amend this at will.';
const ASIDE = 'that’s you';
const titleClauseAtBirth = async () => {
  const said = await clauseText('title');
  if (!BIRTH_TITLE.test(said || '')) {
    errors.push('the birth’s title clause does not tell the founder who the Founder is: ' +
      (said === null ? '(no title clause in the band)' : said));
  }
};
const titleClauseAfterSave = async (s) => {
  const said = await clauseText('title');
  // a shaped document (entry 166) has a membership decision from the save —
  // 🥾 is the shape's — so the title's power sentence already carries its
  // assent half; what is asserted there is that the aside is gone and the
  // sentence still opens as it always did
  const ok = SHAPE === 'custom' ? said === SAVED_TITLE
    : typeof said === 'string' && said.startsWith(SAVED_TITLE.slice(0, -1)) && !said.includes(ASIDE);
  if (!ok) {
    errors.push('the aside outlived the birth: ' +
      (said === null ? '(no title clause in the band)' : said));
  }
  const carried = (s.paras || []).filter((p) => String(p.text).includes(ASIDE));
  if (carried.length) {
    errors.push('the aside outlived the birth: ' +
      carried.map((p) => p.k).join(', ') + ' still say it after the save');
  }
};
const asideOnTitleAlone = (s) => {
  const carried = (s.paras || []).filter((p) => String(p.text).includes(ASIDE));
  if (carried.length !== 1 || carried[0].k !== 'title') {
    errors.push('the aside is on ' + carried.length + ' clauses at the birth (' +
      (carried.map((p) => p.k).join(', ') || 'none') + '), and it belongs on the title alone');
  }
};

await record('arrive');

/* ---- the birth ------------------------------------------------------- */
await openCard('title');
await record('open title');
await typeIn('.setupcard [data-titlelane]', 'Hollow Oak Club Charter');
await clickIn('.setupcard [data-confirm]');
await record('commit title');
await titleClauseAtBirth();

await openCard('slug');
await record('open slug');
await clickIn('.setupcard [data-confirm]');
const atCommitSlug = await record('commit slug');
asideOnTitleAlone(atCommitSlug);

await openCard('shape');
await record('open shape');
if (!(await clickIn('.setupcard [data-set="docShape"][data-val="' + SHAPE + '"]'))) {
  errors.push('🧭 offers no rung named ' + SHAPE);
}
await clickIn('.setupcard [data-confirm]');
await record('commit shape (' + SHAPE + ')');

await openCard('myemail');
await record('open myemail');
await typeIn('.setupcard input[type="email"]', 'ada@example.org');
await clickIn('.setupcard [data-confirm]');
await record('commit myemail (sends)');
await clickIn('[data-act="clickmail"]');
await page.waitForTimeout(600);
const atMagicLink = await record('follow the magic link');
await titleClauseAfterSave(atMagicLink);
// the text, written from the save (backlog 204): no task, no OK
await afterFirstPen();

/* ---- then whatever the rail asks for, one at a time ------------------- */
const PEN_RELEASE = 'quorum';         // 👥, whose value the walk sets itself
let penHeldAtRelease = null;
let penReleased = false;          // the walk got all the way through the release
const releasePen = async (k) => {
  penHeldAtRelease = await penCount();
  if (penHeldAtRelease === null) {
    // a guard that cannot read its own witness is not a guard — say so rather
    // than skipping the whole of R-048 in silence
    errors.push('the ✒️ wallet states no settings count, so the pen half of R-048 cannot be checked');
    return;
  }
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
  // **The clause is the rule alone** (Ed's QA, 2026-09-02 pm): the power
  // state left the clause for the power tabs, so the release sentence
  // (*From the start, the Founder may not amend this at will.* — R-048's
  // pending form) must never come back on it. The tab's own laid-down state
  // is asserted by `gave` above.
  const said = await clauseText(k);
  if (/the Founder may (not )?amend this at will/.test(said || '')) {
    errors.push(k + ' released the pen and its clause still states power: ' + said);
  }
  const now = await penCount();
  if (now !== penHeldAtRelease) {
    errors.push('the pen left before 🍾 — the wallet counted ' + penHeldAtRelease +
      ' settings before the release and ' + now + ' after');
  }
  penReleased = true;
};

const seen = new Set();
// **A door is recorded in the rail, never driven** (entry 181). ✉️ stands as the
// founder's task once the Membership rules stand, and this loop answers whatever
// it picks up — it would delegate a door, or send an invitation the golden has no
// business containing. The rail column of every step records it either way, which
// is the whole of what the golden is for here.
const DOORS = new Set(['invite', 'remove']);
for (let i = 0; i < 40; i++) {
  const s = await snap();
  const next = s.rail.find((e) => e.k && !seen.has(e.k) && !DOORS.has(e.k));
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
  // **A delegated setting takes no value with it, so its card's fields are left
  // alone** (Q832, `journey-walk.mjs`'s own guard, ported). Typing into a
  // rung's field *chooses that rung*, so the fill below un-delegated whatever
  // `--delegate=` had just handed over — silently, and only for a setting whose
  // value rung carries a field. 🌡️ is exactly that (one `number` input), which
  // is Ed's own case: `--delegate=bar` walked all the way to a begun document
  // with 🌡️ founder-held, and the verdict blamed the page.
  // with no defaults a card waits for its numbers: fill whatever is empty
  if (next.k !== DELEGATE) await page.evaluate(() => {
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
  if (next.k === 'text') errors.push('📝 the text was served as a task; it is a card with two modes, never a task (backlog 204)');
}

/* ---- and what was written after the first ✒️ is what began (Q824) ------ */
if (proseWasLive && log.some((e) => e.step === 'commit begin')) {
  const charter = await page.evaluate(() => {
    const el = document.getElementById('charter');
    return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
  });
  if (!charter.includes(POST_OK_LINE)) {
    errors.push('the line written after the first ✒️ is not in the charter after 🍾 — ' +
      'the column was live but its keystrokes went nowhere');
  }
}

/* ---- and at 🍾 the release is spent (R-048) ---------------------------- */
if (penReleased && log.some((e) => e.step === 'commit begin')) {
  const said = await clauseText(PEN_RELEASE);
  if (/may (not )?amend this at will/.test(said || '')) {
    errors.push(PEN_RELEASE + ' still speaks of the pen after 🍾: ' + said);
  }
  // two settings leave the pen wallet at the press: 👥, released above, and
  // 📝 the Text, which 🍾 lays down by itself (§9.7 rule 8)
  const now = await penCount();
  if (now !== null && now !== penHeldAtRelease - 2) {
    errors.push('🍾 did not spend the release — the wallet counted ' + penHeldAtRelease +
      ' settings before it and ' + now + ' after, where ' + (penHeldAtRelease - 2) +
      ' is 👥 released and 📝 laid down');
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
