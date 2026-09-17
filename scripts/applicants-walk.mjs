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
 *   assembly  — the same task, in its 🏛️ form: the consent card's three
 *               blocks (Q1182, T48) — the membership as it stands, the
 *               applicant joining, Abstain — committing on the assembly hold
 *               (entry 78).
 *   proposal
 *   assembly  — and, once submitted, their card stands whatever the door says
 *               (Q1357, Ed 2026-09-14): 🤝 is shut with the founder's pen and
 *               opened again, and the applicant's rail carries the same Apply
 *               card, the same count and the same state at every reading.
 *   pen       — no task and no applicant row; **news**, with an OK, they having
 *               joined the moment they opened the link (Q894–Q896), which is
 *               also why the card names them by their address: they have given
 *               no name, having never filled an application in.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { chromium } from 'playwright';
import { assertServerBuild, walkBase } from './lib/assert-server.mjs';
import { say, sleep as T, linkIn, outbox as devOutbox, onPage } from './lib/walk.mjs';

// The card's words come from `design/copy.js`, read here the way copy-check
// reads it — evaluated in a bare context, so the assertion is the file's own
// strings against what the page rendered, never a literal that drifts the
// next time the copy moves (which is how the assembly assertion went red on
// every push from 2026-09-05, Q1182 having rewritten the consent card).
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const COPY = (() => {
  const ctx = { window: {} };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(readFileSync(join(ROOT, 'design', 'copy.js'), 'utf8'), ctx, { filename: 'copy.js' });
  return ctx.window.COPY;
})();

const BASE = walkBase(process.argv, process.env, 'http://127.0.0.1:8140');
const PRICE = (process.argv.find((a) => a.startsWith('--price=')) || '--price=proposal')
  .split('=')[1];
if (!['proposal', 'assembly', 'pen'].includes(PRICE)) {
  console.log('FAIL: --price must be proposal, assembly or pen');
  process.exit(1);
}
const stuck = [];
// the applicant's seat outlives its section at ✒️ (Q1375): they leave at the
// end, and the founder's rail is read for the 🥾 entry that names them
let guestResign = null;
let guestSeat = null;
let closeGuest = async () => {};

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
// `pageGesture` and `clickIn` are the walks' shared ones (scripts/lib/walk.mjs);
// `press`, `open` and `typeIn` below are this walk's own — the door's commit
// is found by its class, and its fields are typed with real keystrokes
const { pageGesture } = onPage(page);
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
// which card the surface has open, for the birth's own failure line: a birth
// that did not go through has stopped *somewhere*, and naming where is the
// difference between a red step and an afternoon
const openCardKey = () => page.evaluate(() => {
  const c = document.querySelector('.setupcard');
  return c ? (c.dataset.k || (c.querySelector('[data-tab]') || { dataset: {} }).dataset.tab || 'some card') : null;
});

/* ---- the birth, through the surface ---------------------------------- */
const TITLE = 'Applicants ' + Date.now();
await page.goto(BASE + '/');
await T(800);
await open('title');
await typeIn('.setupcard [data-titlelane]', TITLE);
await press(1250);
say('birth      · 📝 title pressed');
await open('slug');
await press(1250);
say('birth      · 📍 slug pressed');
await open('myemail');
await typeIn('.setupcard input[type="email"]', 'ada@example.org');
await press(1250);
say('birth      · 📧 sent');
await T(1600);

const ob = await devOutbox(BASE);
const held = (ob.mails || ob);
const mails = held.filter((m) => JSON.stringify(m).includes(TITLE));
if (!mails.length) {
  // **A failure line that asks a question is a failure line nobody can act
  // on** (entry 203). This one said only *is this server using a dev outbox?*
  // for three CI runs, while the outbox was fine and the birth was stuck on
  // 🧭 — so it now says what it counted and where the surface had stopped.
  say('FAIL: no creation mail for ' + TITLE + ' — the outbox held ' + held.length +
    ' mail(s), none for this title; the open card was ' + JSON.stringify(await openCardKey()) +
    ' (null means the birth is done and the mail is genuinely missing)');
  await browser.close();
  process.exit(1);
}
const link = linkIn(mails[mails.length - 1]);
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
  /* **A door tab whose cookie becomes a member's is a different page**
   * (issue #11, F1). The second tab is the ordinary one: a phone at the
   * document's address while the magic link is opened from the mail beside
   * it — one cookie jar, two pages, and only the one that followed the link
   * knows anything happened. The other is at the door, and its poll is
   * answered with a member's payload. It used to seat itself at roster
   * index 0, which is the founder: the tab reported `amFounder` on somebody
   * else's cookie. Opened before the link is followed so the door page is
   * genuinely a stranger's first, and read after the link so what is under
   * test is the handover rather than the boot. */
  const doorPage = await guestCtx.newPage();
  doorPage.on('pageerror', (e) => errors.push('door tab: ' + String(e)));
  await doorPage.goto(DOCBASE + '/d/' + SLUG);
  await T(2500);
  await guest.goto(knock.body.devLink);
  await T(2200);
  // **At ✒️ the link is the joining** (Q894–Q896): `/auth/apply` admits the
  // visitor on arrival, so there is no application left to submit and the
  // command is rightly refused. They have given no name either, which is why
  // the news card names them by the address they knocked with.
  // the door tab, two polls later: whatever the cookie became, it is not the
  // founder, and at ✒️ — where the link is the joining — it is the new
  // member's own seat (issue #11, F1)
  await T(7000);
  const doorAfter = await doorPage.evaluate(() => (window.__founding ? window.__founding() : null))
    .catch((e) => ({ threw: String(e && e.message).split('\n')[0] }));
  say('door tab   · ' + JSON.stringify(doorAfter && { viewer: doorAfter.viewer, amFounder: doorAfter.amFounder }));
  if (!doorAfter || doorAfter.threw) {
    say('FAIL: the door tab\'s readout threw — ' + JSON.stringify(doorAfter && doorAfter.threw));
    stuck.push('the door tab');
  } else if (doorAfter.amFounder) {
    say('FAIL: a door tab whose cookie became somebody else\'s reports the founder\'s seat — viewer ' +
      JSON.stringify(doorAfter.viewer) + ' (issue #11, F1)');
    stuck.push('the door tab\'s seat');
  } else if (PRICE === 'pen' && !(typeof doorAfter.viewer === 'number' && doorAfter.viewer !== 0)) {
    say('FAIL: at ✒️ the door tab should be the new member\'s own seat, saw viewer ' +
      JSON.stringify(doorAfter.viewer) + ' (issue #11, F1)');
    stuck.push('the door tab\'s member seat');
  } else if (PRICE !== 'pen' && doorAfter.viewer !== 'applicant') {
    say('FAIL: at 🪪 ' + PRICE + ' the door tab should follow its cookie to the applicant seat, saw viewer ' +
      JSON.stringify(doorAfter.viewer) + ' (issue #11, F1)');
    stuck.push('the door tab\'s applicant seat');
  }
  await doorPage.close();
  if (PRICE === 'pen') {
    say('applicant  · ' + APPLICANT + ' opened the link and was admitted on arrival');
  } else {
    /* **The applicant's own page is read, not assumed** (Q1281, 2026-09-07).
     * This walk used to submit by `fetch` from inside the guest page and never
     * looked at what that page showed — and for as long as applicants have
     * existed the live page threw on its first `view.*` read and rendered
     * nothing, the error swallowed by `liveBoot`'s own catch so `pageerror`
     * never fired. So the seat is asserted first — the page booted as the
     * applicant and the rail holds their Apply card — and then the application
     * is filled in and submitted **on the surface**, the way an applicant does
     * it: the name card, the picture card (an emoji), the words, then Submit
     * on the Apply card, which goes over the wire as `submit-application`. */
    // a readout that throws is the dead page's own report — on the pre-fix
    // page `__founding()` itself threw inside `remoteCS`'s getters — so it is
    // caught and printed as the failure line rather than crashing the walk
    const guestFounding = () => guest.evaluate(() => (window.__founding ? window.__founding() : null))
      .catch((e) => ({ threw: String(e && e.message).split('\n')[0] }));
    const gf = await guestFounding();
    if (!gf || gf.viewer !== 'applicant') {
      say('FAIL: the applicant\'s page did not boot as the applicant seat — ' +
        (gf && gf.threw ? 'the readout threw: ' + gf.threw : 'viewer ' + JSON.stringify(gf && gf.viewer)) +
        ' (Q1281\'s shape: a dead page reads as nobody)');
      stuck.push('the applicant seat');
    } else if (!gf.rail.includes('apply')) {
      say('FAIL: the applicant\'s rail holds no Apply card: ' + JSON.stringify(gf.rail));
      stuck.push('the applicant\'s rail');
    } else {
      say('applicant  · the page booted as the applicant; rail ' + JSON.stringify(gf.rail));
    }
    // Playwright's own click, which re-queries and retries: the rail is
    // rebuilt wholesale on every poll, so a handle taken before the scroll
    // was detached by the time the click came (*Element is not attached to
    // the DOM*, two runs in four). A missing entry is false, not a throw.
    const openOn = async (k) => {
      const sel = `#rail [data-card="${k}"], #rail [data-q="${k}"]`;
      if (!(await guest.$(sel))) return false;
      await guest.click(sel, { timeout: 5000 });
      await T(450);
      return true;
    };
    const clickOn = async (sel) => {
      const ok = await guest.evaluate((s) => {
        const el = document.querySelector(s);
        if (!el || el.disabled) return false;
        el.scrollIntoView({ block: 'center' });
        el.click();
        return true;
      }, sel);
      await T(420);
      return ok;
    };
    const filled = [];
    // ✋ the name
    if (await openOn('appname')) {
      const inp = await guest.$('.setupcard input[data-appname]');
      if (inp) { await inp.click(); await guest.keyboard.type(NAME, { delay: 8 }); }
      if (!(await clickOn('.setupcard button[data-close]'))) filled.push('the name card would not close');
    } else filled.push('no ✋ card');
    // 🖼️ the picture: the emoji block, then the first free glyph in the grid
    if (await openOn('apppic')) {
      if (!(await clickOn('.setupcard [data-set="appPicPick"][data-val="emoji"]'))) filled.push('no emoji block on 🖼️');
      if (!(await clickOn('.setupcard button[data-apppic]:not([disabled])'))) filled.push('no glyph to pick on 🖼️');
      if (!(await clickOn('.setupcard button[data-close]'))) filled.push('the picture card would not close');
    } else filled.push('no 🖼️ card');
    // 👋 the words
    if (await openOn('apptext')) {
      const lane = await guest.$('.setupcard [data-apptext]');
      if (lane) { await lane.click(); await guest.keyboard.type('I bake.', { delay: 8 }); }
      if (!(await clickOn('.setupcard button[data-close]'))) filled.push('the words card would not close');
    } else filled.push('no 👋 card');
    if (filled.length) { say('FAIL: filling the application in — ' + filled.join(' · ')); stuck.push('the application'); }
    // 🪪 Submit — a plain click, not a hold (the application becomes an
    // ordinary motion; the assembly hold is the members', not the applicant's)
    if (!(await openOn('apply'))) { say('FAIL: no Apply card to submit from'); stuck.push('the Apply card'); }
    else if (!(await clickOn('.setupcard button[data-appsubmit]'))) {
      const why = await guest.evaluate(() => {
        const b = document.querySelector('.setupcard button[data-appsubmit]');
        return b ? 'Submit is dark' : 'no Submit button';
      });
      say('FAIL: Submit could not be pressed — ' + why); stuck.push('the Submit press');
    }
    // the wire answers, then the poll re-reads the record: `submitted` is what
    // the server said, and the card says so in words
    let after = null;
    for (let i = 0; i < 12; i++) {
      await T(500);
      after = await guestFounding();
      if (after && after.applicant && after.applicant.submitted) break;
    }
    const cardSays = await guest.evaluate(() => {
      const c = document.querySelector('.setupcard');
      return c ? (c.textContent || '').replace(/\s+/g, ' ').trim() : '';
    });
    if (!after || !after.applicant || !after.applicant.submitted) {
      say('FAIL: the application never read as submitted on the page — ' + JSON.stringify(after && after.applicant));
      stuck.push('submitted on the page');
    } else if (!/Submitted\./.test(cardSays)) {
      say('FAIL: the Apply card does not read as submitted: ' + JSON.stringify(cardSays.slice(0, 160)));
      stuck.push('the Apply card reads Submitted');
    } else {
      say('applicant  · ' + NAME + ' verified and submitted on the surface · ' +
        JSON.stringify((cardSays.match(/Submitted\.[^—]*/) || [''])[0].trim()));
    }

    /* **A submitted application's card stands whatever the door says**
     * (SURFACE Y28, Q1357, Ed 2026-09-14). 🤝 shut under a *verified*
     * applicant is E33's news — one sentence and an OK; shut under a
     * *submitted* one is nothing at all, the members going on voting on the
     * race their application already raised (`admit:<id>`, §9.7½). The rail
     * emptied anyway, taking the *n of E have voted on it* card with it, and
     * an open card is no answer: it is reachable only while it happens to be
     * open, which is the same defect Q901 fixed on the other side.
     *
     * The door is shut with the founder's own pen — `set-setting` on a
     * setting they hold, which is exactly what their 🤝 card commits — and
     * then opened again, because a card that comes back is not a card that
     * stood. The applicant's page is read three times and must say the same
     * thing each time; the reads wait out the 4s poll.
     *
     * Skipped where the submission itself did not land: what a card does
     * under a shut door is not a question about an application that was
     * never made, and the failure above is the one to read. */
    const submitted = !!(after && after.applicant && after.applicant.submitted);
    const railWhenOpen = ((after && after.rail) || []).join(',');
    const readRail = async (what) => {
      await T(5200);   // >4s: a poll lands carrying the founder's amendment
      const g = await guestFounding();
      const rail = (g && g.rail) || [];
      const says = await guest.evaluate(() => {
        const c = document.querySelector('.setupcard');
        return c ? (c.textContent || '').replace(/\s+/g, ' ').trim() : '';
      });
      if (!rail.includes('apply')) {
        say('FAIL: ' + what + ', the submitted applicant\'s rail lost their Apply card — ' +
          JSON.stringify(rail) + ' (Q1357: the door prices new applications, not a race already running)');
        stuck.push('the card stands ' + what);
      } else if (rail.join(',') !== railWhenOpen) {
        say('FAIL: ' + what + ', the submitted applicant\'s rail is not the rail they had — ' +
          JSON.stringify(rail) + ' was ' + JSON.stringify(railWhenOpen.split(',')));
        stuck.push('the rail stands ' + what);
      } else if (!/Submitted\./.test(says)) {
        say('FAIL: ' + what + ', the Apply card no longer reads as submitted: ' +
          JSON.stringify(says.slice(0, 160)));
        stuck.push('the count stands ' + what);
      } else {
        say('Q1357      · ' + what + ', the card stands · rail ' + JSON.stringify(rail) + ' · ' +
          JSON.stringify((says.match(/Submitted\.[^—]*/) || [''])[0].trim()));
      }
    };
    const closeDoor = submitted
      ? await cmd('set-setting', { setting: 'applications', value: { apply: false } })
      : { status: 0 };
    if (!submitted) say('Q1357      · skipped — nothing was submitted to stand');
    else if (closeDoor.status !== 200) {
      say('FAIL: the founder\'s pen could not shut 🤝 → ' + closeDoor.status +
        ' ' + JSON.stringify(closeDoor.body));
      stuck.push('shutting 🤝');
    } else {
      await readRail('🤝 shut');
      const openDoor = await cmd('set-setting', { setting: 'applications', value: { apply: true } });
      if (openDoor.status !== 200) {
        say('FAIL: the founder\'s pen could not reopen 🤝 → ' + openDoor.status +
          ' ' + JSON.stringify(openDoor.body));
        stuck.push('reopening 🤝');
      } else await readRail('🤝 open again');
    }
  }
  // the seat stays open for the resign at the end (Q1375); a member's own
  // *Leave* is `resign`, free and nobody's to refuse (E32)
  guestResign = () => guest.evaluate(async (slug) => {
    const r = await fetch(`/api/d/${slug}/cmd`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ cmd: 'resign', args: {} }),
    });
    return r.status;
  }, SLUG);
  // the seat the admitted applicant is served (Q1405): by the seat mail's
  // link where one is given — it swaps the `app:` cookie for the member's, as
  // the returning section's invitation does — else the page they already hold
  guestSeat = async (link) => {
    if (link) {
      await guest.goto(link);
      for (let i = 0; i < 40 && !guest.url().includes('/d/'); i++) await T(500);
    } else await guest.reload({ waitUntil: 'load' });
    await T(2500);
    return guest.evaluate(async () => {
      const v = await (await fetch(location.origin + '/api/d/' + location.pathname.split('/')[2] + '/view')).json();
      return {
        me: v.me || null,
        identity: (v.view && v.view.identity) || null,
        rail: [...document.querySelectorAll('#rail li')]
          .map((li) => li.dataset.q || (li.querySelector('[data-card]') || { dataset: {} }).dataset.card || null),
      };
    });
  };
  closeGuest = () => guestCtx.close();
}
// who the surface should name: the name they gave, or — where arrival was the
// joining — the address they knocked with
const CALLED = PRICE === 'pen' ? APPLICANT : NAME;

/* ---- what the founder is served -------------------------------------- */
await page.goto(DOCBASE + '/d/' + SLUG);
await T(2500);

// **A task waits behind the grant its main action needs** (Q1328, Q1344). At
// 🏛️ the application is a constitutional motion, so a member's rail must
// not hold it until the 🏛️ grant is acknowledged — and must once it is.
// Asserted at `assembly`; the OK itself is pressed at every price, being the
// member's own act rather than the price's, so the rest of the walk reads a
// rail with the grant taken up, as journey's does.
{
  const railKeys = () => page.evaluate(() => [...document.querySelectorAll('#rail li')]
    .map((li) => li.dataset.q || (li.querySelector('[data-card]') || { dataset: {} }).dataset.card || null));
  const before = await railKeys();
  if (PRICE === 'assembly') {
    const early = before.find((k) => k && k.startsWith('adm:'));
    if (early) {
      say('FAIL: the admit motion was served before the 🏛️ OK (Q1344) · rail ' + JSON.stringify(before));
      stuck.push('the entry waits on 🏛️');
    } else say('waits      · no admit entry before the 🏛️ OK · rail ' + JSON.stringify(before));
  }
  if (before.includes('grant-voice')) {
    const pressed = (await open('grant-voice')) && await page.evaluate(() => {
      const b = document.querySelector('.setupcard [data-ok]');
      if (!b || b.disabled) return false;
      b.scrollIntoView({ block: 'center' });
      b.click();
      return true;
    });
    if (!pressed) { say('FAIL: no OK to press on the 🏛️ grant card'); stuck.push('the 🏛️ OK'); }
    else say('🏛️ OK     · pressed on the grant card');
    await T(5000); // >4s: a poll lands carrying the acknowledgement
  }
}

const seen = await page.evaluate(() => ({
  rail: [...document.querySelectorAll('#rail li')].map((li) => ({
    k: li.dataset.q || (li.querySelector('[data-card]') || { dataset: {} }).dataset.card || null,
    t: (li.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60),
    // an entry about a person leads with their face (Q1375): the rail's
    // `.qface` on the mark's own line
    face: !!li.querySelector('.ql .qface'),
    st: ((li.querySelector('button') || { className: '' }).className.match(/st-\w+/) || [''])[0],
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
  say('entry      · ' + JSON.stringify(admEntry.t) + (admEntry.face ? ' · with their face' : ''));
}
// **the entry leads with their face** (Q1375, Ed 2026-09-15: *[avatar] [name]
// has left, and similar with other member-related queue cards*): the admit
// entry is about a person, so it carries the rail's `.qface` before the words
if (admEntry && !admEntry.face) {
  say('FAIL: the admit entry carries no face beside the name (Q1375)');
  stuck.push('the entry\'s face');
}
// **and at ✒️ the sentence is theirs, not a title** (Q1375): *‹address› has
// joined*, since arrival was the joining and no name was chosen
if (admEntry && PRICE === 'pen' && !/ has joined$/.test(admEntry.t)) {
  say('FAIL: at ✒️ the entry should read *‹who› has joined*, saw ' + JSON.stringify(admEntry.t));
  stuck.push('the joined sentence');
}

if (admEntry) {
  await open(admEntry.k);
  const card = await page.evaluate(() => {
    const c = document.querySelector('.setupcard');
    if (!c) return null;
    return {
      // the lane's name is the block's text since CP1 (2026-08-31) — every
      // radio reads *Prefer this*; a textless block's button names the act
      // the radio's own word: a two-state radio holds its *off* and *on*
      // labels in two spans and shows one, so the visible one is read —
      // `textContent` on the button would join them (*AbstainAbstain*)
      lanes: [...c.querySelectorAll('.lanepick')].map((b) => {
        const p = b.closest('.pick');
        const t = p && p.querySelector('.opttext');
        const off = b.querySelector('.off');
        return ((t && t.textContent) || (off && off.textContent) || b.textContent).trim();
      }),
      // what each radio says unpressed (T48: the act it stands for)
      radios: [...c.querySelectorAll('.lanepick')].map((b) => {
        const off = b.querySelector('.off');
        return ((off && off.textContent) || b.textContent).trim();
      }),
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
   * without everyone's consent: the card is a 🏛️ question in the settled
   * two-block grammar (SURFACE §9's *constitutional motion (consent)* row,
   * Q1182, STYLE T48) — the membership as it stands and the applicant joining
   * each under *Prefer this* (Q1377: the standing text is a peer), *Indifferent*
   * as its own textless block — and it commits on the assembly hold. At *proposal* the membership
   * decides ✏️: the card is a judgment between the applicant
   * and the membership as it stands, and it commits with ✓. The seat matrix
   * cannot say this — it asserts *who carries the entry*, not what the card
   * asks — so it is asserted here, per price. The consent card's words are
   * copy.js's own (`consent`, `grammar.lane`); the proposal card's three
   * words are still inline in session-view.html, so they stand here as
   * literals — the commit row's `grammar.commit.indifferent` is another
   * site's string and is not borrowed for it. */
  const FORM = {
    assembly: {
      want: [COPY.page.consent.staysAsIs, COPY.page.consent.joins(NAME), COPY.grammar.commit.indifferent],
      radios: [COPY.grammar.lane.prefer, COPY.grammar.lane.prefer, COPY.grammar.commit.indifferent],
      commit: 'confirm', called: 'a 🏛️ question' },
    proposal: {
      want: ['Admit them', 'Keep the membership as it is', 'Indifferent'],
      commit: 'admitgo', called: 'a judgment the membership decides' },
  }[PRICE];
  if (FORM && card) {
    let formOk = true;
    if (JSON.stringify(card.lanes) !== JSON.stringify(FORM.want)) {
      say('FAIL: at 🪪 ' + PRICE + ' the card should be ' + FORM.called + ' — ' +
        JSON.stringify(FORM.want) + ', saw ' + JSON.stringify(card.lanes));
      stuck.push('the ' + PRICE + ' lanes');
      formOk = false;
    }
    if (FORM.radios && JSON.stringify(card.radios) !== JSON.stringify(FORM.radios)) {
      say('FAIL: at 🪪 ' + PRICE + ' the radios should name the acts (T48) — ' +
        JSON.stringify(FORM.radios) + ', saw ' + JSON.stringify(card.radios));
      stuck.push('the ' + PRICE + ' radios');
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
  /* **The admit entry is a race entry** (Q1371, Ed 2026-09-15: *should queue
   * card have progress wash*). At *proposal* the application is a
   * one-candidate race in the engine, so its entry takes the race entry's
   * mark and wash: 🪪 while it asks, ⏳ once you have voted and the room has
   * not finished (the alphabet's `wait` row), never the decided green ✔ —
   * and its fill is the race's own closeness, the leader's judges over the
   * floor, not the founder's 100%. The vote is cast here as a member does
   * it — the *Admit them* lane, then ✓ — and the entry is read back after
   * the poll. On the pre-fix page the entry stood `st-news` in green before
   * the vote and `st-ask` after it, its fill 100% throughout. */
  if (PRICE === 'proposal' && card && admEntry) {
    const entryNow = () => page.evaluate((k) => {
      const li = document.querySelector('#rail .qitem[data-q="' + k + '"]');
      const b = li && li.querySelector('button');
      if (!b) return null;
      // a lifecycle mark is a picture named by `data-mk`; since Q1401 a
      // **subject** glyph is a picture too, and its name is its own character
      const svg = b.querySelector('.subj svg[data-mk]');
      const subj = b.querySelector('.subj');
      return { st: (b.className.match(/st-\w+/) || [''])[0],
        mark: svg ? svg.getAttribute('data-mk') : (subj ? window.CARDS.glyphTextOf(subj).trim() : null),
        fill: ((b.getAttribute('style') || '').match(/--fill: ([^;"]+)/) || [])[1] || null };
    }, admEntry.k);
    const was = await entryNow();
    say('entry      · before voting ' + JSON.stringify(was));
    if (!was || was.st !== 'st-ask' || was.mark !== '🪪') {
      say('FAIL: the admit entry should ask under 🪪 before the vote, saw ' + JSON.stringify(was));
      stuck.push('the entry asks');
    }
    if (!was || was.fill === '100%') {
      say('FAIL: the admit entry wears no evidence meter — fill ' + JSON.stringify(was && was.fill));
      stuck.push('the evidence meter');
    }
    const voted = await page.evaluate(async () => {
      const c = document.querySelector('.setupcard');
      const lane = c && c.querySelector('[data-admitpick][data-v="admit"]');
      if (!lane) return 'no lane';
      lane.click();
      await new Promise((s) => setTimeout(s, 400));
      const go = document.querySelector('.setupcard [data-admitgo]');
      if (!go || go.disabled) return 'no live ✓';
      go.click();
      return 'voted';
    });
    say('vote       · ' + voted);
    if (voted !== 'voted') stuck.push('the vote');
    await T(5000); // >4s: a poll lands carrying the judged race
    const now = await entryNow();
    say('entry      · after voting ' + JSON.stringify(now));
    if (!now || now.st !== 'st-wait' || now.mark !== 'glass') {
      say('FAIL: after the vote the admit entry should wait under ⏳, saw ' + JSON.stringify(now));
      stuck.push('the entry waits');
    }
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

  /* **What they told the door arrives with them** (Q1405, Ed's live-room
   * note 2026-09-16: *after I have chosen name and picture, the tasks still
   * appear yellow*). The admission carried the name and the picture across on
   * the row, but ✋ and 🖼️ ask *were you ever asked* (Q645) and only a
   * member's own `identity-set` had ever answered that — so a member admitted
   * from an application met both cards again. Asserted on the seat the
   * admission hands them: at *assembly* the founder consents, the seat mail's
   * link is followed, and the new member's rail holds neither ✋ nor 🖼️, the
   * view saying both were answered; at ✒️ the arrival gave nothing, and the
   * same read is the control — both cards still ask. *proposal* is not read:
   * the race adopts on the engine's cooldown, which this walk does not wait
   * on. */
  if (PRICE === 'assembly' && card && card.commit === 'confirm' && guestSeat) {
    const chose = await page.evaluate((joins) => {
      const c = document.querySelector('.setupcard');
      const block = c && [...c.querySelectorAll('.pick')]
        .find((p) => ((p.querySelector('.opttext') || {}).textContent || '').trim() === joins);
      const b = block && block.querySelector('.lanepick');
      if (!b) return false;
      b.click();
      return true;
    }, COPY.page.consent.joins(NAME));
    await T(400);
    const held = chose && await press(1600);
    if (!held) { say('FAIL: could not consent to the admission on the 🏛️ card'); stuck.push('the consent'); }
    else {
      await T(1500);
      // **the door's 🛡️ is born held** (SPEC §9.7 rule 9): a carried
      // admission parks behind the founder's assent, so the crown question
      // is answered over the wire as the founding's settings were — the
      // crown card is journey's to walk, not this one's
      const founderView = await page.evaluate(async (slug) =>
        (await (await fetch(`/api/d/${slug}/view`)).json()), SLUG);
      const crown = ((founderView.view && founderView.view.crownTasks) || [])[0];
      if (!crown) { say('FAIL: the carried admission raised no crown question for the founder\'s 🛡️'); stuck.push('the crown question'); }
      else {
        const assent = await cmd('answer-crown-question', { question: crown.id, outcome: 'accept' });
        say('🛡️ assent · ' + crown.id + ' → ' + assent.status);
        if (assent.status !== 200) stuck.push('the crown\'s assent');
        await T(1500);
      }
      // the seat mail lands on the outbox's next sender pass, not on the
      // commit that raised it, so it is polled for rather than read once
      let seatLink = null;
      for (let i = 0; i < 40 && !seatLink; i++) {
        const seatMail = (await devOutbox(BASE))
          .filter((m) => m.to === APPLICANT && /\/auth\/login/.test(linkIn(m) || '')).pop();
        seatLink = seatMail ? linkIn(seatMail) : null;
        if (!seatLink) await T(500);
      }
      if (!seatLink) {
        say('FAIL: no seat mail reached the admitted applicant — ' + JSON.stringify(seatLink));
        stuck.push('the seat mail');
      } else {
        const seat = await guestSeat(seatLink);
        const asks = seat.rail.filter((k) => k === 'myname' || k === 'mypic');
        const answered = !!(seat.identity && seat.identity.nameSet && seat.identity.pictureSet);
        say('admitted   · seat ' + JSON.stringify(seat.me) + ' · identity ' + JSON.stringify(seat.identity) +
          ' · rail ' + JSON.stringify(seat.rail));
        if (!seat.me) { say('FAIL: the seat mail did not seat the admitted applicant as a member'); stuck.push('the admitted seat'); }
        if (!answered) {
          say('FAIL: the admitted member is read as not having answered ✋ 🖼️ (Q1405)');
          stuck.push('the door\'s answers arrive');
        }
        if (asks.length) {
          say('FAIL: the admitted member is asked again for what they told the door — ' + JSON.stringify(asks) + ' (Q1405)');
          stuck.push('✋ 🖼️ asked again');
        }
        if (seat.me && answered && !asks.length) say('Q1405      · what they told the door arrived with them: no ✋ 🖼️ ask');
      }
    }
  }
  if (PRICE === 'pen' && guestSeat) {
    const seat = await guestSeat(null);
    const asks = seat.rail.filter((k) => k === 'myname' || k === 'mypic');
    say('arrived    · seat ' + JSON.stringify(seat.me) + ' · identity ' + JSON.stringify(seat.identity) +
      ' · asks ' + JSON.stringify(asks));
    if (!seat.me) { say('FAIL: the arrival holds no member seat'); stuck.push('the arrival\'s seat'); }
    if (!seat.identity || seat.identity.nameSet || seat.identity.pictureSet) {
      say('FAIL: an arrival that gave nothing is read as having answered — ' + JSON.stringify(seat.identity) + ' (Q1405)');
      stuck.push('the control: nothing given');
    }
    if (asks.length !== 2) {
      say('FAIL: an arrival that gave nothing should still be asked ✋ and 🖼️, saw ' + JSON.stringify(asks) + ' (Q645)');
      stuck.push('the control: still asked');
    }
  }
}

/* ---- Q1366: a returning address applies blank ------------------------ */
/* **A fresh application starts blank, whoever you were** (Ed, 2026-09-15).
 * The identity row outlives the seat — the register's departure line still
 * names who left — so a member who resigns and knocks again with the same
 * address used to be served their old name on ✋ and their old face on 🖼️ as
 * if they had just given them: the name task read done before it was met, the
 * picture card opened on *Chosen*, and a ✓ that changed nothing looked like a
 * save that failed (the lab-2026 room, 2026-09-15). Asserted on the surface:
 * a member is invited, names themself with a face, resigns, applies again;
 * the applicant's rail asks for a name and a picture rather than reporting
 * them, the served record carries neither, and — the second half — a name
 * typed and ✓'d shows on the 🪪 card's list of what the application holds,
 * the face still marked not yet chosen. Skipped at ✒️, where the link is the
 * joining and there is no application to fill in. */
if (PRICE !== 'pen') {
  const RETURNING = 'returning-' + Date.now().toString(36) + '@example.org'; // one address per run: the outbox is shared
  const inv = await cmd('invite', { email: RETURNING });
  const invMail = (await devOutbox(BASE)).filter((m) => m.to === RETURNING).pop();
  const invLink = invMail && linkIn(invMail);
  if (inv.status !== 200 || !invLink) {
    say('FAIL: no invitation reached ' + RETURNING + ' → ' + inv.status);
    stuck.push('the returning member’s invitation');
  } else {
    const memCtx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
    const mem = await memCtx.newPage();
    await mem.goto(invLink);
    for (let i = 0; i < 40 && !mem.url().includes('/d/'); i++) await T(500);
    const memCmd = (op, args) => mem.evaluate(async ([slug, op2, args2]) => {
      const r = await fetch(`/api/d/${slug}/cmd`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ cmd: op2, args: args2 }),
      });
      return { status: r.status, body: await r.json().catch(() => null) };
    }, [SLUG, op, args]);
    const named = await memCmd('set-identity', { name: 'Rae Before', picture: 'e🦊' });
    const left = await memCmd('resign', {});
    await memCtx.close();
    if (named.status !== 200 || left.status !== 200) {
      say('FAIL: the returning member could not be named and resigned → ' + named.status + ' / ' + left.status);
      stuck.push('the resignation');
    } else {
      const again = await page.evaluate(async ([slug, email]) => {
        const r = await fetch(`/api/d/${slug}/apply`, {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        return { status: r.status, body: await r.json().catch(() => null) };
      }, [SLUG, RETURNING]);
      if (again.status !== 200 || !again.body || !again.body.devLink) {
        say('FAIL: the door refused the returning address → ' + again.status + ' ' + JSON.stringify(again.body));
        stuck.push('the second knock');
      } else {
        const backCtx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
        const back = await backCtx.newPage();
        back.on('pageerror', (e) => errors.push('returning applicant: ' + String(e)));
        await back.goto(again.body.devLink);
        await T(2200);
        const served = await back.evaluate(async () => {
          const v = await (await fetch(location.origin + '/api/d/' + location.pathname.split('/')[2] + '/view')).json();
          const a = v.applicant || {};
          const sub = (k) => {
            const li = document.querySelector('#rail [data-card="' + k + '"]');
            return li ? (li.textContent || '').replace(/\s+/g, ' ').trim() : null;
          };
          return { name: a.name, picture: a.picture, appname: sub('appname'), apppic: sub('apppic') };
        });
        const blank = served.name === null && served.picture === null;
        const asks = served.appname !== null && !served.appname.includes('Rae Before') &&
          served.apppic !== null && !served.apppic.includes('Chosen');
        if (!blank || !asks) {
          say('FAIL: the returning applicant was served their old seat — record name ' +
            JSON.stringify(served.name) + ', picture ' + JSON.stringify(served.picture) +
            '; rail ✋ ' + JSON.stringify(served.appname) + ', 🖼️ ' + JSON.stringify(served.apppic) +
            ' (Q1366: a fresh application starts blank)');
          stuck.push('the returning applicant starts blank');
        } else say('returning  · applies blank: ✋ ' + JSON.stringify(served.appname) + ', 🖼️ ' + JSON.stringify(served.apppic));
        // the second half: what a ✓ keeps is visible before Submit, on the
        // 🪪 card's list of what the application holds
        const kept = await back.evaluate(async () => {
          const click = (sel) => { const el = document.querySelector(sel); if (el) el.click(); return !!el; };
          if (!click('#rail [data-card="appname"]')) return { step: 'no ✋ entry' };
          await new Promise((s) => setTimeout(s, 500));
          const inp = document.querySelector('.setupcard input[data-appname]');
          if (!inp) return { step: 'no name field' };
          inp.focus(); inp.value = 'Rae Again'; inp.dispatchEvent(new Event('input', { bubbles: true }));
          await new Promise((s) => setTimeout(s, 300));
          const ok = document.querySelector('.setupcard button[data-close]');
          if (!ok || ok.disabled) return { step: 'the ✓ stayed dark after typing' };
          ok.click();
          await new Promise((s) => setTimeout(s, 700));
          if (!click('#rail [data-card="apply"]')) return { step: 'no 🪪 entry' };
          await new Promise((s) => setTimeout(s, 500));
          const rows = [...document.querySelectorAll('.setupcard .applist .approw')]
            .map((r) => (r.textContent || '').replace(/\s+/g, ' ').trim());
          return { step: 'ok', rows };
        });
        if (kept.step !== 'ok' || !kept.rows.some((r) => r.includes('Rae Again')) ||
          !kept.rows.some((r) => r.includes(COPY.page.appcards.holds.noPicture))) {
          say('FAIL: the 🪪 card does not show what the application holds — ' + kept.step +
            (kept.rows ? ' · rows ' + JSON.stringify(kept.rows) : ''));
          stuck.push('what the application holds');
        } else say('holds      · 🪪 lists ' + JSON.stringify(kept.rows));
        await backCtx.close();
      }
    }
  }
}

/* **A departure names the person, with their face** (Q1375). At ✒️ the
 * applicant is a member from arrival, so they can leave: the walk resigns
 * them and reads the founder's rail for the 🥾 entry — *‹address› has left*,
 * the address because they chose no name, the face before it. The one walk
 * that drives a resignation end to end. */
if (PRICE === 'pen' && guestResign) {
  const left = await guestResign();
  say('leave      · resign → ' + left);
  if (left !== 200) stuck.push('the resignation');
  else {
    await page.reload({ waitUntil: 'load' });
    await T(2500);
    const dep = await page.evaluate(() => {
      const li = [...document.querySelectorAll('#rail .qitem')].find((q) => /^dep:/.test(q.dataset.q || ''));
      if (!li) return null;
      return { t: (li.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80),
        face: !!li.querySelector('.ql .qface'),
        title: (li.querySelector('button') || {}).title || '' };
    });
    say('departure  · ' + JSON.stringify(dep));
    if (!dep) { say('FAIL: no 🥾 entry for the member who left (E32)'); stuck.push('the departure entry'); }
    else {
      if (!dep.face) { say('FAIL: the departure entry carries no face (Q1375)'); stuck.push('the departure\'s face'); }
      if (!dep.t.includes(CALLED) || !/ has left/.test(dep.t)) {
        say('FAIL: the departure entry should read *' + CALLED + ' has left*, saw ' + JSON.stringify(dep.t));
        stuck.push('the departure sentence');
      }
      if (dep.title !== CALLED + ' has left') {
        say('FAIL: the tooltip should be the sentence alone, saw ' + JSON.stringify(dep.title));
        stuck.push('the departure tooltip');
      }
    }
  }
}
await closeGuest();

if (errors.length) { say('page errors· ' + JSON.stringify(errors)); stuck.push('page errors'); }
say(stuck.length ? '\nFAILED: ' + stuck.join(' · ') : '\nok — an applicant reaches the membership');
await browser.close();
process.exit(stuck.length ? 1 : 0);
