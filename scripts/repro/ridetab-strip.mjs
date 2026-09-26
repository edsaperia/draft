/**
 * ridetab-strip.mjs — Q1369's measurement, made repeatable (Q1541 stage 6).
 *
 * Ed's screenshot of 2026-09-15 (`design/bug-shots-2026-09-15/race-card-tab-
 * gap-under-ridetab.png`) showed a live race card under the 📝 riding tab
 * with its 🔥 tab some 30px below the 📝 pile and the card's left edge
 * cutting across it. It never reproduced on the fixture; BUILD.md's stage 6
 * asks for the measurement **on a live dev-server document with `#ridetab`
 * present, at 1600 and 390**. This is that measurement:
 *
 *   the ladder's `session` rung is built (a real document: eleven races, a
 *   park, proposals of the Founder's own), the Founder's page opened, and
 *   every live judgment card on it — quick, race, a judged pair, patch —
 *   opened from its own tab, then read:
 *
 *   gap      the strip's tabs stand 3px apart, top to bottom (`.chipcol`'s gap)
 *   cut      no tab of the strip runs past the card's left edge (the tuck is
 *            the tab's own 2px, drawn under the card, so its right edge is the
 *            card's edge)
 *   ride     no tab of the strip overlaps the 📝 riding tab
 *   still    the tab pressed, where it was the front of its pile, keeps its
 *            glyph's place: 0px down, and across only the active tab's own
 *            growth — 8px out to the left at 1600, none at 390 (1541.53)
 *
 * Exit 0 when every card at both widths passes, 1 on a finding, 2 on a
 * set-up that never got there (no ladder, no card to open).
 *
 *   node scripts/repro/ridetab-strip.mjs [<base-url>]
 */
import { chromium } from 'playwright';
import { assertServerBuild, walkBase } from '../lib/assert-server.mjs';
import { say } from '../lib/walk.mjs';

const BASE = walkBase(process.argv, process.env, 'http://127.0.0.1:8341');
const bail = (why) => { say(`SET-UP · ${why}`); process.exit(2); };
const fails = [];
const check = (what, ok, detail = '') => {
  say(`${ok ? 'PASS · ' : 'FAIL · '}${what}${detail ? ` · ${detail}` : ''}`);
  if (!ok) fails.push(what);
};

await assertServerBuild(BASE, 'ridetab-strip');

const browser = await chromium.launch();
try {
  // the ladder's own press seats this browser as the Founder (routes-dev.ts)
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await ctx.newPage();
  await page.goto(BASE + '/');
  const built = await page.evaluate(async () => {
    const r = await fetch('/api/dev/ladder', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ to: 'session', seed: 313351 }) });
    return r.ok ? r.json() : { error: r.status + ' ' + (await r.text()).slice(0, 200) };
  });
  if (!built || built.error || !built.slug) bail('the ladder did not build a session: ' + JSON.stringify(built).slice(0, 300));
  say(`the ladder's session rung · ${built.slug} · seed ${built.seed}`);
  const cookies = await ctx.cookies();

  for (const [w, h] of [[1600, 1000], [390, 844]]) {
    const c = w === 1600 ? ctx : await browser.newContext({ viewport: { width: w, height: h } });
    if (c !== ctx) await c.addCookies(cookies);
    const p = w === 1600 ? page : await c.newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(BASE + '/d/' + built.slug);
    await p.waitForFunction(() => !!(window.SESSION && window.SESSION.SUGGS && window.SESSION.SUGGS.length), null, { timeout: 30_000 })
      .catch(() => bail(`${w}: the page never drew its charter`));
    await p.waitForTimeout(1500);
    const r = await p.evaluate(async () => {
      const sl = (ms) => new Promise((res) => setTimeout(res, ms));
      window.SESSION.smoothScrollBy = (dy, done) => { window.scrollBy(0, dy); if (done) done(); };
      const rect = (e) => { const q = e.getBoundingClientRect(); return [q.left, q.top, q.right, q.bottom].map((x) => Math.round(x * 100) / 100); };
      const ids = window.SESSION.SUGGS.filter((g) => ['quick', 'race', 'patch'].includes(g.kind) && g.state !== 'sealed').map((g) => g.id);
      const out = { ride: !!document.querySelector('#ridetab .achip'), cards: [] };
      for (const id of ids) {
        const q = CSS.escape(id);
        const t = document.querySelector('.achip[data-anchor="' + q + '"]');
        if (!t) continue;
        // the front of its pile, or a lone tab — the one a press can reach
        const front = !t.classList.contains('behind');
        t.scrollIntoView({ block: 'center' }); await sl(150);
        const before = rect(t);
        window.SESSION.toggle(id, false); await sl(700);
        const card = document.querySelector('.sugg[data-card="' + q + '"]');
        if (!card) { out.cards.push({ id, open: false }); continue; }
        const c = rect(card);
        const tabs = [...card.querySelectorAll('.clausehead .chipcol > .achip, .clausehead .chipcol > .filedpile > .achip')]
          .filter((a) => a.getBoundingClientRect().height > 0).map((a) => ({ a: a.dataset.anchor, r: rect(a) }));
        const gaps = tabs.slice(1).map((x, i) => Math.round((x.r[1] - tabs[i].r[3]) * 100) / 100);
        const cut = tabs.filter((x) => x.r[2] > c[0] + 0.5).map((x) => x.a);
        const own = card.querySelector('.clausehead .achip[data-anchor="' + q + '"]');
        const moved = own && front ? [Math.round((rect(own)[0] - before[0]) * 100) / 100, Math.round((rect(own)[1] - before[1]) * 100) / 100] : null;
        const rideTab = document.querySelector('#ridetab .achip');
        const rr = rideTab && rideTab.getBoundingClientRect().height ? rect(rideTab) : null;
        const ride = rr ? tabs.filter((x) => !(x.r[3] <= rr[1] || x.r[1] >= rr[3]) && !(x.r[2] <= rr[0] || x.r[0] >= rr[2])).map((x) => x.a) : [];
        out.cards.push({ id, kind: card.dataset.kind || null, gaps, cut, moved, ride });
        window.SESSION.toggle(id, false); await sl(500);
      }
      return out;
    });
    if (!r.cards.length) bail(`${w}: no live judgment card to open`);
    const grow = w > 900 ? -8 : 0;
    const bad = (f) => r.cards.filter(f).map((x) => x.id);
    check(`${w} · ${r.cards.length} cards opened${w > 900 ? ', 📝 ' + (r.ride ? 'present' : 'absent') : ''}`, r.cards.every((x) => x.open !== false));
    check(`${w} · gap — every strip's tabs 3px apart`, !bad((x) => (x.gaps || []).some((g) => Math.abs(g - 3) > 0.5)).length,
      bad((x) => (x.gaps || []).some((g) => Math.abs(g - 3) > 0.5)).join(', '));
    check(`${w} · cut — no tab past the card's left edge`, !bad((x) => (x.cut || []).length).length, bad((x) => (x.cut || []).length).join(', '));
    check(`${w} · ride — no strip tab over the 📝 riding tab`, !bad((x) => (x.ride || []).length).length, bad((x) => (x.ride || []).length).join(', '));
    const moved = r.cards.filter((x) => x.moved && (Math.abs(x.moved[1]) > 0.5 || Math.abs(x.moved[0] - grow) > 0.5));
    check(`${w} · still — the front tab pressed keeps its place (0px down, ${grow}px across)`, !moved.length,
      moved.map((x) => x.id + ' ' + x.moved.join(',')).join('; '));
    check(`${w} · no page error`, !errs.length, errs.slice(0, 2).join(' | '));
  }
} finally {
  await browser.close();
}
say(fails.length ? `✗ ${fails.length} finding(s)` : '✓ Q1369: every strip joins its card, clear of the 📝 riding tab, at 1600 and 390');
process.exit(fails.length ? 1 : 0);
