/**
 * **The phase ladder, walked** (Q677): press ⏭ five times against a running
 * server and assert the surface at each rung — birth → constitution → ready
 * → session → closing → closed.
 *
 * It drives the **bar**, not the route, because the bar is the thing a person
 * uses: a walk that posted to `/api/dev/ladder` itself would prove the ladder
 * and nothing about whether the control that runs it works. And it asserts the
 * *surface* at each rung rather than the ladder's own report of what it built,
 * for the reason `journey-walk.mjs` gives about the wire: a stagehand that
 * says it built thirty proposals and a page that draws none of them agree with
 * each other and are both wrong.
 *
 *   npm run server          # in another shell, without a Resend key
 *   npm run ladder [<base-url>] [--to=session] [--seed=42]
 *        # the base defaults to DRAFT_BASE_URL, then PORT, then 8140
 *
 * CI's `walks` job runs this at every push, against a dev server it boots
 * itself with no Resend key, which is what gives the bar its ⏭ (Q917 (a)).
 *
 * `--to` stops at a rung and leaves the document standing, which is the
 * eyeballing mode; bare, it walks the whole ladder and exits non-zero on the
 * first rung that fails. Like every walk here it cannot assert anything that
 * depends on an animation completing: the automation tab is backgrounded, so
 * rAF never fires.
 */
import { chromium } from 'playwright';
import { assertServerBuild, walkBase } from './lib/assert-server.mjs';

const BASE = walkBase(process.argv, process.env, 'http://127.0.0.1:8140');
const arg = (name) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit === undefined ? null : hit.slice(name.length + 3);
};
const STOP = arg('to');
const SEED = arg('seed') ?? String(Math.floor(Math.random() * 1e6));
const RUNGS = ['constitution', 'ready', 'session', 'closing', 'closed'];

const say = (...a) => console.log(...a);
const fails = [];
const check = (rung, what, ok, detail = '') => {
  say(`   ${ok ? '·' : '✗'} ${what}${detail ? ` — ${detail}` : ''}`);
  if (!ok) fails.push(`${rung}: ${what}${detail ? ` (${detail})` : ''}`);
};

// Q911: a walk on a default port will drive whatever process is listening,
// and a stale one serves today's page over a week-old engine — so the first
// thing this does is refuse a server that is not this tree.
await assertServerBuild(BASE, 'ladder-walk');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });

// the two nets journey-walk established: a page error is a failure, and so is
// a refused command even where the surface recovers from it
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
const refused = [];
page.on('response', (r) => {
  if (r.url().includes('/api/') && r.status() >= 400) {
    refused.push(`${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`);
  }
});

const T = (ms) => page.waitForTimeout(ms);
/** What the ladder's own bar says it is looking at. */
const barPhase = () => page.evaluate(() => {
  const bar = document.getElementById('ladderbar');
  return bar === null ? null : (bar.querySelector('span')?.textContent ?? '').trim();
});

/** Press ⏭ and wait for the page it lands on. */
async function pressNext() {
  const btn = await page.$('#ladnext');
  if (btn === null) throw new Error('the ladder bar has no ⏭ — is the server in dev mail mode?');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60_000 }),
    btn.click(),
  ]);
  await T(700); // the page hydrates from its first view, then draws
}

say(`ladder-walk against ${BASE}, seed ${SEED}`);
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await T(600);

// the seed goes in before the first press, so the walk is reproducible
const seedBox = await page.$('#ladseed');
if (seedBox === null) {
  say('✗ no ladder bar on the birth page — the dev routes are not being served');
  await browser.close();
  process.exit(1);
}
await seedBox.fill(SEED);

for (const rung of RUNGS) {
  say(`\n⏭ ${rung}`);
  await pressNext();
  const phase = await barPhase();
  check(rung, 'the bar reports the rung', (phase ?? '').startsWith(rung), phase ?? 'no bar');
  await assertSurface(rung);
  if (STOP === rung) { say(`\nstopped at ${rung}: ${page.url()}`); break; }
}

check('walk', 'no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
check('walk', 'no refused api calls', refused.length === 0, refused.slice(0, 3).join(' | '));

await browser.close();
if (fails.length > 0) {
  say(`\n✗ ${fails.length} failed:\n   ${fails.join('\n   ')}`);
  process.exit(1);
}
say('\n✓ the ladder walks');

/** Open a card from the rail and press its OK, the way a founder does. */
async function okThe(key) {
  await page.evaluate((k) => {
    document.querySelector(`#rail [data-card="${k}"], #band [data-tab="${k}"]`)?.click();
  }, key);
  await T(500);
  await page.evaluate(() => {
    const ok = document.querySelector('[data-ok]');
    if (ok !== null) { ok.scrollIntoView({ block: 'center' }); ok.click(); }
  });
  await T(600);
}

/** Everything the rungs are judged on, in one pass over the page.
 *  A declaration, not a const: the walk above calls it, and a const here
 *  is in its own temporal dead zone by then. */
function measure() {
  return page.evaluate(() => {
  const q = (s) => document.querySelectorAll(s).length;
  const clock = document.querySelector('#sessclock, .sessclock, #clock');
  return {
    railEntries: q('#rail li'),
    // what the rail is *holding*, not just how much: a rung that fails on
    // "🍾 is not offered" is unreadable without the two entries standing in
    // front of it
    railKeys: [...document.querySelectorAll('#rail li')].map((li) => li.dataset.q ||
      (li.querySelector('[data-card]') ?? { dataset: {} }).dataset.card || '?'),
    bandTabs: q('#band [data-tab]'),
    clauses: q('#charter .editable, #prose .editable'),
    clauseTabs: q('.achip'), // the clause tab in the chip-gutter
    beginTask: q('#rail [data-card="begin"], #band [data-tab="begin"]'),
    penTask: q('#rail [data-card="grant-pen"], #band [data-tab="grant-pen"]'),
    wallet: q('#wallet i'),
    // real people only: `.memrow.nobody` is the empty-list placeholder, so
    // counting every `.memrow` let "the membership is drawn" pass on a
    // membership of nobody (Q757)
    members: q('.memrow:not(.nobody)'),
    closedPage: q('.doc.closedpage'),
    signatures: /Signature/i.test(document.body.textContent ?? '') ? 1 : 0,
    clockText: (clock?.textContent ?? '').trim(),
    // the *shown* title: from the save the name stands at the head of the
    // prose column (#dochead) and the pre-save heading above the constitution
    // is gone (backlog 33), so a walk that only ever asked #doctitle would be
    // reading a hidden element on every rung it checks
    title: ((document.querySelector('#dochead') ?? document.querySelector('#doctitle'))
      ?.textContent ?? '').trim(),
    };
  });
}

/** What each rung owes the reader, measured on the page rather than reported. */
async function assertSurface(rung) {
  const m = await measure();

  if (rung === 'constitution') {
    check(rung, 'the document has its name', m.title.length > 0 && m.title !== 'Untitled', m.title);
    check(rung, 'the constitution stands in the band', m.bandTabs > 0, `${m.bandTabs} tabs`);
  }
  // **The founding never runs out of tasks before 🍾** (Q777, Ed 2026-08-25).
  // `constitution` has checked its rail since it was written; the rungs after
  // it never did, and `ready` is the one where a founder actually stands —
  // everything is set, the questions are out, and the rail is the only thing
  // saying whether there is anything left to do. Checked on **every** rung
  // before the cork, and both sides of the pen's OK on `ready`, because the
  // acknowledgement is what releases the rest of the constitution.
  if (rung === 'constitution' || rung === 'ready') {
    check(rung, 'the rail is not empty before 🍾', m.railEntries > 0, `${m.railEntries} entries`);
  }
  if (rung === 'ready') {
    // **The ✒️ grant is the one blocking grant** (`blocksOrder`), and its OK
    // lives in the browser rather than the log — so the ladder cannot press
    // it and every fresh browser meets it first. That is the design working:
    // the founding order withholds what is below it until the founder has
    // seen what they have been handed. So the walk does what a founder does.
    check(rung, 'the ✒️ grant is waiting to be acknowledged', m.penTask > 0);
    check(rung, 'and the constitution below it is withheld', m.beginTask === 0);
    await okThe('grant-pen');
    const after = await measure();
    check(rung, 'and the rail still holds something afterwards', after.railEntries > 0,
      `${after.railEntries} entries`);
    check(rung, 'acknowledging the pen releases the constitution',
      after.bandTabs > m.bandTabs, `${m.bandTabs} → ${after.bandTabs} tabs`);
    check(rung, 'the membership is drawn', after.members > 1, `${after.members} rows`);
    // **…and the same for 🏛️** (Q777). The ladder's document delegates, so the
    // founder is served their own first blind question and the voice that
    // arrives with it — and F5 holds 🍾 back while 🏛️ is still being served.
    // The OK lives in the browser like the pen's, so the ladder cannot press
    // it either. (Before Q775 this rung reached 🍾 without ever meeting 🏛️,
    // because `ansDue()` was false: 🪜 was owed by a hand nothing could ask.)
    await okThe('grant-voice');
    const armed = await measure();
    // **the rung stops one press short of the cork** (Q678) — 🍾 is offered,
    // not spent, and the whole point is that the press is the reader's
    check(rung, '🍾 is offered and not yet pressed', armed.beginTask > 0,
      JSON.stringify(armed.railKeys));
  }
  if (rung === 'session') {
    check(rung, 'the charter is drawn', m.clauses > 10, `${m.clauses} blocks`);
    check(rung, 'clauses carry their tabs', m.clauseTabs > 5, `${m.clauseTabs}`);
    check(rung, 'the rail has judging to offer', m.railEntries > 0, `${m.railEntries} entries`);
    check(rung, 'the ✏️ wallet is drawn', m.wallet > 0, `${m.wallet}`);
    check(rung, 'the membership is drawn', m.members > 1, `${m.members} rows`);
  }
  if (rung === 'closing') {
    check(rung, 'the clock is counting down', /m|min|hour|h\b/i.test(m.clockText), m.clockText);
  }
  if (rung === 'closed') {
    check(rung, 'the page is the closed one', m.closedPage > 0);
    check(rung, 'the signatures are on it', m.signatures > 0);
  }
}
