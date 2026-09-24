#!/usr/bin/env node
/**
 * demo-join — **a room of phones joins the demo** (design/DEMO.md Stage 3; Q1535).
 *
 *   PORT=8201 DRAFT_BASE_URL=http://127.0.0.1:8201 DRAFT_DATA_DIR=<fresh> DRAFT_DEMO_KEY=pizzaparty npm run server
 *   node scripts/repro/demo-join.mjs http://127.0.0.1:8201 [--key=pizzaparty] [--shots=<dir>] [--jsqr=<jsQR.js>]
 *
 * Two phone contexts at 390 wide and Ed's desktop at 1600, against a server with the demo on:
 *
 *   door      a phone opening the QR code's address (`/d/demo?try=1`) meets 👋 Try It open,
 *             and no 📧 Log In — the demo mails nobody.
 *   join      one tap: the page reloads into a member's seat under a made-up name, the
 *             address loses `?try=1`, and the grants are already accepted (the ✏️ wallet is
 *             drawn, no ⚖️ 💡 🏛️ card asks for an OK).
 *   vote      the visitor votes on a pair dealt to them, and the ✓ goes out and lands.
 *   propose   the visitor opens 📝, writes on a clause and proposes; the proposal lands.
 *   rejoin    the same phone scanning again is home in the same seat — no second member.
 *   second    a second phone joins: a different seat, a different name.
 *   qr        Ed's browser, set once by `?demokey=`, opens ▦ QR: a code filling most of the
 *             screen, black on white, which decodes to exactly `<base>/d/demo?try=1`
 *             (jsQR, where `--jsqr` names its file), the address printed under it; Escape
 *             closes it.
 *
 * Screenshots (with `--shots`): `stranger-try-390.png`, `visitor-first-view-390.png`,
 * `qr-modal-1600.png`. Exit 0 only if all pass; 1 on a failure, 2 on a broken set-up.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { sleep } from '../lib/walk.mjs';

const B = (process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'http://127.0.0.1:8201').replace(/\/+$/, '');
const opt = (name, dflt) => {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`));
  return a ? a.slice(name.length + 3) : dflt;
};
const KEY = opt('key', 'pizzaparty');
const SHOTS = opt('shots', null);
const JSQR = opt('jsqr', null);
const say = (s) => console.log(s);
const fails = [];
const check = (name, ok, detail = '') => {
  say((ok ? 'PASS · ' : 'FAIL · ') + name + (ok ? '' : ' · ' + detail));
  if (!ok) fails.push(name);
};
const die = (s) => { say('BROKEN · ' + s); process.exit(2); };
const shot = async (page, name) => {
  if (!SHOTS) return;
  await page.screenshot({ path: join(SHOTS, name) });
  say('  shot · ' + join(SHOTS, name));
};

const health = await fetch(B + '/healthz').then((r) => r.json()).catch(() => null);
if (!health) die('no server at ' + B);
if (!health.demo || health.demo.state !== 'built') die('the demo document is not built on ' + B + ' · ' + JSON.stringify(health.demo));

const browser = await chromium.launch();
const phone = () => browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
  isMobile: true, hasTouch: true });
/** Every /cmd answer the page gets, by command. */
const wire = (page) => {
  const sent = [];
  page.on('response', async (r) => {
    if (!/\/cmd$/.test(r.url())) return;
    let cmd = null;
    try { cmd = JSON.parse(r.request().postData() || '{}').cmd; } catch { /* not ours */ }
    sent.push({ cmd, status: r.status() });
  });
  return sent;
};
const meOf = (page) => page.evaluate(() => fetch('/api/d/demo/view').then((r) => r.json())
  .then((v) => ({ me: v.me || null, stranger: !!v.stranger, name: v.view ? v.view.identity.name : null,
    preAcked: v.preAcked || null })));
const errors = [];

// ---- door and join, phone A --------------------------------------------------
const ctxA = await phone();
const a = await ctxA.newPage();
a.on('pageerror', (e) => errors.push('A: ' + e.message));
const sentA = wire(a);
await a.goto(B + '/d/demo?try=1');
await a.waitForSelector('[data-strtry]', { timeout: 15000 }).catch(() => null);
await sleep(800);
const door = await a.evaluate(() => ({
  try: !!document.querySelector('[data-strtry]'),
  visible: (() => { const b = document.querySelector('[data-strtry]'); if (!b) return false;
    const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; })(),
  login: !!document.querySelector('[data-strsend], [data-q="strlogin"], [data-k="strlogin"]'),
  why: (document.querySelector('.sugg .why, .card .why, .why') || {}).textContent || '',
  scrollX: document.documentElement.scrollWidth - window.innerWidth,
}));
check('door · 👋 Try It is open on the QR address', door.try && door.visible, JSON.stringify(door));
check('door · no 📧 Log In on the demo', !door.login, JSON.stringify(door));
check('door · no sideways scroll at 390', door.scrollX <= 1, 'overflow ' + door.scrollX + 'px');
await shot(a, 'stranger-try-390.png');

const tapped = await a.locator('[data-strtry]').first();
await tapped.scrollIntoViewIfNeeded().catch(() => {});
await Promise.all([a.waitForNavigation({ timeout: 15000 }).catch(() => null), tapped.tap().catch(() => tapped.click())]);
await a.waitForFunction(() => window.SESSION && Array.isArray(window.SESSION.SUGGS), null, { timeout: 15000 }).catch(() => null);
await sleep(3500);
const seatA = await meOf(a);
check('join · a member\'s seat under a made-up name', !!seatA.me && !seatA.stranger && /^[A-Z][a-z]+ [A-Z][a-z]+$/.test(seatA.name || ''),
  JSON.stringify(seatA));
check('join · the grants arrive accepted', JSON.stringify(seatA.preAcked) === JSON.stringify(['canpropose', 'canjudge', 'grant-voice']),
  JSON.stringify(seatA.preAcked));
const landed = await a.evaluate(() => ({
  url: location.pathname + location.search,
  grantCards: [...document.querySelectorAll('[data-ok="canpropose"], [data-ok="canjudge"], [data-ok="grant-voice"]')].length,
  wallet: !!document.querySelector('#wallet i, #wallet .glyph, #wallet svg'),
  scrollX: document.documentElement.scrollWidth - window.innerWidth,
}));
check('join · the address loses ?try=1', landed.url === '/d/demo', landed.url);
check('join · no grant card asks for an OK', landed.grantCards === 0, JSON.stringify(landed));
check('join · the ✏️ wallet is drawn', landed.wallet, JSON.stringify(landed));
check('join · no sideways scroll at 390', landed.scrollX <= 1, 'overflow ' + landed.scrollX + 'px');
await shot(a, 'visitor-first-view-390.png');

// ---- vote --------------------------------------------------------------------
const dealt = await a.evaluate(() => (window.SESSION.SUGGS || []).filter((x) => !x.mine && x.card && !x.judged).map((x) => x.id));
check('vote · the visitor is dealt pairs to vote on', dealt.length > 0, JSON.stringify(dealt).slice(0, 200));
if (dealt.length) {
  await a.evaluate((id) => {
    const S = window.SESSION;
    S.toggle(id, false);
  }, dealt[0]);
  await sleep(900);
  await a.evaluate((id) => {
    const q = String(id).replace(/["\\]/g, '\\$&');
    const card = document.querySelector('.sugg[data-card="' + q + '"]');
    const pick = card && card.querySelector('.lanepick');
    if (pick) pick.click();
  }, dealt[0]);
  await sleep(400);
  await a.evaluate((id) => {
    const q = String(id).replace(/["\\]/g, '\\$&');
    const card = document.querySelector('.sugg[data-card="' + q + '"]');
    const ok = card && card.querySelector('[data-act="judge"], .btn-approve');
    if (ok && !ok.disabled) ok.click();
  }, dealt[0]);
  // a patch race commits from the floating row instead
  await sleep(600);
  await a.evaluate(() => {
    const b = document.querySelector('#charter [data-proposalrow] [data-act="row-commit"]:not([disabled])');
    if (b && !document.querySelector('.sugg[data-card] .btn-approve:not([disabled])')) b.click();
  });
  await sleep(2500);
  const judged = sentA.filter((c) => c.cmd === 'judge-race');
  check('vote · the ✓ went out and landed', judged.length >= 1 && judged.every((c) => c.status === 200), JSON.stringify(judged));
}

// ---- propose -----------------------------------------------------------------
await a.evaluate(() => { const S = window.SESSION; if (S.openId) try { S.toggle(S.openId, false); } catch { /* closed */ } });
await sleep(600);
const doorBtn = a.locator('#editdoor [data-act="edit-door"]');
if (await doorBtn.first().isVisible().catch(() => false)) { await doorBtn.first().click().catch(() => {}); await sleep(900); }
const clause = a.locator('#charter [data-key]').filter({ hasText: /\S.{40,}/ }).nth(3);
if (await clause.count()) {
  await clause.scrollIntoViewIfNeeded().catch(() => {});
  await clause.click().catch(() => {});
  await clause.evaluate((el) => {
    const r = document.createRange(); r.selectNodeContents(el); r.collapse(false);
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
  });
  await a.keyboard.type(' With extra basil.', { delay: 15 });
  await sleep(900);
  // the floating row where the window draws one, else the editing card's own ✏️
  // (at 390 the row is not drawn, and the card carries the commit)
  let btn = a.locator('#charter [data-proposalrow] [data-act="row-commit"]:not([data-pen]):not([disabled]):visible').first();
  if (!(await btn.count())) btn = a.locator('[data-act="draft-propose"]:not([data-pen]):not([disabled]):visible').first();
  // centred, so the stagehand's bar at the foot of a dev page is not what is pressed
  await btn.evaluate((el) => el.scrollIntoView({ block: 'center' })).catch(() => {});
  await sleep(500);
  const box = await btn.boundingBox({ timeout: 4000 }).catch(() => null);
  if (box) {
    // the button says which gesture it wants (*Hold to propose this…*)
    const hold = /^Hold/.test((await btn.getAttribute('title')) || '') ||
      await a.evaluate(() => window.SESSION.gesture === 'hold');
    await a.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    if (hold) { await a.mouse.down(); await sleep(1600); await a.mouse.up(); }
    else await a.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await sleep(3000);
  }
  const put = sentA.filter((c) => c.cmd === 'propose-text');
  check('propose · the visitor\'s proposal lands', put.length === 1 && put[0].status === 200, JSON.stringify(put) + ' · commit ' + !!box);
} else {
  check('propose · a clause to write on', false, 'no clause found');
}

// ---- rejoin, same phone --------------------------------------------------------
await a.goto(B + '/d/demo?try=1');
await a.waitForFunction(() => window.SESSION && Array.isArray(window.SESSION.SUGGS), null, { timeout: 15000 }).catch(() => null);
await sleep(2500);
const again = await meOf(a);
const tryAgain = await a.evaluate(() => !!document.querySelector('[data-strtry]'));
const rejoinPost = await a.evaluate(() => fetch('/api/demo/join', { method: 'POST',
  headers: { 'content-type': 'application/json' }, body: '{}' }).then((r) => r.json()));
check('rejoin · the same phone is home in the same seat', again.me === seatA.me && !tryAgain, JSON.stringify({ again, tryAgain }));
check('rejoin · a second tap makes no second member', rejoinPost.member === seatA.me && rejoinPost.rejoined === true,
  JSON.stringify(rejoinPost));

// ---- a second phone -------------------------------------------------------------
const ctxB = await phone();
const b = await ctxB.newPage();
b.on('pageerror', (e) => errors.push('B: ' + e.message));
await b.goto(B + '/d/demo?try=1');
await b.waitForSelector('[data-strtry]', { timeout: 15000 }).catch(() => null);
await Promise.all([b.waitForNavigation({ timeout: 15000 }).catch(() => null), b.locator('[data-strtry]').first().tap().catch(() => null)]);
await sleep(3000);
const seatB = await meOf(b);
check('second · another seat, another name', !!seatB.me && seatB.me !== seatA.me && seatB.name !== seatA.name,
  JSON.stringify({ a: seatA, b: seatB }));

// ---- Ed's QR modal ----------------------------------------------------------------
const ctxEd = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const ed = await ctxEd.newPage();
ed.on('pageerror', (e) => errors.push('Ed: ' + e.message));
await ed.goto(B + '/d/demo?demokey=' + encodeURIComponent(KEY));
await ed.waitForSelector('#demopanel #demoqr', { timeout: 15000 }).catch(() => null);
const hasPanel = await ed.evaluate(() => !!document.querySelector('#demopanel #demoqr'));
check('qr · Ed\'s panel carries ▦ QR', hasPanel);
const phonePanel = await a.evaluate(() => !!document.querySelector('#demopanel'));
check('qr · a visitor\'s page has no panel', !phonePanel);
if (hasPanel) {
  await ed.click('#demoqr');
  await ed.waitForSelector('#demoqrmodal svg', { timeout: 10000 }).catch(() => null);
  await sleep(400);
  const m = await ed.evaluate(() => {
    const modal = document.getElementById('demoqrmodal');
    if (!modal) return null;
    const box = document.getElementById('demoqrbox').getBoundingClientRect();
    const addr = document.getElementById('demoqraddr');
    return { url: modal.dataset.url, side: Math.min(box.width, box.height),
      short: Math.min(window.innerWidth, window.innerHeight), addr: addr.textContent,
      addrPx: parseFloat(getComputedStyle(addr).fontSize),
      fill: getComputedStyle(document.querySelector('#demoqrcode path')).fill,
      bg: getComputedStyle(modal).backgroundColor };
  });
  check('qr · the modal opens', !!m, 'no modal');
  if (m) {
    check('qr · it encodes exactly the join address', m.url === B + '/d/demo?try=1', m.url);
    check('qr · the code fills most of the screen', m.side >= 0.7 * m.short, `${m.side}px of ${m.short}px`);
    check('qr · black on white', /rgb\(0, 0, 0\)/.test(m.fill) && m.bg === 'rgb(255, 255, 255)', m.fill + ' on ' + m.bg);
    check('qr · the address under it in large type', m.addrPx >= 28 && B.replace(/^https?:\/\//, '').startsWith(m.addr.split('/')[0]),
      m.addr + ' at ' + m.addrPx + 'px');
    await shot(ed, 'qr-modal-1600.png');
    if (JSQR && existsSync(JSQR)) {
      await ed.addScriptTag({ path: JSQR });
      const decoded = await ed.evaluate(async () => {
        const svg = document.getElementById('demoqrcode');
        const xml = new XMLSerializer().serializeToString(svg);
        const img = new Image();
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
        await img.decode();
        const c = document.createElement('canvas');
        c.width = 600; c.height = 600;
        const g = c.getContext('2d');
        g.fillStyle = '#fff'; g.fillRect(0, 0, 600, 600);
        g.drawImage(img, 0, 0, 600, 600);
        const d = g.getImageData(0, 0, 600, 600);
        const out = window.jsQR(d.data, 600, 600);
        return out ? out.data : null;
      });
      check('qr · jsQR decodes it to the join address', decoded === B + '/d/demo?try=1', String(decoded));
    } else {
      say('SKIP · qr decode (pass --jsqr=<path to jsQR.js> to decode)');
    }
    await ed.keyboard.press('Escape');
    await sleep(300);
    check('qr · Escape closes it', !(await ed.evaluate(() => !!document.getElementById('demoqrmodal'))));
  }
}

check('no page threw', errors.length === 0, errors.join(' | ').slice(0, 400));
await browser.close();
say(fails.length ? `\n${fails.length} FAILED: ${fails.join('; ')}` : '\nall passed');
process.exit(fails.length ? 1 : 0);
