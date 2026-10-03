#!/usr/bin/env node
/**
 * phone-propose — **proposing on a phone** (MOBILE.md §6a, stage 6a; issue #203;
 * Ed's rulings 1585.1–1585.8, 2026-10-02).
 *
 * Until stage 6a a phone had no door into the text: `#ridetab`, `#editdoor` and
 * ✏️ *propose edit* were `display: none` below 900px, and where the hide was
 * lifted the column took a caret in edit mode and a keyboard's composition wrote
 * straight into the clause (§6a.0 finding 6). Now, on a coarse pointer, the
 * column never takes a caret, and in edit mode **a tap on a clause makes it its
 * lane**, standing in the clause's own box (1585.1).
 *
 * On the ladder's `session` rung, two phones — iPhone 13 and Pixel 7, touch,
 * every press a `touchscreen.tap` — each seated as a member:
 *
 *   (1) lane    ✏️ *propose edit* on a pair card's lane → the editing card, its
 *               lane focused → one tap on ✏️ → `propose-text` 2xx, and the rail
 *               entry reads *Proposed*
 *   (2) tap     📝 → a tap on a clause → its lane stands in the clause's own
 *               box: the lane's top within 1px of the clause's, the clause's tab
 *               (where it has one — the Pixel taps a raced clause, the iPhone an
 *               unraced one) moved 0px, no *Current text* head, the caret at the
 *               tap point, a typed word lit yellow in the lane
 *   (3) ime     CDP `imeSetComposition` into the lane, then its commit: the text
 *               lands once, the focus kept
 *   (4) column  the same composition aimed at the column changes no clause's
 *               text (finding 6's guard)
 *   (5) kbd     the viewport shortened by 300px, a lane focused: the lane within
 *               [navH, innerHeight], the row's ✏️ on the glass
 *   (6) 16px    every focused editable is ≥ 16px
 *   (7) clean   no horizontal overflow, no page error, no refused call
 *
 * Then *propose → judge → see it pass*: the iPhone proposes its tapped draft in
 * one tap, a desktop context takes seat after seat and prefers it until it
 * carries — the ladder's Founder holds 🛡️ on the text, so it parks and the
 * Founder's 👑 lands it (SPEC §9.7 rule 8) — and the iPhone's entry for that
 * proposal reads ✔.
 *
 * The ladder's ⏭ bar is hidden on the phones: it is the stagehand's, fixed
 * over the window's foot where a member's row stands.
 *
 *   PORT=8341 DRAFT_BASE_URL=http://127.0.0.1:8341 DRAFT_DATA_DIR=<fresh> npm run server
 *   node scripts/repro/phone-propose.mjs http://127.0.0.1:8341
 *
 * Exit 0 when every check passes, 1 on a finding, 2 on a set-up that never got there.
 */
import { chromium, devices } from 'playwright';
import { assertServerBuild, walkBase } from '../lib/assert-server.mjs';
import { say, sleep } from '../lib/walk.mjs';

const BASE = walkBase(process.argv, process.env, 'http://127.0.0.1:8341');
const COMMIT = '[data-act="draft-propose"], [data-proposalrow] [data-act="row-commit"]';
const bail = (why) => { say(`SET-UP · ${why}`); process.exit(2); };
const fails = [];
const check = (what, ok, detail = '') => {
  say(`${ok ? 'PASS · ' : 'FAIL · '}${what}${detail ? ` · ${detail}` : ''}`);
  if (!ok) fails.push(what);
};

await assertServerBuild(BASE, 'phone-propose');

const browser = await chromium.launch();
const json = (p, path, body) => p.evaluate(async ({ path, body }) => {
  const r = await fetch(path, body === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  let j = null; try { j = await r.json(); } catch { /* none */ }
  return { status: r.status, ok: r.ok, j };
}, { path, body });

try {
  // the ladder's own press seats this desktop context as the Founder (routes-dev.ts)
  const dctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const desk = await dctx.newPage();
  await desk.goto(BASE + '/');
  const built = (await json(desk, '/api/dev/ladder', { to: 'session', seed: 42 })).j;
  if (!built || !built.slug) bail('the ladder did not build a session: ' + JSON.stringify(built).slice(0, 300));
  const SLUG = built.slug;
  say(`the ladder's session rung · /d/${SLUG} · seed ${built.seed}`);
  const api = '/api/d/' + SLUG;
  const fview = (await json(desk, api + '/view')).j;
  const FOUNDER = fview.me || null;
  const members = ((fview.view || fview).roster || (fview.view || fview).members || []).map((m) => m.id || m).filter((x) => typeof x === 'string');

  /** a phone, seated as `member`, its welcomes accepted by tap */
  async function phone(dev, member) {
    const ctx = await browser.newContext({ ...devices[dev] });
    const p = await ctx.newPage();
    const errs = [], refused = [], sent = [];
    p.on('pageerror', (e) => errs.push(String(e.message || e)));
    p.on('response', async (res) => {
      const req = res.request();
      if (req.method() !== 'POST' || !/\/api\//.test(res.url()) || /\/api\/dev\//.test(res.url())) return;
      let cmd = null; try { cmd = JSON.parse(req.postData() || 'null'); } catch { /* none */ }
      let body = null; try { body = await res.json(); } catch { /* none */ }
      const row = { url: res.url(), status: res.status(), cmd: cmd && cmd.cmd, body };
      sent.push(row);
      if (!res.ok()) refused.push(row);
    });
    await p.goto(BASE + '/');
    const seat = await json(p, '/api/dev/seat', { slug: SLUG, member });
    if (!seat.ok) bail(`${dev}: the seat switch refused ${member}: ${seat.status}`);
    await p.goto(BASE + '/d/' + SLUG);
    await p.waitForFunction(() => !!(window.SESSION && window.SESSION.SUGGS && window.SESSION.SUGGS.length), null, { timeout: 30_000 })
      .catch(() => bail(`${dev}: the page never drew its charter`));
    await sleep(1500);
    // the ladder's ⏭ bar is the stagehand's (dev only, off the design system)
    // and stands over the window's foot, where a member's row is: out of the way
    await p.addStyleTag({ content: '#ladderbar, .ladderbar { display: none !important; }' });
    // the probes' instant-jump seam: travel is not what is measured here
    await p.evaluate(() => { window.SESSION.smoothScrollBy = (dy, done) => { window.scrollBy(0, dy); if (done) done(); }; });
    for (let pass = 0; pass < 4; pass++) {
      let any = false;
      for (const k of ['grant-voice', 'canpropose', 'canjudge']) {
        const opened = await p.evaluate((kk) => { const t = document.querySelector('#rail [data-card="' + kk + '"]');
          if (!t) return false;
          if (!document.querySelector('.setupcard[data-setupcard="' + kk + '"]')) t.click();
          return true; }, k);
        if (!opened) continue;
        any = true;
        await sleep(600);
        const ok = await p.$('.setupcard[data-setupcard="' + k + '"] [data-ok]');
        if (ok) { await ok.scrollIntoViewIfNeeded(); await tapEl(p, ok); }
        await sleep(1500);
      }
      if (!any) break;
    }
    return { ctx, p, errs, refused, sent, dev, member };
  }
  async function tapEl(p, el) {
    const b = await el.boundingBox();
    if (!b) return false;
    await p.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
    return true;
  }
  const proposedOk = (ph, from) => ph.sent.slice(from).filter((r) => r.cmd === 'propose-text');

  /** (2)–(6) on one phone: the tap door, the lane, IME, the column, the keyboard, 16px */
  async function tapDoor(ph, raced) {
    const { p, dev } = ph;
    // 📝 on its riding tab: the door into edit mode at every width now
    await p.evaluate(() => { const t = document.querySelector('#ridetab .achip[data-tab="text"]');
      if (t) window.scrollBy(0, t.getBoundingClientRect().top - 120); });
    await sleep(500);
    const ride = await p.$('#ridetab .achip[data-tab="text"]');
    check(`${dev} · 📝 riding tab drawn at narrow`, !!ride && !!(await ride.boundingBox()));
    if (ride) await tapEl(p, ride);
    await sleep(800);
    const mode = await p.evaluate(() => ({ editing: document.getElementById('doc').classList.contains('editing'),
      ce: [...document.querySelectorAll('#charter .prose')].map((x) => x.getAttribute('contenteditable')) }));
    check(`${dev} · 📝 enters edit mode, and the column takes no caret on touch`,
      mode.editing && mode.ce.length > 0 && mode.ce.every((x) => x === 'false'), JSON.stringify(mode));
    // the clause: an unraced paragraph (no tab) or a raced one (its front tab)
    const target = await p.evaluate((raced) => {
      const blocks = [...document.querySelectorAll('#charter .prose .editable[data-key]')]
        .filter((b) => !b.closest('.sugg') && !/lvl\d/.test(b.className) && b.textContent.trim().length > 60);
      const tabOf = (b) => [...b.querySelectorAll('.chipcol > .achip')].find((a) => !a.classList.contains('behind') && a.getBoundingClientRect().height);
      const b = blocks.find((x) => (raced ? !!tabOf(x) : !x.querySelector('.achip')));
      if (!b) return null;
      b.scrollIntoView({ block: 'center' });
      return b.dataset.key;
    }, raced);
    if (!target) { check(`${dev} · a ${raced ? 'raced' : 'unraced'} clause to tap`, false); return null; }
    await sleep(400);
    const before = await p.evaluate((k) => {
      const b = document.querySelector('#charter .prose .editable[data-key="' + k + '"]');
      const tab = [...b.querySelectorAll('.chipcol > .achip')].find((a) => !a.classList.contains('behind') && a.getBoundingClientRect().height);
      const w = document.createTreeWalker(b, NodeFilter.SHOW_TEXT);
      let n; for (n = w.nextNode(); n; n = w.nextNode()) if (n.nodeValue.trim().length > 20 && !n.parentElement.closest('.chipcol, .nocaret')) break;
      const r = document.createRange(); r.setStart(n, 12); r.setEnd(n, 13);
      const ch = r.getClientRects()[0];
      // the character offset of the tapped point, counted as the lane counts
      const pre = document.createRange(); pre.selectNodeContents(b); pre.setEnd(n, 12);
      const lead = [...b.querySelectorAll('.chipcol, .nocaret')].reduce((s, e) => s + e.textContent.length, 0);
      const q = b.getBoundingClientRect();
      const tr = document.createRange(); tr.selectNodeContents(n);
      return { key: k, top: q.top, words: tr.getClientRects()[0].top, tab: tab ? tab.getBoundingClientRect().toJSON() : null,
        tabId: tab ? tab.dataset.anchor : null, x: ch.left + 1, y: ch.top + ch.height / 2, at: pre.toString().length - lead,
        text: b.textContent };
    }, target);
    const from = ph.sent.length;
    await p.touchscreen.tap(before.x, before.y);
    await sleep(1200);
    const after = await p.evaluate(({ k, tabId }) => {
      const lane = document.querySelector('[data-lane="' + k + '"]');
      const card = lane && lane.closest('.sugg');
      const tab = tabId && card ? card.querySelector('.clausehead .achip[data-anchor="' + CSS.escape(tabId) + '"]') : null;
      let caret = null;
      const sel = getSelection();
      if (lane && sel.rangeCount && lane.contains(sel.getRangeAt(0).endContainer)) {
        const r = document.createRange(); r.selectNodeContents(lane); r.setEnd(sel.getRangeAt(0).endContainer, sel.getRangeAt(0).endOffset);
        caret = r.toString().length;
      }
      const tr = document.createRange(); if (lane) tr.selectNodeContents(lane);
      return { lane: !!lane, focused: !!lane && document.activeElement === lane, top: lane ? lane.getBoundingClientRect().top : null,
        words: lane ? tr.getClientRects()[0].top : null,
        label: card ? !!card.querySelector(':scope > .glabslot') : null,
        head: card ? [...card.querySelectorAll('.headlab, .glabslot')].map((e) => e.textContent.trim()).filter(Boolean) : null,
        tab: tab ? tab.getBoundingClientRect().toJSON() : null, caret, why: !!(card && card.querySelector('[data-why]')),
        bin: !!document.querySelector('[data-act="draft-withdraw"], [data-act="draft-cancel"]') };
    }, { k: target, tabId: before.tabId });
    check(`${dev} · (2) a tap on the ${raced ? 'raced' : 'unraced'} clause ${target} opens its lane, focused`, after.lane && after.focused, JSON.stringify(after));
    // the clause's own words are where its box holds them (a raced clause's
    // `.anch` 6px in, an untouched one's at its top): the lane takes their place
    check(`${dev} · (2) the lane stands in the clause's box: its top within 1px of the clause's words`,
      after.top != null && Math.abs(after.top - before.words) <= 1,
      `clause box ${before.top.toFixed(2)}, words ${before.words.toFixed(2)} → lane ${after.top != null ? after.top.toFixed(2) : '—'}`);
    check(`${dev} · (2) no *Current text* head, no label`, after.label === false && after.head && after.head.length === 0, JSON.stringify(after.head));
    if (before.tab) {
      const dx = after.tab ? after.tab.left - before.tab.left : NaN, dy = after.tab ? after.tab.top - before.tab.top : NaN;
      check(`${dev} · (2) the clause's tab moved 0px`, Math.abs(dx) <= 0.5 && Math.abs(dy) <= 0.5, `${dx}, ${dy}`);
    }
    check(`${dev} · (2) the caret at the tap point`, after.caret != null && Math.abs(after.caret - before.at) <= 1, `${after.caret} vs ${before.at}`);
    check(`${dev} · (2) the reasoning and 🗑️ arrive with it`, after.why && after.bin);
    check(`${dev} · (2) the tap sent nothing`, !proposedOk(ph, from).length);
    // a typed word, lit
    await p.keyboard.type('quorum ');
    await sleep(500);
    const lit = await p.evaluate((k) => {
      const lane = document.querySelector('[data-lane="' + k + '"]');
      const ins = lane ? [...lane.querySelectorAll('ins')] : [];
      const hit = ins.find((e) => e.textContent.includes('quorum'));
      return { text: lane ? lane.textContent : null, ins: ins.map((e) => e.textContent), bg: hit ? getComputedStyle(hit).backgroundColor : null };
    }, target);
    check(`${dev} · (2) a typed word lit yellow in the lane`, !!lit.bg && lit.bg !== 'rgba(0, 0, 0, 0)' && lit.text.includes('quorum '),
      JSON.stringify(lit));

    // (3) IME into the lane
    const cdp = await ph.ctx.newCDPSession(p);
    await cdp.send('Input.imeSetComposition', { text: 'm', selectionStart: 1, selectionEnd: 1 });
    await cdp.send('Input.imeSetComposition', { text: 'me', selectionStart: 2, selectionEnd: 2 });
    await cdp.send('Input.imeSetComposition', { text: 'mee', selectionStart: 3, selectionEnd: 3 });
    await cdp.send('Input.insertText', { text: 'meeting ' });
    await sleep(500);
    const ime = await p.evaluate((k) => { const lane = document.querySelector('[data-lane="' + k + '"]');
      return { text: lane ? lane.textContent : null, focused: !!lane && document.activeElement === lane }; }, target);
    const n = ime.text ? ime.text.split('quorum meeting ').length - 1 : 0;
    check(`${dev} · (3) a composition into the lane commits once, the focus kept`, n === 1 && ime.focused && !/m(?:e{0,2})meeting/.test(ime.text),
      JSON.stringify(ime.text && ime.text.slice(0, 80)));

    // (4) the same composition aimed at the column
    const texts = () => p.evaluate(() => [...document.querySelectorAll('#charter .prose .editable[data-key]')]
      .filter((b) => !b.closest('.sugg')).map((b) => b.dataset.key + '|' + b.textContent));
    const t0 = await texts();
    await p.evaluate((k) => {
      const b = [...document.querySelectorAll('#charter .prose .editable[data-key]')].find((x) => !x.closest('.sugg') && x.dataset.key !== k && x.textContent.trim().length > 30);
      const host = b.closest('.prose');
      try { host.focus(); } catch { /* not focusable */ }
      const w = document.createTreeWalker(b, NodeFilter.SHOW_TEXT); const tn = w.nextNode();
      const r = document.createRange(); r.setStart(tn, Math.min(4, tn.length)); r.collapse(true);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    }, target);
    await cdp.send('Input.imeSetComposition', { text: 'w', selectionStart: 1, selectionEnd: 1 });
    await cdp.send('Input.imeSetComposition', { text: 'wo', selectionStart: 2, selectionEnd: 2 });
    await cdp.send('Input.insertText', { text: 'word' });
    await sleep(500);
    const t1 = await texts();
    const changed = t1.filter((x) => !t0.includes(x));
    check(`${dev} · (4) a composition aimed at the column changes no clause's text`, !changed.length, changed.slice(0, 2).join(' / '));
    await cdp.detach();

    // (6) every editable focused is ≥ 16px
    const sizes = await p.evaluate((k) => {
      const out = {};
      for (const [name, sel] of [['lane', '[data-lane="' + k + '"]'], ['reason', '.sugg [data-why]']]) {
        const e = document.querySelector(sel);
        if (!e) { out[name] = null; continue; }
        e.focus();
        out[name] = parseFloat(getComputedStyle(document.activeElement).fontSize);
      }
      return out;
    }, target);
    check(`${dev} · (6) every focused editable ≥ 16px`, Object.values(sizes).every((v) => v != null && v >= 16), JSON.stringify(sizes));

    // (5) the keyboard: the viewport 300px shorter, the lane focused
    const vp = p.viewportSize();
    const lane = await p.$('[data-lane="' + target + '"]');
    await p.evaluate(() => window.scrollBy(0, -100000));
    await p.setViewportSize({ width: vp.width, height: vp.height - 300 });
    await sleep(300);
    await p.evaluate((k) => { const l = document.querySelector('[data-lane="' + k + '"]'); l.focus({ preventScroll: true });
      const r = document.createRange(); r.selectNodeContents(l); r.collapse(false);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r); }, target);
    await sleep(600);
    const kbd = await p.evaluate((k) => {
      const l = document.querySelector('[data-lane="' + k + '"]');
      const nav = document.querySelector('.navbar');
      const row = [...document.querySelectorAll('[data-proposalrow] [data-act="row-commit"], .proposalrow [data-act="draft-propose"]')].find((b) => b.getBoundingClientRect().height);
      const r = row ? row.getBoundingClientRect() : null;
      const at = r ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null;
      const sel = getSelection();
      const cq = sel.rangeCount ? sel.getRangeAt(0).getClientRects()[0] : null;
      return { navH: nav ? nav.getBoundingClientRect().bottom : 0, ih: innerHeight, lane: l.getBoundingClientRect().toJSON(),
        caret: cq ? { top: cq.top, bottom: cq.bottom } : null, kbd: document.documentElement.hasAttribute('data-kbd'),
        row: r ? r.toJSON() : null, rowHit: !!(row && at && (at === row || row.contains(at))),
        at: at ? at.tagName + '.' + String(at.className && at.className.baseVal != null ? at.className.baseVal : at.className).trim() + '#' + at.id : null };
    }, target);
    const laneIn = kbd.lane.top >= kbd.navH - 0.5 && kbd.lane.top < kbd.ih && (!kbd.caret || (kbd.caret.top >= kbd.navH - 0.5 && kbd.caret.bottom <= kbd.ih));
    check(`${dev} · (5) a lane focused under a 300px keyboard sits within [navH, innerHeight]`, laneIn,
      `nav ${kbd.navH.toFixed(0)} · lane ${kbd.lane.top.toFixed(0)}–${kbd.lane.bottom.toFixed(0)} · caret ${kbd.caret ? kbd.caret.top.toFixed(0) : '—'} · ih ${kbd.ih}`);
    check(`${dev} · (5) the row's ✏️ is on the glass, above the keyboard`, !!kbd.row && kbd.row.top >= 0 && kbd.row.bottom <= kbd.ih + 0.5 && kbd.rowHit,
      JSON.stringify(kbd.row && { top: kbd.row.top, bottom: kbd.row.bottom }) + ' under the finger: ' + kbd.at);
    check(`${dev} · (5) the root wears data-kbd while a lane holds the caret`, kbd.kbd);
    await p.setViewportSize(vp);
    await sleep(400);
    void lane;
    return target;
  }

  /** (1) ✏️ *propose edit* on a pair card's lane, then one tap on ✏️ */
  async function laneDoor(ph) {
    const { p, dev } = ph;
    const id = await p.evaluate(() => {
      const S = window.SESSION;
      for (const g of S.SUGGS.filter((x) => ['race', 'quick', 'pair'].includes(x.kind) && x.state !== 'sealed' && !x.mine)) {
        S.toggle(g.id, false);
        const card = document.querySelector('.sugg[data-card="' + CSS.escape(g.id) + '"]');
        if (card && card.querySelector('.lanepropose')) return g.id;
        if (S.openId === g.id) S.toggle(g.id, false);
      }
      return null;
    });
    if (!id) { check(`${dev} · (1) a pair card with ✏️ *propose edit*`, false); return; }
    await sleep(800);
    const lp = await p.$('.sugg[data-card="' + id + '"] .lanepropose');
    if (lp) await lp.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await sleep(300);
    const box = lp && await lp.boundingBox();
    check(`${dev} · (1) ✏️ *propose edit* drawn on the pair card's lane`, !!box && box.width > 0, JSON.stringify(box));
    // the hit area: 44px to the finger round the drawn box (§6a.4)
    const hit = lp && await p.evaluate((el) => { const q = el.getBoundingClientRect(); const cx = q.left + q.width / 2, cy = q.top + q.height / 2;
      const at = (x, y) => { const e = document.elementFromPoint(x, y); return !!e && (e === el || el.contains(e)); };
      return at(cx, cy - 21) && at(cx, cy + 21) && at(cx - 21, cy) && at(cx + 21, cy); }, lp);
    check(`${dev} · (1) its hit area is 44px`, !!hit);
    if (lp) await tapEl(p, lp);
    await sleep(1200);
    const st = await p.evaluate(() => { const a = document.activeElement;
      return { card: !!document.querySelector('.editcard'), lane: !!(a && a.matches && a.matches('[data-lane]')) }; });
    check(`${dev} · (1) the editing card opens, its lane focused`, st.card && st.lane, JSON.stringify(st));
    // a word of one's own, so the draft is a change (the seed may be the clause itself)
    await p.keyboard.type(' (amended)');
    await sleep(400);
    const from = ph.sent.length;
    const commit = [...await p.$$(COMMIT)];
    let pressed = false;
    for (const c of commit) { if (await c.isVisible()) { await c.scrollIntoViewIfNeeded(); pressed = await tapEl(p, c); break; } }
    await sleep(2000);
    const sent = proposedOk(ph, from);
    const why = sent.length ? '' : ' · ' + await p.evaluate((sel) => [...document.querySelectorAll(sel)].map((b) => {
      const q = b.getBoundingClientRect(); const e = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2);
      return b.dataset.act + (b.disabled ? ' disabled' : '') + ' @' + Math.round(q.top) + ' under ' + (e ? e.tagName + '#' + e.id + '.' + String(e.className.baseVal ?? e.className) : '—');
    }).join('; ') + ' · lane ' + JSON.stringify((document.querySelector('[data-lane]') || {}).textContent || '').slice(0, 60), COMMIT);
    check(`${dev} · (1) one tap on ✏️ sends propose-text, 2xx`, pressed && sent.length === 1 && sent[0].status < 300,
      JSON.stringify(sent.map((r) => r.status)) + why);
    const said = await p.evaluate(() => { const j = document.querySelector('#rail .qjust'); return j ? j.textContent : null; });
    check(`${dev} · (1) the entry reads *Proposed*`, !!said && /^Proposed/.test(said), JSON.stringify(said));
  }

  const PHONES = [['iPhone 13', false], ['Pixel 7', true]];
  const seats = members.filter((m) => /^m-\d+$/.test(m));
  if (seats.length < 6) bail('the ladder has too few members: ' + JSON.stringify(members).slice(0, 200));
  let mine = null;
  for (let i = 0; i < PHONES.length; i++) {
    const [dev, raced] = PHONES[i];
    const ph = await phone(dev, seats[i + 1]);
    say(`${dev} · seated as ${ph.member}`);
    const pre = await ph.p.evaluate(() => ({ doors: ['#ridetab', '#editdoor'].map((s) => { const e = document.querySelector(s); return e ? getComputedStyle(e).display : 'absent'; }),
      meta: document.querySelector('meta[name=viewport]').content }));
    check(`${dev} · the doors are not hidden at narrow`, pre.doors.every((d) => d !== 'none'), JSON.stringify(pre.doors));
    check(`${dev} · the viewport resizes its content for the keyboard`, /interactive-widget=resizes-content/.test(pre.meta));
    // (6) a motion's fields too (§6a.7: their share of stage 6 is the font
    // and hit-area sweep): 💤's card, every field it draws ≥ 16px
    const motion = await ph.p.evaluate(async () => {
      const t = document.querySelector('[data-tab="lapse"]');
      if (!t) return null;
      t.click();
      await new Promise((r) => setTimeout(r, 900));
      const out = [...document.querySelectorAll('.setupcard input, .setupcard textarea, .setupcard select, .setupcard [contenteditable="true"], .setupcard [contenteditable="plaintext-only"]')]
        .filter((e) => e.getBoundingClientRect().height && e.type !== 'file' && e.type !== 'radio' && e.type !== 'checkbox')
        .map((e) => ({ f: (e.className || e.tagName), px: parseFloat(getComputedStyle(e).fontSize) }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await new Promise((r) => setTimeout(r, 600));
      return out;
    });
    check(`${dev} · (6) a motion's fields ≥ 16px (💤)`, !!motion && motion.length > 0 && motion.every((x) => x.px >= 16), JSON.stringify(motion));
    await laneDoor(ph);
    const key = await tapDoor(ph, raced);
    if (i === 0 && key) {
      // propose it, in one tap on the row's ✏️
      const from = ph.sent.length;
      const c = [...await ph.p.$$(COMMIT)];
      let pressed = false;
      for (const b of c) if (await b.isVisible()) { pressed = await tapEl(ph.p, b); break; }
      await sleep(2000);
      const sent = proposedOk(ph, from);
      const why = sent.length ? '' : ' · ' + await ph.p.evaluate((sel) => [...document.querySelectorAll(sel)].map((b) => {
        const q = b.getBoundingClientRect(); const e = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2);
        return b.dataset.act + (b.disabled ? ' disabled' : '') + ' @' + Math.round(q.top) + ' under ' + (e ? e.tagName + '#' + e.id + '.' + String(e.className.baseVal ?? e.className) : '—');
      }).join('; ') + ' open ' + window.SESSION.openId, COMMIT);
      check(`${dev} · the tapped draft proposes in one tap`, pressed && sent.length === 1 && sent[0].status < 300, JSON.stringify(sent.map((r) => r.status)) + why);
      const r = sent[0] && sent[0].body;
      mine = { ph, key, id: r && ((r.result && r.result.id) || r.id) };
    }
    const wide = await ph.p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
    check(`${dev} · (7) no horizontal overflow`, wide.sw <= wide.iw, JSON.stringify(wide));
    check(`${dev} · (7) no page error`, !ph.errs.length, ph.errs.slice(0, 2).join(' | '));
    check(`${dev} · (7) no refused call`, !ph.refused.length, JSON.stringify(ph.refused.slice(0, 2)));
    if (i !== 0) await ph.ctx.close();
  }

  // propose → judge → see it pass
  if (!mine || !mine.id) bail('the iPhone never proposed its tapped draft');
  say(`the iPhone's proposal ${mine.id} on ${mine.key}; a desktop context judges it`);
  let carried = false, judged = 0;
  for (const m of seats.filter((x) => x !== mine.ph.member)) {
    await json(desk, '/api/dev/seat', { slug: SLUG, member: m });
    const v = (await json(desk, api + '/view')).j;
    const view = v;
    const c = (view.clauses || []).find((x) => (x.candidates || []).some((k) => k.id === mine.id));
    if (!c) { carried = true; break; }
    const r = await json(desk, api + '/cmd', { cmd: 'judge-race', args: { a: c.incumbentId, b: mine.id, outcome: 'b' } });
    if (!r.ok) say(`  ${m}'s judgment refused: ${r.status} ${JSON.stringify(r.j).slice(0, 160)}`);
    judged++;
  }
  if (!carried) {
    const v = (await json(desk, api + '/view')).j;
    carried = !(v.clauses || []).some((x) => (x.candidates || []).some((k) => k.id === mine.id));
  }
  // the Founder holds 🛡️ on the text here, so a carried change parks for the
  // Founder's 👑 (SPEC §9.7 rule 8, Q1475): crowned, it lands
  if (carried && FOUNDER) {
    await json(desk, '/api/dev/seat', { slug: SLUG, member: FOUNDER });
    const fv = (await json(desk, api + '/view')).j;
    const crown = ((fv.view || fv).crownTasks || []).find((t) => t.text && t.text.candidateId === mine.id);
    if (crown) {
      const r = await json(desk, api + '/cmd', { cmd: 'answer-crown-question', args: { question: crown.id, outcome: 'accept' } });
      say(`the Founder's 👑 on the parked change: ${r.status}`);
    }
  }
  const text = String((await json(desk, api + '/view')).j.text || '');
  check(`desktop · the phone's proposal carries, after ${judged} judgments`, carried && judged > 0 && text.includes('quorum meeting'),
    `judged ${judged} · in the text: ${text.includes('quorum meeting')}`);
  await sleep(6000);   // a poll or two on the phone
  // the record of this proposal: its rail entry names the race the candidate
  // ran in, and its mark is the ✔
  const done = await mine.ph.p.evaluate((cid) => [...document.querySelectorAll('#rail li')]
    .filter((li) => (li.dataset.q || '').split(/[^a-z0-9]+/i).includes(cid))
    .map((li) => ({ q: li.dataset.q, yes: !!li.querySelector('.mk-adopted, .mk-filedYes'), live: !!li.querySelector('.mk-needs, .mk-deciding, .mk-urgent') })), mine.id);
  check(`iPhone 13 · its entry for ${mine.id} reads ✔`, done.length > 0 && done.every((x) => x.yes && !x.live), JSON.stringify(done));
  check('iPhone 13 · (7) still no page error and no refused call', !mine.ph.errs.length && !mine.ph.refused.length,
    JSON.stringify([mine.ph.errs.slice(0, 1), mine.ph.refused.slice(0, 1)]));
} finally {
  await browser.close();
}
say(fails.length ? `✗ ${fails.length} finding(s)` : '✓ stage 6a: a phone proposes through the lane and the tap door, and sees it pass');
process.exit(fails.length ? 1 : 0);
