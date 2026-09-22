/**
 * Where a contents-rail click lands (backlog 214, Ed's QA of batch S: *"clicking
 * on a heading in the table of contents doesn't show you the right part of the
 * document, maybe because the topbar is not being taken into account"*).
 *
 *   npm run toc-travel
 *   npm run toc-travel -- --slow   (settle on a 400 ms timer, for a tab where rAF never fires)
 *
 * Clicks every in-page anchor in `#toc` and asserts the thing it points at comes
 * to rest **at or below the bottom of `.navbar`** — the bar is `position: sticky;
 * top: 0`, so anything above that line is behind it and the reader cannot see
 * the one word they clicked.
 *
 * Note the asymmetry, which is deliberate: the page derives its clearance from
 * the `--nav-h` token (58px, plus `HEAD_GAP`) while this check measures the
 * bar's **actual** bottom. That is what lets this tool catch the token drifting
 * away from the bar it describes — a check written against the same constant
 * the code reads could only ever confirm arithmetic.
 *
 * Two window sizes in one invocation, `card-audit`'s pair: a geometry finding
 * that moves with the viewport is a layout fact rather than a defect, and this
 * one has to hold at both.
 *
 * Since SURFACE **M17** it is also where *whether* a click arrives is checked:
 * an entry naming a heading inside something folded unfolds it and then travels,
 * so an anchor with nothing laid out behind it is clicked like any other rather
 * than skipped, and a click that leaves it that way is a failure.
 *
 * And since **Q1384** (Ed, 2026-09-15) it is where the rail's marks are
 * measured: every heading's marks lie to the right of the heading's own box
 * (they take nothing from its width, so no heading wraps for a mark), none is
 * clipped by the list's scrolling box, and a run that reaches the document's
 * border covers it — the element under the border at the run's height is the
 * run's own. Three sizes: the third is the wide step at which the rail takes
 * 300px, so the wider page is measured too.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize, sep, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const DESIGN = join(resolve(fileURLToPath(new URL('../..', import.meta.url))), 'design');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.txt': 'text/plain' };
const SIZES = [{ width: 1600, height: 1000 }, { width: 1280, height: 900 }, { width: 1920, height: 1000 }];
// the fixture that actually has constitution sections in the rail: the band is
// what puts `#cs-…` anchors there, and `tocLead` emits them only once there is
// a saved document to point at
const FIXTURE = '/session-view.html?fixture=session&band=1';
// `--slow`: settle on the old 400 ms timer rather than on animation frames
const SLOW = process.argv.includes('--slow');

function serveDesign() {
  const server = createServer(async (req, res) => {
    try {
      const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      const file = normalize(join(DESIGN, path === '/' ? '/session-view.html' : path));
      if (!file.startsWith(DESIGN + sep) && file !== DESIGN) { res.writeHead(403); return res.end(); }
      const s = await stat(file);
      const body = await readFile(s.isDirectory() ? join(file, 'index.html') : file);
      res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(body);
    } catch { res.writeHead(404); res.end(); }
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

/** One window size: load, seat the instant-jump seam, click everything, measure. */
async function measureAt(browser, base, size, fails) {
  const label = size.width + '×' + size.height;
  const context = await browser.newContext({ viewport: size, deviceScaleFactor: 1, locale: 'en-GB', timezoneId: 'Europe/London' });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  await page.goto(base + FIXTURE);
  await page.waitForFunction(() => !!(window.SESSION && document.querySelector('#toc a[data-toc]')), null, { timeout: 20_000 });
  // card-audit's own seam. Measuring where a click *lands* is the point; the
  // animation is `smoothScrollBy`'s and is not what is under test here.
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    window.SESSION.smoothScrollBy = (dy, done) => { window.scrollBy(0, dy); if (done) done(); };
  });

  // **The rail must not be empty.** A fixture showing no constitution entries
  // would let this tool pass by measuring nothing, which is worse than red.
  const counts = await page.evaluate(() => ({
    lead: document.querySelectorAll('#toc a[href^="#cs-"]').length,
    own: document.querySelectorAll('#toc a[data-toc]').length,
    all: document.querySelectorAll('#toc a[href^="#"]').length,
  }));
  if (!counts.lead) fails.push(label + ': the rail carries no constitution entry (#toc a[href^="#cs-"]) — nothing of the lead was measured');
  if (!counts.own) fails.push(label + ": the rail carries none of the charter's own headings (#toc a[data-toc]) — nothing of the existing path was measured");

  let measured = 0;
  const skipped = [], opened = [], unfolded = [];
  for (let i = 0; i < counts.all; i++) {
    const r = await page.evaluate(async ({ n, slow }) => {
      const a = document.querySelectorAll('#toc a[href^="#"]')[n];
      if (!a) return { gone: true };
      const href = a.getAttribute('href');
      const text = (a.textContent || '').trim();
      const id = href.slice(1);
      const target = document.getElementById(id);
      const box = target && target.getBoundingClientRect();
      // **A rail click always arrives somewhere** (SURFACE M17). A heading that
      // is not laid out *yet* — the constitution pile shut over its own
      // sections, a prose heading shut over the ones beneath it — used to be
      // skipped here, on the grounds that it is what `scrollToHeading` declines
      // to move for. That is now the defect rather than the excuse: the entry's
      // own pile unfolds and then travels, and this is the one case in which
      // measuring the arrival is the whole point.
      const hidden = !target ? 'not in the page' : (!box.width && !box.height) ? 'not laid out' : null;
      // A card collapses over `COLLAPSE_MS`, and the page relayouts on its own
      // scroll — so each anchor is clicked from a page that has finished moving
      // and measured once this one has. Clicking mid-collapse measures the
      // previous anchor's animation, not this anchor's arrival.
      //
      // **Two animation frames, not a literal** (plan-ci-speed.md Stage 2): a
      // scroll's relayout and a click's render are done by the second frame,
      // and the one thing that runs longer — a card's collapse, a timer of
      // `COLLAPSE_MS` — is waited out by its own constant where a card was
      // shut. The old 400 ms, three times per anchor at three sizes, was 4.5
      // minutes of CI. `--slow` restores it for a browser whose tab never
      // paints, where rAF never fires (the extension's backgrounded tab).
      const frames = () => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(() => ok())));
      const settle = slow ? () => new Promise((ok) => setTimeout(ok, 400)) : frames;
      const collapsed = slow ? settle
        : () => new Promise((ok) => setTimeout(ok, (window.CARDS && window.CARDS.COLLAPSE_MS) || 400)).then(frames);
      window.scrollTo(0, 0);
      await settle();
      const wasOpen = window.SESSION.openId;
      a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await settle();
      const again = document.getElementById(id);
      const abox = again && again.getBoundingClientRect();
      const r2 = { href, text, hidden, opened: window.SESSION.openId !== wasOpen };
      if (r2.opened) {
        // close it again so the next anchor measures the same page as the first
        try { window.SESSION.toggle(window.SESSION.openId, false); } catch { /* already shut */ }
        await collapsed();
        return r2;
      }
      r2.top = again && (abox.width || abox.height) ? abox.top : null;
      r2.bottom = document.querySelector('.navbar').getBoundingClientRect().bottom;
      return r2;
    }, { n: i, slow: SLOW });
    if (r.gone) continue;
    // **M10's card branch is not navigation** (Ed, 179): a charter heading
    // holding exactly one question *is* that question, so clicking it opens
    // the card and `bringIntoView` aims at the clause's own `READ_LINE`. There
    // is no heading arrival to measure, and asserting one would be asserting
    // that M10 is a bug.
    if (r.opened) { opened.push(r.href); continue; }
    if (r.top === null) {
      // M17 again: an entry that was folded away and *stayed* folded away is
      // the dead click this tool exists to catch, where a target the click
      // rebuilt out from under itself is only unmeasurable
      if (r.hidden) fails.push(label + ': ' + JSON.stringify(r.text) + ' (' + r.href + ') was ' +
        r.hidden + ' and the click left it that way — M17');
      else skipped.push(r.href);
      continue;
    }
    if (r.hidden) unfolded.push(r.href);
    measured++;
    if (r.top < r.bottom) {
      fails.push(label + ': ' + JSON.stringify(r.text) + ' (' + r.href + ') lands at top ' +
        r.top.toFixed(1) + ', navbar bottom ' + r.bottom.toFixed(1) + ' — ' +
        (r.bottom - r.top).toFixed(1) + 'px behind the bar');
    }
  }
  for (const e of pageErrors) fails.push(label + ': page error — ' + e);

  // **The marks queue rightwards, out of the rail** (Q1384). Measured from
  // scroll 0 with the list scrolled to its top, so the first screen of runs
  // is under the viewport and `elementFromPoint` can answer for them.
  // The stagehand's furniture is not the product: the live page hides the
  // dev-dropdown in both of its boots (`liveBoot`, `birthBoot`), and its fixed
  // box at the bottom-left sat over a rail run at 1280×900 on CI's runner (the
  // 23:09 run of 2026-09-15, *div.devswitch is what is painted there*). Hidden
  // here the way the live page hides it, so the run beneath is what is measured.
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('.devswitch, .ladderbar, #devoutbox')) el.style.display = 'none';
    window.scrollTo(0, 0); const ul = document.querySelector('#toc'); if (ul) ul.scrollTop = 0;
  });
  const marks = await page.evaluate(() => {
    const ul = document.querySelector('#toc');
    const doc = document.querySelector('.doc');
    if (!ul || !doc) return { none: true };
    const ulBox = ul.getBoundingClientRect(), docX = doc.getBoundingClientRect().left;
    const out = { runs: 0, crossing: 0, onScreen: 0, bad: [] };
    for (const li of ul.querySelectorAll('li')) {
      // the run, or on a page from before Q1384 the bare span, so the pre-fix
      // failure names the geometry rather than an absent class
      const a = li.querySelector('a'), run = li.querySelector('.tocmarks .run') || li.querySelector('.tocmarks');
      if (!a || !run) continue;
      out.runs++;
      const ab = a.getBoundingClientRect(), rb = run.getBoundingClientRect();
      const text = JSON.stringify((a.textContent || '').trim().slice(0, 30));
      if (rb.left < ab.right - 0.5) out.bad.push(text + ': marks start at ' + rb.left.toFixed(1) + ', left of the heading’s right edge ' + ab.right.toFixed(1));
      // the row's own gap and the span's margin are the only things between the
      // heading and the row's edge: a mark that took room would show here
      const span = run.parentElement, lb = li.getBoundingClientRect();
      const allowed = parseFloat(getComputedStyle(li).columnGap) + parseFloat(getComputedStyle(span).marginLeft);
      if (ab.right < lb.right - allowed - 0.5) out.bad.push(text + ': the heading gave up ' + (lb.right - ab.right - allowed).toFixed(1) + 'px of its row to the marks');
      if (rb.right > ulBox.right + 0.5) out.bad.push(text + ': the run ends at ' + rb.right.toFixed(1) + ', past the list’s box at ' + ulBox.right.toFixed(1) + ' — clipped');
      if (rb.right > docX) {
        out.crossing++;
        if (rb.top >= 0 && rb.bottom <= window.innerHeight) {
          out.onScreen++;
          const hit = document.elementFromPoint(docX + 0.5, rb.top + rb.height / 2);
          if (!hit || !(run === hit || run.contains(hit))) out.bad.push(text + ': the run crosses the document’s edge at ' + docX.toFixed(1) + ' but ' + (hit ? hit.tagName.toLowerCase() + '.' + hit.className : 'nothing') + ' is what is painted there');
        }
      }
    }
    return out;
  });
  if (marks.none) fails.push(label + ': no rail or no document to measure the marks against');
  else {
    if (!marks.runs) fails.push(label + ': the rail carries no marks — nothing of Q1384 was measured');
    for (const b of marks.bad) fails.push(label + ': ' + b);
    console.log('toc-travel ' + label + ': ' + marks.runs + ' heading(s) carry marks, ' + marks.crossing + ' run(s) cross the document’s edge, ' + marks.onScreen + ' of them checked for cover');
  }
  // both numbers, so the margin is visible rather than merely satisfied: the
  // page derives its clearance from `--nav-h` while the bar's height is its own
  const bar = await page.evaluate(() => ({
    bottom: document.querySelector('.navbar').getBoundingClientRect().bottom,
    token: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')),
  }));
  console.log('toc-travel ' + label + ': ' + measured + ' anchor(s) measured, ' +
    unfolded.length + ' of them unfolded first (M17), ' +
    opened.length + ' opened a card (M10, not navigation), ' + skipped.length + ' skipped (the click rebuilt its own target away)');
  console.log('  navbar bottom ' + bar.bottom.toFixed(1) + 'px measured · --nav-h ' + bar.token + 'px derived');
  if (unfolded.length) console.log('  unfolded: ' + unfolded.join(' '));
  if (skipped.length) console.log('  skipped: ' + skipped.join(' '));
  if (opened.length) console.log('  opened:  ' + opened.join(' '));
  await context.close();
}

const server = await serveDesign();
const base = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch();
const fails = [];
for (const size of SIZES) await measureAt(browser, base, size, fails);
await browser.close();
server.close();

for (const f of fails) console.error('✗ ' + f);
console.log(fails.length ? `toc-travel: ${fails.length} failure(s)` : 'toc-travel: every contents-rail click lands clear of the topbar');
process.exit(fails.length ? 1 : 0);
