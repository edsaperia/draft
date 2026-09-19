#!/usr/bin/env node
/**
 * heading-marker — **can a heading's `#` be reached from the column?** (Q1467; Ed, the
 * residency room, 2026-09-19: *I can't edit headings in the text. the #s are not editable*)
 *
 *   npm run design -- 8212            # any free port; the address it prints is the one to use
 *   node scripts/repro/heading-marker.mjs http://127.0.0.1:8212
 *
 * The fixture's charter, in edit mode, over one heading. Until Q1467 the block's marker stood
 * in a `contenteditable="false"` span so the caret offsets stayed offsets into the words — and
 * Chrome will not stand a caret before such a span: it puts it at **the end of the paragraph
 * above**, so a click on the `#` typed nothing a member could see and Home in a heading opened
 * a draft on the wrong clause. Edit mode is the source now and the marker is ordinary text.
 *
 * Two cases, each on a page of its own:
 *
 *   backspace  click the `#`, step one character right, Backspace. The draft must be on **that
 *              heading**, holding its own words with one `#` gone and nothing else touched.
 *   home       click the words, Home, type `#`. The draft must be on **that heading**, a rank
 *              deeper, and the paragraph above must be no part of it.
 *
 * Exit 0 only if both pass; 1 on a failure, 2 on a broken set-up. Red on the pre-Q1467 page at
 * both: `backspace` opens no draft at all, `home` opens one on the paragraph above.
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://127.0.0.1:8212';
const say = (s) => console.log(s);
const fails = [];
const check = (name, ok, detail) => {
  say((ok ? 'PASS · ' : 'FAIL · ') + name + (ok ? '' : ' · ' + detail));
  if (!ok) fails.push(name);
};

const browser = await chromium.launch();

// the fixture's charter in edit mode, with one marked heading marked for the probe
async function openEditMode() {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(BASE + '/session-view.html?fixture=session');
  await page.waitForSelector('#charter', { state: 'attached' });
  await page.waitForTimeout(1200);
  await page.click('#editdoor [data-act="edit-door"]');          // 📝 is the door
  await page.waitForTimeout(800);
  const found = await page.evaluate(() => {
    const blocks = [...document.querySelectorAll('#charter .prose [data-key]')]
      .filter((b) => !b.closest('.sugg') && b.getClientRects().length);
    const at = blocks.findIndex((b, i) => {
      const m = b.querySelector('.mdmark');
      return i > 0 && m && /^#+\s*$/.test(m.textContent);
    });
    if (at < 1) return null;
    const head = blocks[at], above = blocks[at - 1];
    head.setAttribute('data-probe', 'head');
    const mark = head.querySelector('.mdmark');
    // the words, as the column draws them: everything the block holds that is
    // not its gutter, its fold triangle or its marker
    const c = head.cloneNode(true);
    c.querySelectorAll('.chipcol, .nocaret, .sechint, .mdmark').forEach((el) => el.remove());
    return { key: head.dataset.key, aboveKey: above.dataset.key,
      marker: mark.textContent, words: c.textContent,
      caretStands: mark.closest('[contenteditable="false"]') == null };
  });
  if (!found) { say('SET-UP · no heading with a marker found in the column in edit mode'); await page.close(); return null; }
  await page.$eval('[data-probe="head"]', (el) => el.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(200);
  return { page, errs, ...found };
}

// what the composer holds: every unproposed draft's sites, keyed
const draftSites = (page) => page.evaluate(() => (window.SESSION.SUGGS || [])
  .filter((s) => s.unproposed)
  .flatMap((s) => (s.sites || []).map((x) => ({ key: (x.keys || [])[0], text: x.text ?? '' }))));

// ---- backspace: the `#` is a character, and one press takes it --------------
{
  const t = await openEditMode();
  if (!t) { await browser.close(); process.exit(2); }
  const { page, errs, key, marker, words, caretStands } = t;
  check('the marker is editable text, not furniture the caret cannot enter', caretStands, 'the `.mdmark` span is inside a contenteditable="false"');
  // click the marker's first character, step one right, and Backspace takes
  // the `#` the caret is behind
  const box = await page.evaluate(() => {
    const m = document.querySelector('[data-probe="head"] .mdmark');
    const r = document.createRange(); r.selectNodeContents(m);
    const q = r.getBoundingClientRect();
    return { x: q.left, y: q.top + q.height / 2 };
  });
  await page.mouse.click(box.x + 2, box.y);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Backspace');
  await page.waitForTimeout(900);
  const sites = await draftSites(page);
  const want = marker.slice(1) + words;
  check('backspace · the `#` clicked and deleted, on that heading and nothing else',
    sites.length === 1 && sites[0].key === key && sites[0].text === want,
    JSON.stringify({ sites, want, key }));
  check('backspace · no page error', errs.length === 0, errs.join(' | '));
  await page.close();
}

// ---- home: the line's start is the line's start -----------------------------
{
  const t = await openEditMode();
  if (!t) { await browser.close(); process.exit(2); }
  const { page, errs, key, aboveKey, marker, words } = t;
  const r = await page.$eval('[data-probe="head"]', (el) => {
    const q = el.getBoundingClientRect();
    return { x: q.left + q.width / 2, y: q.top + q.height / 2 };
  });
  await page.mouse.click(r.x, r.y);
  await page.keyboard.press('Home');
  await page.keyboard.type('#');
  await page.waitForTimeout(900);
  const sites = await draftSites(page);
  const want = '#' + marker + words;
  check('home · Home then `#` lands in the heading, never in the paragraph above',
    sites.length === 1 && sites[0].key === key && sites[0].text === want,
    JSON.stringify({ sites, want, key, aboveKey }));
  check('home · no page error', errs.length === 0, errs.join(' | '));
  await page.close();
}

await browser.close();
say(fails.length ? `FAILED: ${fails.join(' · ')}` : 'both cases pass');
process.exit(fails.length ? 1 : 0);
