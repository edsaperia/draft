/**
 * The first keys into an empty column (Ed's first test on the wiped host,
 * 2026-09-18: *after the birth, before begin, the founder is putting text into
 * the text area, but can't ✒️ it using the floating action buttons* — and then,
 * of the walks that had been green an hour before: *a little concerning that
 * the founder walk doesn't find a bug this blocking*).
 *
 *   npm run first-keys-walk -- <url>        (a running dev server, this tree)
 *
 * **What no other walk does is type.** `journey` puts the founder's text into
 * the column with a synthetic paste event, and worked out the text it expected
 * the way the page does — from the column's blocks — so the walk and the bug
 * agreed with each other. An empty column holds no block: the browser puts the
 * first keystrokes straight into `#prose` as a bare text node, every reader of
 * the column walks `prose.children`, and so a one-line text confirmed as
 * *empty*, after which the row read *Saved* and went dark — a button that is
 * there, has no hover and does nothing, on the first thing every founder does.
 *
 * So this walk is the founder on a fresh document with a keyboard: 📝, a click
 * in the column, real key presses — a first line, `# ` and a heading, Enter, a
 * paragraph — the floating ✒️, and then **the server asked what it holds,
 * compared with the literal strings that were typed**, never with anything read
 * back off the page. Three things it pins, each red on the page as it stood at
 * 0bdb081: the first line reaches the server; a heading typed as `# ` holds its
 * own words rather than dropping them into the line above; and Enter at the end
 * of a heading starts a paragraph, not a second heading.
 */
import { chromium } from 'playwright';
import { assertServerBuild, walkBase } from './lib/assert-server.mjs';
import { say, sleep as T, post as postTo, landOn } from './lib/walk.mjs';

const BASE = walkBase(process.argv, process.env, 'http://127.0.0.1:8140');
await assertServerBuild(BASE, 'first-keys-walk');

const stuck = [];
const made = await (await postTo(BASE, '/api/docs',
  { title: 'First Keys ' + Date.now(), email: 'first-keys@example.org' })).json();
if (!made.devLink) { say('FAIL: no dev link — is this a dev server?'); process.exit(2); }

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
const errors = []; const refused = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('response', (r) => { if (r.status() >= 400) refused.push(r.status() + ' ' + r.url().replace(BASE, '')); });

await landOn(page, made.devLink);
await page.waitForSelector('#ridetab .achip[data-tab="text"]', { timeout: 15000 });
await T(800);

const serverText = () => page.evaluate(() =>
  fetch(location.pathname.replace('/d/', '/api/d/') + '/view').then((r) => r.json())
    .then((v) => ({ textConfirmed: !!v.textConfirmed, text: v.text })));
const row = () => page.evaluate(() => {
  const b = document.querySelector('#proserow [data-act="row-commit"]');
  return b ? { there: true, disabled: b.disabled } : { there: false };
});

// ---- the column as a founder finds it: empty, and holding no block ---------
const before = await page.evaluate(() => {
  const pr = document.getElementById('prose');
  return { children: pr.children.length, text: pr.textContent };
});
say('arrival    · the column holds ' + before.children + ' block(s) and ' + JSON.stringify(before.text));

// ---- 📝, a click in the column, and keys -----------------------------------
await page.click('#ridetab .achip[data-tab="text"]');
await T(600);
await page.click('#prose');
const FIRST = 'The clubhouse is open to members.';
await page.keyboard.type(FIRST.slice(0, 14));
await page.keyboard.type(FIRST.slice(14)); // two bursts: the caret must not have moved between them
await T(300);

// one line, which is the whole of what Ed typed: the row is lit, and the press saves it
const lit = await row();
await page.click('#proserow [data-act="row-commit"]');
await T(900);
const one = await serverText();
const oneOk = lit.there && !lit.disabled && one.textConfirmed && one.text === FIRST;
say('first line · ' + (oneOk ? 'typed into the empty column, ✒️ lit, and the server holds it word for word'
  : 'FAIL: ' + JSON.stringify({ lit, server: one, wanted: FIRST })));
if (!oneOk) stuck.push('the first line typed into an empty column');

// ---- a heading typed as `# `, and the paragraph after it --------------------
await page.click('#prose');
await page.keyboard.press('Control+End');
await page.keyboard.press('Enter');
await page.keyboard.type('# Rota');
await page.keyboard.press('Enter');
await page.keyboard.type('The rota is weekly.');
await T(300);
const lit2 = await row();
await page.click('#proserow [data-act="row-commit"]');
await T(900);
const two = await serverText();
const WANT = FIRST + '\n# Rota\nThe rota is weekly.';
const twoOk = lit2.there && !lit2.disabled && two.text === WANT;
say('heading    · ' + (twoOk ? '`# ` makes a heading that holds its own words, and Enter after it starts a paragraph'
  : 'FAIL: ' + JSON.stringify({ lit: lit2, server: two.text, wanted: WANT })));
if (!twoOk) stuck.push('a typed heading and the paragraph after it');

// ---- and it is there after a reload ----------------------------------------
await page.reload();
await page.waitForSelector('#ridetab .achip[data-tab="text"]', { timeout: 15000 });
await T(1200);
const back = await page.evaluate(() => [...document.getElementById('prose').children].map((b) => b.textContent));
const backOk = JSON.stringify(back) === JSON.stringify([FIRST, 'Rota', 'The rota is weekly.']);
say('reload     · ' + (backOk ? 'the column comes back as three blocks, the heading a heading' : 'FAIL: ' + JSON.stringify(back)));
if (!backOk) stuck.push('the column after a reload');

say('errors     · ' + (errors.length ? errors.join(' | ') : 'none'));
say('refused    · ' + (refused.length ? refused.join(' | ') : 'none'));
if (errors.length) stuck.push('page errors');
if (refused.length) stuck.push('refused requests');

await browser.close();
if (stuck.length) { say('\n✗ first-keys-walk: ' + stuck.join('; ')); process.exit(1); }
say('\n✓ the first keys reach the server');
