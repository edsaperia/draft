/**
 * An applicant, end to end, against a **running server** — the one walk this
 * project has never had.
 *
 * Q900 is why it exists. Entry 94 re-typed 🪪 from the register card into the
 * price of admission; the register's list moved and the *admit judgment* was
 * left on a clause nothing rendered any more. An application could be
 * submitted to a live document and no member could ever judge it — and every
 * harness stayed green, because `journey`, `founding-walk`, `slug-walk`, both
 * probes and `card-audit` drive a founding and **none of them has ever had an
 * applicant in it**. A defect invisible to the whole guard set is what a new
 * guard is for.
 *
 *   npm run server            # in another shell, with a dev outbox
 *   node scripts/applicants-walk.mjs [<base-url>]
 *        # the base defaults to DRAFT_BASE_URL, then PORT, then 8140
 *   node scripts/applicants-walk.mjs --price=assembly
 *   node scripts/applicants-walk.mjs --price=pen
 *
 * CI's `walks` job runs all three prices at every push, against a dev server
 * it boots itself and hands to all four walks (Q917 (a)).
 *
 * It drives the **birth** through the surface, because the save is a real POST
 * and a real magic link and no fixture reaches it; then it sets the rest of the
 * constitution over the wire with the founder's own pen, because this walk is
 * not about the founding and `journey` already covers it card by card. The
 * assertions are all back on the surface, which is where the defect was.
 *
 * What it asserts, per 🪪's price:
 *   proposal  — the applicant raises a **task**: a rail entry naming them, a
 *               row under *Applicants*, and a card offering the three lanes —
 *               *Admit them* against the membership as it stands, ✓ to file it.
 *   assembly  — the same task, in its 🏛️ form: the consent picks, with a
 *               refusal among them, committing on the assembly hold (entry 78).
 *   pen       — no task and no applicant row; **news**, with an OK, they having
 *               joined the moment they opened the link (Q894–Q896), which is
 *               also why the card names them by their address: they have given
 *               no name, having never filled an application in.
 */
import { chromium } from 'playwright';
import { assertServerBuild, walkBase } from './lib/assert-server.mjs';

const BASE = walkBase(process.argv, process.env, 'http://127.0.0.1:8140');
const PRICE = (process.argv.find((a) => a.startsWith('--price=')) || '--price=proposal')
  .split('=')[1];
if (!['proposal', 'assembly', 'pen'].includes(PRICE)) {
  console.log('FAIL: --price must be proposal, assembly or pen');
  process.exit(1);
}
const say = (...a) => console.log(...a);
const stuck = [];
const T = (ms) => new Promise((r) => setTimeout(r, ms));

// Q911: a walk on a default port will drive whatever process is listening,
// and a stale one serves today's page over a week-old engine — so the first
// thing this does is refuse a server that is not this tree.
await assertServerBuild(BASE, 'applicants-walk');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

const open = async (k) => {
  const sel = `#rail [data-card="${k}"], #rail [data-q="${k}"], #doc [data-card="${k}"]`;
  const el = await page.$(sel);
  if (!el) return false;
  await el.scrollIntoViewIfNeeded();
  await el.click();
  await T(450);
  return true;
};
// **What a press is depends on the gesture** (backlog 184): under `hold` a
// commit needs a real pointer held down, not a `.click()`; under `click` the
// click starts the flight and `ms` is the flight's own length, with nothing to
// let go of. Asked of the page, so this walk follows `COMMIT_GESTURE` wherever
// it is set. Holding under `click` would still land the act — the browser
// synthesises a click on mouseup — but a whole flight *later*, so the walk
// would read the surface before the commit arrived.
const pageGesture = () => page.evaluate(() => (window.SESSION && window.SESSION.gesture) || 'hold');
const press = async (ms) => {
  const b = await page.$('.setupcard .commitrow .btn-approve, .setupcard .commitrow [data-confirm]');
  if (!b) return false;
  await b.scrollIntoViewIfNeeded();
  const box = await b.boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  if (await pageGesture() === 'click') {
    await page.mouse.click(cx, cy);
    await T(ms);
  } else {
    await page.mouse.down();
    await T(ms);
    await page.mouse.up();
  }
  await T(500);
  return true;
};
const typeIn = async (sel, text) => {
  const el = await page.$(sel);
  if (!el) return false;
  await el.click();
  await page.keyboard.type(text, { delay: 8 });
  return true;
};

/* ---- the birth, through the surface ---------------------------------- */
const TITLE = 'Applicants ' + Date.now();
await page.goto(BASE + '/');
await T(800);
await open('title');
await typeIn('.setupcard [data-titlelane]', TITLE);
await press(1250);
await open('slug');
await press(1250);
await open('myemail');
await typeIn('.setupcard input[type="email"]', 'ada@example.org');
await press(1250);
await T(1600);

const outbox = async () => (await (await fetch(BASE + '/api/dev/outbox')).json());
const ob = await outbox();
const mails = (ob.mails || ob).filter((m) => JSON.stringify(m).includes(TITLE));
if (!mails.length) {
  say('FAIL: no creation mail for', TITLE, '— is this server using a dev outbox?');
  await browser.close();
  process.exit(1);
}
const link = (JSON.stringify(mails[mails.length - 1]).match(/http:[A-Za-z0-9_?=/:.-]+/) || [])[0];
await page.goto(link);
for (let i = 0; i < 40 && !page.url().includes('/d/'); i++) await T(500);
await T(1800);
const SLUG = (page.url().match(/\/d\/([^/?#]+)/) || [])[1];
// **A cookie belongs to an origin, and the magic link picks the origin.** The
// mail is built from the server's own baseUrl, so following it can land the
// page on `localhost` while the walk was started at `127.0.0.1`. Navigating
// back to the argument's host would arrive with no seat and read as the
// stranger's door — which is what this walk did on its first outing, and what
// it would have reported as the product losing the founder's seat on reload.
const DOCBASE = new URL(page.url()).origin;
say('birth      · saved at ' + DOCBASE + '/d/' + SLUG);

/* ---- the rest of the constitution, over the wire --------------------- */
// The founder holds the pen on everything at this point, so each of these is
// one `set-setting`. This walk is not about the founding; `journey` is.
const cmd = (op, args) => page.evaluate(async ([slug, op2, args2]) => {
  const r = await fetch(`/api/d/${slug}/cmd`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ cmd: op2, args: args2 }),
  });
  return { status: r.status, body: await r.json().catch(() => null) };
}, [SLUG, op, args]);

const SETTINGS = [
  ['ending', { endsAtMs: null }],
  ['pace', { shape: 'fixed' }],
  ['bar', { pct: 60 }],
  ['quorum', { form: 'count', n: 1 }],
  ['authorship', { rung: 'sealed' }],
  ['judgments', { rung: 'after' }],
  ['chamber', { rung: 'link' }],
  ['lapse', { afterMs: null }],
  ['removal', { price: 'proposal' }],
  ['rate', { grant: 4, cap: 8, dripMinutes: 240 }],
  ['machines', { enabled: false, budget: 0 }],
  ['applications', { apply: true }],
  ['admission', { price: PRICE }],
];
for (const [id, value] of SETTINGS) {
  const r = await cmd('set-setting', { setting: id, value });
  if (r.status !== 200) {
    say('FAIL: set-setting ' + id + ' → ' + r.status + ' ' + JSON.stringify(r.body));
    stuck.push('set ' + id);
  }
}
await cmd('set-convenor-membership', { isMember: true });
await cmd('confirm-starting-text', { text: 'The clubhouse shall be kept open.' });
const begun = await cmd('begin', {});
if (begun.status !== 200) {
  say('FAIL: begin → ' + begun.status + ' ' + JSON.stringify(begun.body));
  stuck.push('begin');
}
say('founded    · 🪪 ' + PRICE + ', 🤝 anyone may apply, begun');

/* ---- a stranger applies ---------------------------------------------- */
const APPLICANT = 'rowan@example.org';
const NAME = 'Rowan Vale';
const knock = await page.evaluate(async ([slug, email]) => {
  const r = await fetch(`/api/d/${slug}/apply`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return { status: r.status, body: await r.json().catch(() => null) };
}, [SLUG, APPLICANT]);
if (knock.status !== 200 || !knock.body || !knock.body.devLink) {
  say('FAIL: the door refused the knock → ' + knock.status + ' ' + JSON.stringify(knock.body));
  stuck.push('the knock');
} else {
  // **A seat is a cookie, and there is one per document** — so the applicant
  // needs a context of its own or it logs the founder out of their own page,
  // which is what this walk did on its first outing.
  const guestCtx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const guest = await guestCtx.newPage();
  guest.on('pageerror', (e) => errors.push('applicant: ' + String(e)));
  await guest.goto(knock.body.devLink);
  await T(1800);
  // **At ✒️ the link is the joining** (Q894–Q896): `/auth/apply` admits the
  // visitor on arrival, so there is no application left to submit and the
  // command is rightly refused. They have given no name either, which is why
  // the news card names them by the address they knocked with.
  if (PRICE === 'pen') {
    say('applicant  · ' + APPLICANT + ' opened the link and was admitted on arrival');
  } else {
    const sub = await guest.evaluate(async ([slug, name]) => {
      const r = await fetch(`/api/d/${slug}/cmd`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ cmd: 'submit-application', args: { name, words: 'I bake.' } }),
      });
      return { status: r.status, body: await r.json().catch(() => null) };
    }, [SLUG, NAME]);
    if (sub.status !== 200) {
      say('FAIL: submit-application → ' + sub.status + ' ' + JSON.stringify(sub.body));
      stuck.push('submit');
    }
    say('applicant  · ' + NAME + ' verified and submitted');
  }
  await guestCtx.close();
}
// who the surface should name: the name they gave, or — where arrival was the
// joining — the address they knocked with
const CALLED = PRICE === 'pen' ? APPLICANT : NAME;

/* ---- what the founder is served -------------------------------------- */
await page.goto(DOCBASE + '/d/' + SLUG);
await T(2500);

const seen = await page.evaluate(() => ({
  rail: [...document.querySelectorAll('#rail li')].map((li) => ({
    k: li.dataset.q || (li.querySelector('[data-card]') || { dataset: {} }).dataset.card || null,
    t: (li.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60),
  })),
  subs: [...document.querySelectorAll('.csec h2.lvl3')].map((h) => h.textContent.trim()),
  applicantRows: (() => {
    const h = [...document.querySelectorAll('.csec h2.lvl3')]
      .find((x) => /Applicants/.test(x.textContent));
    if (!h || !h.nextElementSibling) return -1;
    // real applicants only: since entry 183 an empty *Applicants* subsection
    // carries its own `.memrow.nobody` placeholder — *(no applicants at the
    // moment)* — so counting every `.memrow` reported one applicant where the
    // document has none, which is exactly the ✒️ case this walk asserts.
    // `journey-walk` and `ladder-walk` already filter it; this one did not.
    return h.nextElementSibling.querySelectorAll('.memrow:not(.nobody)').length;
  })(),
}));

const admEntry = seen.rail.find((e) => e.k && e.k.startsWith('adm:'));

say('rail       · ' + JSON.stringify(seen.rail.map((e) => e.k)));
say('subsections· ' + JSON.stringify(seen.subs));
say('applicants · ' + seen.applicantRows + ' row(s) under the heading');

if (!seen.subs.some((s) => /Applicants/.test(s))) {
  say('FAIL: no *Applicants* subsection, though 🤝 allows applications');
  stuck.push('the Applicants subsection');
}
if (seen.applicantRows !== (PRICE === 'pen' ? 0 : 1)) {
  say('FAIL: expected ' + (PRICE === 'pen' ? 0 : 1) + ' applicant row, saw ' + seen.applicantRows +
    (PRICE === 'pen' ? ' — at ✒️ they are a member, not an applicant' : ''));
  stuck.push('the applicant row');
}
if (!admEntry) {
  say('FAIL: the application raised no entry in the rail — this is Q900\'s shape');
  stuck.push('the rail entry');
} else if (!admEntry.t.includes(CALLED)) {
  say('FAIL: the rail entry does not name the applicant: ' + JSON.stringify(admEntry.t));
  stuck.push('the entry names them');
} else {
  say('entry      · ' + JSON.stringify(admEntry.t));
}

if (admEntry) {
  await open(admEntry.k);
  const card = await page.evaluate(() => {
    const c = document.querySelector('.setupcard');
    if (!c) return null;
    return {
      lanes: [...c.querySelectorAll('.lanepick span:last-child')].map((s) => s.textContent.trim()),
      ok: !!c.querySelector('[data-ok]'),
      tick: !!c.querySelector('[data-admitgo], [data-confirm]'),
      // which commit the card offers is the whole difference between the two
      // priced forms: a 🏛️ hold answers a question, a ✓ files a judgment
      commit: c.querySelector('[data-admitgo]') ? 'admitgo'
        : c.querySelector('[data-confirm]') ? 'confirm'
        : c.querySelector('[data-ok]') ? 'ok' : null,
      text: (c.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 160),
    };
  });
  say('card       · ' + JSON.stringify(card));
  if (!card) { say('FAIL: the entry opened no card'); stuck.push('the card opens'); }
  else if (PRICE === 'pen') {
    if (!card.ok) { say('FAIL: at ✒️ the card is news and commits with OK'); stuck.push('the OK'); }
  }
  /* **Three lanes is not three of the same lanes** (entry 78, promise-coverage
   * 🪪/🤝). Both priced forms of the admit card draw three `.lanepick`s, so a
   * bare count cannot tell 🪪 *assembly* from 🪪 *proposal* — and the promise
   * each price makes is a different promise. At *assembly* nobody joins
   * without everyone's consent: the card is a 🏛️ question with a refusal
   * among its answers and it commits on the assembly hold. At *proposal* the
   * membership decides at the threshold: the card is a judgment between the
   * applicant and the membership as it stands, and it commits with ✓. The
   * seat matrix cannot say this — it asserts *who carries the entry*, not what
   * the card asks — so it is asserted here, per price. */
  const FORM = {
    assembly: { want: ['I would rather they did not', 'I accept them joining', 'Abstain'],
      commit: 'confirm', called: 'a 🏛️ question' },
    proposal: { want: ['Admit them', 'Keep the membership as it is', 'Indifferent'],
      commit: 'admitgo', called: 'a judgment at the threshold' },
  }[PRICE];
  if (FORM && card) {
    let formOk = true;
    if (JSON.stringify(card.lanes) !== JSON.stringify(FORM.want)) {
      say('FAIL: at 🪪 ' + PRICE + ' the card should be ' + FORM.called + ' — ' +
        JSON.stringify(FORM.want) + ', saw ' + JSON.stringify(card.lanes));
      stuck.push('the ' + PRICE + ' lanes');
      formOk = false;
    }
    if (card.commit !== FORM.commit) {
      say('FAIL: at 🪪 ' + PRICE + ' the card should commit as ' + FORM.commit +
        ', saw ' + JSON.stringify(card.commit));
      stuck.push('the ' + PRICE + ' commit');
      formOk = false;
    }
    // the readout is about *this* pair of checks: an unrelated failure earlier
    // in the walk must not silence what the form turned out to be
    if (formOk) say('form       · ' + FORM.called + ', committing on ' + card.commit);
  }
  if (card && !card.text.includes(CALLED)) {
    say('FAIL: the card does not name the applicant');
    stuck.push('the card names them');
  }

  /* **The OK sticks across a reload** (Q912 (a), Ed 2026-08-26). At ✒️ the
   * card is news, and its OK confers no power — so W6's *every
   * acknowledgement that confers a power persists* does not reach it and it
   * was session-local. C8 governs instead: a decision you had no say in is
   * owed an OK, and reading is not enough — which an OK that comes back
   * after every reload makes a nonsense of, asking the same member to
   * acknowledge the same joiner for ever. `adm:<applicant>` cannot be a
   * literal in ACK_KEYS, there being one per joiner, so this is the only
   * thing standing between that rule and a quiet regression. */
  if (PRICE === 'pen' && card && card.ok) {
    await page.evaluate(() => {
      const b = document.querySelector('.setupcard [data-ok]');
      if (b) b.click();
    });
    await T(900);
    await page.reload({ waitUntil: 'load' });
    await T(2500);
    const backAgain = await page.evaluate(() => [...document.querySelectorAll('#rail .qitem')]
      .some((li) => /^adm:/.test((li.querySelector('[data-card]') || { dataset: {} }).dataset.card || '')));
    say('the OK     · ' + (backAgain ? 'FAIL: the news came back after a reload'
      : 'dismissed, and still gone after a reload'));
    if (backAgain) stuck.push('the news returns after a reload');
  }
}

if (errors.length) { say('page errors· ' + JSON.stringify(errors)); stuck.push('page errors'); }
say(stuck.length ? '\nFAILED: ' + stuck.join(' · ') : '\nok — an applicant reaches the membership');
await browser.close();
process.exit(stuck.length ? 1 : 0);
