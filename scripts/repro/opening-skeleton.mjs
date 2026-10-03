#!/usr/bin/env node
/**
 * opening-skeleton — **opening a document never shows another one** (issue
 * #201, Q1559).
 *
 *   PORT=8201 DRAFT_BASE_URL=http://127.0.0.1:8201 DRAFT_DATA_DIR=<fresh> DRAFT_DEMO_KEY=walk DRAFT_DEMO_STUB=1 npm run server
 *   node scripts/repro/opening-skeleton.mjs http://127.0.0.1:8201 [--shots=<dir>]
 *
 * The page ships the birth's *Untitled* in the topbar and above the column,
 * and on /d/ nothing replaced it until liveBoot's first view was drawn. The
 * ruling: a skeleton — `html.opening` from <head>, both titles and the first
 * lines as grey bars, lifted at the first render, kept through the boot's 4 s
 * retries. On the demo document, as a stranger, at 1600 and at 390:
 *
 *   birth     `/` never wears `opening` and still says *Untitled*
 *   first     at DOMContentLoaded the root wears `opening`, both titles are
 *             transparent and the column's bars are drawn
 *   frames    sampled every animation frame from the first, no frame paints
 *             *Untitled* in either title before the first render
 *   retry     the first view answers 503: the skeleton stands through the
 *             4 s retry
 *   lifted    after the retried view, the class is gone, the title is the
 *             document's and visible, and the bars are gone
 *   motion    the bars pulse under `no-preference` and stand still under
 *             `reduce`
 *
 * Red on main at `first`; exit 0 only if all pass, 1 on a failure, 2 on a
 * broken set-up. `--shots` writes `opening-<width>.png` mid-skeleton.
 */
import { join } from 'node:path';
import { chromium } from 'playwright';

const B = (process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'http://127.0.0.1:8201').replace(/\/+$/, '');
const opt = (name, dflt) => {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`));
  return a ? a.slice(name.length + 3) : dflt;
};
const SHOTS = opt('shots', null);
const say = (s) => console.log(s);
const fails = [];
const check = (name, ok, detail = '') => {
  say((ok ? 'PASS · ' : 'FAIL · ') + name + (ok ? '' : ' · ' + detail));
  if (!ok) fails.push(name);
};
const die = (s) => { say('BROKEN · ' + s); process.exit(2); };

const health = await fetch(B + '/healthz').then((r) => r.json()).catch(() => null);
if (!health) die('no server at ' + B);
if (!health.demo || health.demo.state !== 'built') die('the demo document is not built on ' + B + ' · ' + JSON.stringify(health.demo));

// every animation frame from the first: does either title paint *Untitled*?
// Runs before the page's own scripts, so it sees the frames the reader does.
const SAMPLER = () => {
  window.__opening = { frames: 0, flashes: [], liftedAt: null };
  const painted = (el) => {
    if (!el || (el.textContent || '').trim() !== 'Untitled') return false;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') return false;
    const m = /rgba?\(([^)]+)\)/.exec(cs.color);
    const a = m ? m[1].split(',').map(Number) : [0, 0, 0, 1];
    return a.length < 4 || a[3] > 0;
  };
  const tick = () => {
    const o = window.__opening;
    o.frames++;
    for (const id of ['titletext', 'doctitle']) {
      if (painted(document.getElementById(id))) o.flashes.push(id + '@' + o.frames);
    }
    if (document.documentElement.classList.contains('opening') || !window.SESSION || o.frames < 3) {
      requestAnimationFrame(tick);
    } else o.liftedAt = o.frames;
  };
  requestAnimationFrame(tick);
};

const browser = await chromium.launch();

// ---- birth: `/` is unchanged ------------------------------------------------
{
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await ctx.newPage();
  await page.goto(B + '/', { waitUntil: 'domcontentloaded' });
  const b = await page.evaluate(() => ({
    opening: document.documentElement.classList.contains('opening'),
    title: (document.getElementById('titletext') || {}).textContent,
    color: getComputedStyle(document.getElementById('titletext')).color,
  }));
  check('birth · no opening class on /', !b.opening);
  check('birth · the topbar still says Untitled, visibly', b.title === 'Untitled' && !/, 0\)$/.test(b.color), JSON.stringify(b));
  await ctx.close();
}

for (const [w, h] of [[1600, 1000], [390, 844]]) {
  const narrow = w < 900;
  for (const motion of ['no-preference', 'reduce']) {
    const tag = w + ' ' + motion;
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: motion,
      ...(narrow ? { deviceScaleFactor: 2, isMobile: true, hasTouch: true } : {}) });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(SAMPLER);
    // the first boot answers 503 (the retry), the second is held for a beat
    // so the skeleton can be read, then the host's own answer goes through
    let views = 0;
    let release;
    const held = new Promise((r) => { release = r; });
    await page.route(/\/api\/d\/demo\/view(\?|$)/, async (route) => {
      views++;
      if (views === 1) return route.fulfill({ status: 503, body: 'deploying' });
      if (views === 2) await held;
      return route.continue();
    });
    await page.goto(B + '/d/demo', { waitUntil: 'domcontentloaded' });
    const read = () => page.evaluate(() => {
      const t = document.getElementById('titletext');
      const d = document.getElementById('doctitle');
      const p = document.getElementById('prose');
      const pb = getComputedStyle(p, '::before');
      return {
        opening: document.documentElement.classList.contains('opening'),
        title: t.textContent, titleColor: getComputedStyle(t).color,
        docColor: getComputedStyle(d).color,
        bars: pb.content !== 'none' ? parseFloat(pb.height) : 0,
        anim: getComputedStyle(t).animationName,
      };
    });
    const first = await read();
    check(tag + ' · first · the root wears opening', first.opening, JSON.stringify(first));
    check(tag + ' · first · both titles transparent', /, 0\)$/.test(first.titleColor) && /, 0\)$/.test(first.docColor), JSON.stringify(first));
    check(tag + ' · first · the column\'s bars are drawn', first.bars > 40, JSON.stringify(first));
    check(tag + ' · motion · ' + (motion === 'reduce' ? 'still' : 'pulsing'),
      motion === 'reduce' ? first.anim === 'none' : first.anim === 'openingPulse', first.anim);

    // the 503 has been answered and the retry is waiting on its 4 s
    const t0 = Date.now();
    while (views < 2 && Date.now() - t0 < 9000) await page.waitForTimeout(100);
    const retried = views >= 2;
    if (!retried) die(tag + ' · the boot never retried');
    const mid = await read();
    check(tag + ' · retry · the skeleton stands through the 4 s retry', mid.opening && /, 0\)$/.test(mid.titleColor), JSON.stringify(mid));
    if (SHOTS && motion === 'no-preference') await page.screenshot({ path: join(SHOTS, `opening-${w}.png`) });

    release();
    const lifted = await page.waitForFunction(() => !document.documentElement.classList.contains('opening'),
      null, { timeout: 20000 }).catch(() => null);
    check(tag + ' · lifted · the class goes at the first render', !!lifted);
    await page.waitForTimeout(300);
    const after = await read();
    check(tag + ' · lifted · the document\'s title, visible', after.title.trim() && after.title !== 'Untitled' &&
      !/, 0\)$/.test(after.titleColor), JSON.stringify(after));
    check(tag + ' · lifted · the bars are gone', after.bars === 0, JSON.stringify(after));

    const o = await page.evaluate(() => window.__opening);
    check(tag + ' · frames · no frame painted Untitled (' + o.frames + ' sampled)', o.frames > 3 && !o.flashes.length,
      JSON.stringify(o.flashes.slice(0, 5)));
    check(tag + ' · no page error', !errors.length, errors.join(' | '));
    await ctx.close();
  }
}
await browser.close();
say(fails.length ? `\n${fails.length} failed` : '\nall passed');
process.exit(fails.length ? 1 : 0);
