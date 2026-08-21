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
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
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
  const paras = [...document.querySelectorAll('#band [data-para]')].map((p) => ({
    k: p.dataset.para, text: txt(p.querySelector('.cpv')),
  }));
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
  const opt = opts.find((o) => o.set && o.val && !o.on);
  if (opt) {
    const picked = await clickIn('.setupcard [data-set="' + opt.set + '"][data-val="' + opt.val + '"]');
    if (!picked) await clickIn('.setupcard [data-ans="' + opt.set + '"][data-ansval="' + opt.val + '"]');
  }
  // with no defaults a card waits for its numbers: fill whatever is empty
  await page.evaluate(() => {
    document.querySelectorAll('.setupcard input, .setupcard textarea').forEach((i) => {
      if (i.value || /^(email|radio|checkbox|file|hidden|range|color)$/.test(i.type)) return;
      if (i.type === 'number') i.value = i.min && +i.min > 0 ? String(+i.min + 1) : '5';
      else if (i.type === 'datetime-local') i.value = '2026-09-18T18:00';
      else i.value = 'Ada Lovell';
      i.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });
  await page.waitForTimeout(200);
  const committed = (await clickIn('.setupcard [data-confirm]')) ||
    (await clickIn('.setupcard [data-ok]')) || (await clickIn('.setupcard [data-hatgo]'));
  await record('commit ' + next.k, committed ? null : 'no commit control');
}

const out = { log: log, errors: errors };
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
  console.log('\npage errors: ' + (errors.length ? errors.slice(0, 4).join(' / ') : 'none'));
}
await browser.close();
srv.close();
