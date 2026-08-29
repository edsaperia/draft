/**
 * **A laid-down pen is laid down** — the founder's own card, per setting,
 * against a **running server**.
 *
 * Entry 62 is why it exists. Ed, batch-B QA 2026-08-25: *"After the document is
 * closed, as the founder, after giving up the pen on Title, I can still edit
 * the title. Please check that giving up powers actually gives them up, on all
 * settings where they can be given up."* Both readings were real. The module
 * and the server were right the whole time — `setSetting` refuses once
 * `powers.unilateral` is false, `requireOpen` refuses everything after the
 * close — and the **page** asked the wrong question: `mayPen()` is *do you hold
 * a pen anywhere*, and it was standing in for *do you hold the pen on this
 * setting*. So a pen laid down on 🪶 showed, after 🍾, a title lane and a live
 * ✒️; pressing it posted a `set-setting` the server answered 400, `api.cmd`
 * warned to a console nobody reads, and the next 4s poll put the old title
 * back without a word — the same shape as Q811's door, fixed there alone.
 *
 *   npm run server            # in another shell, with a dev outbox
 *   npm run powers-walk
 *   npm run powers-walk -- --hat=clerk
 *   npm run powers-walk -- http://127.0.0.1:8140
 *
 * The **clerk** is why `--hat` is here and defaults to `both`: a founder who is
 * a member falls through to the motion composer once their pen is down and the
 * composer hides the defect, so the clerk — who has no composer to fall to — is
 * the seat that reaches the founder's card bare.
 *
 * It drives the birth through the surface (a real save, a real magic link) and
 * sets the rest of the constitution over the wire, because this walk is about
 * the powers and `journey` already covers the founding card by card. Two pens
 * go down **through the tabs**, to prove that route still works; the rest go
 * down over the wire, because fifteen tab presses would be scaffolding.
 *
 * ⏰ keeps its pen throughout, and is the control: it proves the refusals are
 * about the *power* and not about the epoch. It is also how the walk closes the
 * document at the end — the one setting still in the founder's hand.
 *
 * …and for the same reason it is where **entry 161's pair** is asserted: a card
 * the founder still has a hand on is the only place a second commit could go.
 * After 🍾 the walk opens ⏰ and reads the row under both hats — the pen and
 * the route's own commit for a member founder, its glyph following the value
 * (a date is ✏️, *never* is 🏛️); the pen alone and a sentence saying why for a
 * clerk — then presses the second commit and asserts the motion it opens.
 *
 * It fails on the pre-fix page at *title after 🍾 · a lane and an enabled ✒️*
 * (clerk and member alike) and at *closed · ⏱️ card holds an enabled ✒️*.
 *
 * The doors ✉️ ❌ are **not** here: `journey`'s `doorShuts` has walked both
 * since 2026-08-26 (Q811/Q916), and 📝 is not here either — its pen goes down
 * at the start by itself (§9.7 rule 8) and its road on is proposing (K5), so
 * what this asserts about it is only that `confirm-starting-text` is refused.
 */
import { chromium } from 'playwright';
import { assertServerBuild } from './lib/assert-server.mjs';

// argv first, then the environment the server itself was started with, then
// the historical default. Under plan-queue every slot carries its own
// DRAFT_BASE_URL, and a literal here would drive whatever else was listening.
const BASE = process.argv.find((a) => /^https?:/.test(a))
  || process.env.DRAFT_BASE_URL || 'http://127.0.0.1:8199';
const arg = (k, d) => (process.argv.find((a) => a.startsWith('--' + k + '=')) || ('--' + k + '=' + d))
  .split('=').slice(1).join('=');
const HAT = arg('hat', 'both');
// which commit gesture to drive (backlog 184); empty follows the page's own
const GESTURE = arg('gesture', '');
if (!['member', 'clerk', 'both'].includes(HAT)) {
  console.log('FAIL: --hat must be member, clerk or both');
  process.exit(1);
}
const say = (...a) => console.log(...a);
const T = (ms) => new Promise((r) => setTimeout(r, ms));

/* The audit set: every setting whose value the founder's own card sets, by the
 * page's key and the module's id (they differ on 📍 alone). ⏰ is deliberately
 * absent — it keeps its pen and is the control. 🪜 is in the list because the
 * module holds it like any other; it has no tab of its own on the page (X8),
 * which the walk reports as `no tab` rather than as a failure. */
const AUDIT = [
  { k: 'title', id: 'title', g: '🪶', value: { text: 'A Second Name' } },
  { k: 'slug', id: 'link', g: '📍', value: { slug: 'a-second-address' } },
  { k: 'bar', id: 'bar', g: '🌡️', value: { pct: 61 } },
  { k: 'pace', id: 'pace', g: '🪜', value: { shape: 'fixed' } },
  { k: 'quorum', id: 'quorum', g: '👥', value: { form: 'count', n: 1 } },
  { k: 'authorship', id: 'authorship', g: '👤', value: { rung: 'public' } },
  { k: 'judgments', id: 'judgments', g: '👁️', value: { rung: 'never' } },
  { k: 'chamber', id: 'chamber', g: '🌍', value: { rung: 'public' } },
  { k: 'rate', id: 'rate', g: '⏱️', value: { grant: 5, cap: 9, dripMinutes: 120 } },
  { k: 'lapse', id: 'lapse', g: '💤', value: { afterMs: null } },
  { k: 'removal', id: 'removal', g: '🥾', value: { price: 'assembly' } },
  { k: 'admission', id: 'admission', g: '🪪', value: { price: 'proposal' } },
  { k: 'applications', id: 'applications', g: '🤝', value: { apply: true } },
];
// the two whose pens go down through the tabs rather than over the wire: the
// title, which is special-cased in the commit row, and one ordinary generic
// card. Two is enough to prove the route; fifteen would be scaffolding.
const BY_HAND = ['title', 'rate'];

await assertServerBuild(BASE, 'powers-walk');

const browser = await chromium.launch();
const stuck = [];

/* ---- the wire net (journey's) -----------------------------------------
 * Every ≥400 on `/api/` is recorded. This walk is unusual in that it *expects*
 * refusals — so each deliberate one is counted as it is provoked, and what the
 * net reports at the end is the difference: a refusal nobody asked for. */
const refused = [];
let provoked = 0;

const runDocument = async (hat) => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });
  if (GESTURE) await page.addInitScript((g) => { window.COMMIT_GESTURE_OVERRIDE = g; }, GESTURE);
  const errors = [];
  page.on('pageerror', (e) => errors.push(hat + ': ' + String(e)));
  page.on('response', (r) => {
    if (r.status() >= 400 && r.url().includes('/api/')) {
      refused.push(hat + ' ' + r.status() + ' ' +
        String(r.request().postData() || r.url()).slice(0, 120));
    }
  });
  const fail = (m) => { say('  FAIL: ' + m); stuck.push(hat + ': ' + m); };

  // one retry, because the previous card's 🗑️ collapse re-renders the band and
  // a query landing inside that window finds nothing and reads as *no tab*
  const openCard = async (k) => (await openOnce(k)) || (await T(500), openOnce(k));
  const openOnce = async (k) => {
    const ok = await page.evaluate((kk) => {
      // seat-matrix's, widened past `.achip`: ✋ 🖼️ 📧 ride the reader's own
      // row in the Members paragraph rather than a clause's tab strip, and
      // ✋ blocks the founding order, so missing it hides the whole band
      const el = document.querySelector('#rail [data-card="' + kk + '"], ' +
        '#band [data-tab="' + kk + '"], #titlepara [data-tab="' + kk + '"], ' +
        '#doc [data-card="' + kk + '"]');
      if (!el) return false;
      el.scrollIntoView({ block: 'center' });
      el.click();
      return true;
    }, k);
    await T(500);
    return ok;
  };
  // **What a press is depends on the gesture** (backlog 184): under `hold` a
  // real pointer held down, not a `.click()`; under `click` the click starts
  // the flight and `ms` is the flight's own length, with nothing to let go of.
  // Asked of the page, so `--gesture=` and the page's own constant agree.
  const pageGesture = () => page.evaluate(() => (window.SESSION && window.SESSION.gesture) || 'hold');
  // `sel` names one control instead of *the first live thing on the row*,
  // which stopped being unambiguous when the Founder's card grew a second
  // commit (entry 161): on ⏰ the row is 🗑️ · ✒️ · the route's own, and a
  // bare `press()` would always find the pen. A door's second commit is in
  // the body rather than the row, so the selector reaches both.
  const press = async (ms, sel) => {
    const box = await page.evaluate((s) => {
      const b = s
        ? document.querySelector('.setupcard ' + s + ':not([disabled])')
        : [...document.querySelectorAll('.setupcard .commitrow button')]
          .find((x) => !x.disabled && !/🗑/.test(x.textContent));
      if (!b) return null;
      b.scrollIntoView({ block: 'center' });
      const r = b.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, label: b.textContent.trim() };
    }, sel || null);
    if (!box) return null;
    await page.mouse.move(box.x, box.y);
    if (await pageGesture() === 'click') {
      await page.mouse.click(box.x, box.y);
      await T(ms);
    } else {
      await page.mouse.down();
      await T(ms);
      await page.mouse.up();
    }
    await T(600);
    return box.label;
  };
  const clickIn = async (sel) => page.evaluate((s) => {
    const el = document.querySelector('.setupcard ' + s);
    if (!el) return false;
    el.click();
    return true;
  }, sel);
  const typeIn = async (sel, text) => {
    const el = await page.$(sel);
    if (!el) return false;
    await el.click();
    await page.keyboard.type(text, { delay: 8 });
    return true;
  };

  /* ---- the birth ------------------------------------------------------
   * A **member** founder is born through the surface, which is a real save
   * and a real magic link and the thing no fixture reaches. A **clerk**
   * founder is born over the wire, because 🎩 cannot make one afterwards:
   * `convenorRecord().isMember` is the answer the *creation* carried, and the
   * `convenor-membership-set` fold moves the member record without writing
   * that field (`session.ts`) — so the view keeps serving `isMember: true`,
   * and the page sets the founder's role from exactly that field on boot.
   * `POST /api/docs` takes `isMember`, and is the same save the surface makes. */
  const TITLE = 'Powers ' + hat + ' ' + Date.now();
  const outbox = async () => { const ob = await (await fetch(BASE + '/api/dev/outbox')).json(); return ob.mails || ob; };
  const linkIn = (m) => (m && m.link) || (JSON.stringify(m).match(/http:[A-Za-z0-9_?=/:.-]+/) || [])[0];
  let born = null;
  if (hat === 'member') {
    await page.goto(BASE + '/');
    await T(800);
    await openCard('title');
    await typeIn('.setupcard [data-titlelane]', TITLE);
    await press(1250);
    await openCard('slug');
    await press(1250);
    // **🧭 sits between 📍 and 📧** (entry 166), and a card in ORDER that is
    // not settled blocks everything under it — so a birth that skips it never
    // reaches a live 📧 commit. `custom` is the rung that folds nothing, which
    // is what this walk's power assertions were written against.
    await openCard('shape');
    if (!(await clickIn('[data-set="docShape"][data-val="custom"]'))) {
      fail('🧭 offers no rung named custom');
      await page.close();
      return;
    }
    await T(420);
    await press(1250);
    await openCard('myemail');
    await typeIn('.setupcard input[type="email"]', 'ada@example.org');
    await press(1250);
    await T(1600);
    const mails = (await outbox()).filter((m) => JSON.stringify(m).includes(TITLE));
    if (!mails.length) {
      fail('no creation mail for ' + TITLE + ' — is this server using a dev outbox?');
      await page.close();
      return;
    }
    born = linkIn(mails[mails.length - 1]);
  } else {
    const r = await (await fetch(BASE + '/api/docs', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: TITLE, email: 'ada@example.org', isMember: false }),
    })).json().catch(() => null);
    if (!r || !r.devLink) {
      fail('the save refused a clerk-founded document · ' + JSON.stringify(r));
      await page.close();
      return;
    }
    born = r.devLink;
  }
  await page.goto(born);
  for (let i = 0; i < 40 && !page.url().includes('/d/'); i++) await T(500);
  await T(1800);
  const SLUG = (page.url().match(/\/d\/([^/?#]+)/) || [])[1];
  // the magic link picks the origin, and a cookie belongs to one
  const DOCBASE = new URL(page.url()).origin;
  say('birth      · ' + DOCBASE + '/d/' + SLUG);
  say('gesture    · ' + (await pageGesture()) + (GESTURE ? ' (--gesture=' + GESTURE + ')' : ' (the page\'s own)'));

  const cmd = (op, args) => page.evaluate(async ([slug, op2, args2]) => {
    const r = await fetch(`/api/d/${slug}/cmd`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ cmd: op2, args: args2 }),
    });
    return { status: r.status, body: await r.json().catch(() => null) };
  }, [SLUG, op, args]);
  // a command this walk means to be refused: counted, so the net below can
  // tell one it asked for from one it did not
  const refuse = async (op, args, wants, what) => {
    provoked += 1;
    const r = await cmd(op, args);
    const msg = (r.body && r.body.error) || '';
    if (r.status === 400 && wants.test(msg)) return true;
    fail(what + ' → ' + r.status + ' ' + JSON.stringify(msg).slice(0, 140));
    return false;
  };

  /* ---- the rest of the constitution, over the wire --------------------- */
  const ENDS = Date.now() + 3600_000;
  const SETTINGS = [
    ['ending', { endsAtMs: ENDS }],   // ⏰ leads: 🌡️ depends on it
    ['pace', { shape: 'fixed' }], ['bar', { pct: 60 }],
    ['quorum', { form: 'count', n: 1 }], ['authorship', { rung: 'sealed' }],
    ['judgments', { rung: 'after' }], ['chamber', { rung: 'link' }],
    ['lapse', { afterMs: null }], ['removal', { price: 'proposal' }],
    ['rate', { grant: 4, cap: 8, dripMinutes: 240 }],
    ['applications', { apply: false }], ['admission', { price: 'assembly' }],
  ];
  for (const [id, value] of SETTINGS) {
    const r = await cmd('set-setting', { setting: id, value });
    if (r.status !== 200) fail('set-setting ' + id + ' → ' + r.status);
  }
  await cmd('confirm-starting-text', { text: 'The clubhouse shall be kept open.' });
  // a clerk founder is nobody's member, so the room needs one of its own or
  // there is no electorate for 🍾 to begin over
  await cmd('invite', { email: 'bo@example.org' });
  await T(800);
  // the invitation link carries a token, not the slug, so the mail is found
  // by its recipient and this run's own title — and **following it is the
  // arrival**, which is what puts somebody on the roster (§9.6a)
  const inv = (await outbox()).filter((m) => m.to === 'bo@example.org' &&
    JSON.stringify(m).includes(TITLE));
  if (!inv.length) fail('no invitation mail for bo — the clerk has no room to found');
  else {
    // **A GET on a magic link burns nothing** — the interstitial's POST is
    // what consumes it (stage 3, defect 6), and consuming it is the arrival.
    // A plain fetch here left the roster empty and 🍾 refused *roster must
    // not be empty*, which reads as a product defect and is this walk's own.
    const u = new URL((inv[inv.length - 1].link) || linkIn(inv[inv.length - 1]));
    await fetch(u.href);
    await fetch(u.origin + u.pathname, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', origin: u.origin },
      body: new URLSearchParams({ token: u.searchParams.get('token') || '' }).toString(),
      redirect: 'manual',
    });
  }
  await T(800);

  /* ---- 🎩, after the room has somebody else in it ----------------------- */
  // **`setConvenorMembership` compares against the roster, not against a
  // field**: `current = members.has(convenor.id)`, and when `current` already
  // equals what is asked it records *that 🎩 was answered* (Q682) and changes
  // nothing. Called before the founder is on the roster, `isMember: false`
  // therefore lands as a no-op and the clerk hat silently stays a member —
  // which is what this walk did until it read the seat back.
  // it still has to be *answered* — 🎩 blocks the founding order until it is,
  // and where the answer matches the seat the fold records the act alone
  const wore = await cmd('set-convenor-membership', { isMember: hat === 'member' });
  if (wore.status !== 200) fail('set-convenor-membership → ' + wore.status + ' ' +
    JSON.stringify((wore.body || {}).error || '').slice(0, 140));
  await T(500);
  const seatIs = await page.evaluate(async (slug) => {
    const b = await (await fetch(`/api/d/${slug}/view`)).json().catch(() => null);
    return !!(b && b.convenor && b.convenor.isMember);
  }, SLUG);
  if (seatIs !== (hat === 'member')) {
    fail('the founder is ' + (seatIs ? 'a member' : 'a clerk') + ' and this run wants a ' + hat);
  }
  say('seat       · the founder is ' + (seatIs ? 'a member' : 'a clerk'));

  /* ---- the pen has to be accepted before it can be laid down ----------- */
  // `mayPen()` has always been `acked('grant-pen')` as well as *held*: no
  // power arrives without acknowledgement (Q532), and a walk that sets the
  // constitution over the wire never meets the two grant cards. Pressing them
  // is not scenery — without it every ✒️ on the page is dark for the right
  // reason and this walk would prove nothing.
  await page.goto(DOCBASE + '/d/' + SLUG);
  await T(2400);
  for (const g of ['grant-pen', 'grant-shield']) {
    if (!(await openCard(g))) { fail('no ' + g + ' card to accept'); continue; }
    if (!(await clickIn('[data-ok]'))) fail(g + ' has no OK to press');
    await T(700);
  }

  /* ---- the pens: two through the tabs, the rest over the wire ---------- */
  // 🪶's goes down here, pre-🍾, because the pre-start half of the walk is
  // about R-048 — a release recorded and not yet spent — and the title is the
  // card that half is asserted on. ⏱️'s goes down **after** 🍾 (below), which
  // is not a compromise: the band is unreachable pre-start (see the ✋ 🖼️ note
  // there), and a pen laid down through a tab on a *live* document exercises
  // the same route in the epoch where the defect was reported.
  const layByHand = async (k) => {
    if (!(await openCard(k))) { fail('no ' + k + ' card to open'); return; }
    if (!(await openCard('pw:u:' + k))) { fail('no ✒️ tab on ' + k + ' to lay its pen down with'); return; }
    const chose = await clickIn('[data-set="pw:u:' + k + '"][data-val="given"]');
    const laid = chose ? await press(1250) : null;
    if (!laid) fail(k + '’s ✒️ tab would not commit');
    await clickIn('.setupcard [data-revert]');
    return !!laid;
  };
  await layByHand('title');
  say('by hand    · ✒️ laid down on 🪶 through its own tab, before 🍾');
  for (const s of AUDIT) {
    if (BY_HAND.includes(s.k)) continue;
    const r = await cmd('relinquish', { setting: s.id, power: 'unilateral' });
    if (r.status !== 200) fail('relinquish ' + s.id + ' → ' + r.status + ' ' +
      JSON.stringify((r.body || {}).error || '').slice(0, 120));
  }
  await cmd('relinquish', { setting: 'startingText', power: 'unilateral' });
  say('over wire  · ✒️ laid down on the other ' + (AUDIT.length - BY_HAND.length) +
    ' and on 📝 · ⏰ keeps its pen');

  /* ---- pre-start: the release is a promise, and the control is correct -- */
  await page.goto(DOCBASE + '/d/' + SLUG);
  await T(2200);
  await openCard('title');
  // the title's ✒️ is `commitReady`, which is *the lane differs from what
  // stands* — so a change has to be typed before the control means anything
  await typeIn('.setupcard [data-titlelane]', ' Revised');
  await T(400);
  const pre = await page.evaluate(() => {
    const c = document.querySelector('.setupcard');
    if (!c) return null;
    const b = c.querySelector('.commitrow [data-confirm]');
    return { lane: !!c.querySelector('[data-titlelane]'), pen: !!b && !b.disabled };
  });
  const preOk = pre && pre.lane && pre.pen;
  say('pre-🍾     · ' + (preOk
    ? 'the title still has its lane and a live ✒️ — R-048, the release lands at 🍾'
    : 'FAIL: ' + JSON.stringify(pre)));
  if (!preOk) stuck.push(hat + ': the pre-start title control');
  if (!preOk) say('  why      · ' + JSON.stringify(await page.evaluate(() => {
    const c = document.querySelector('.setupcard');
    const b = c && c.querySelector('.commitrow [data-confirm]');
    return { title: b ? b.getAttribute('title') : null,
      pen: !!document.querySelector('#penwallet .pencils') };
  })));
  const preSet = await cmd('set-setting', { setting: 'title', value: { text: 'Still Mine' } });
  if (preSet.status !== 200) fail('pre-🍾 set-setting title → ' + preSet.status);
  await openCard('pw:u:title');
  const promise = await page.evaluate(() => ((document.querySelector('.setupcard') || {}).textContent || '')
    .replace(/\s+/g, ' '));
  if (!/when the document begins/i.test(promise)) {
    fail('the ✒️ tab does not say the release lands at 🍾 — ' + JSON.stringify(promise.slice(0, 160)));
  }
  await clickIn('.setupcard [data-revert]');

  /* ---- 🍾, over the wire ------------------------------------------------ */
  // `applicants-walk`'s recipe, and for its reason: the 🍾 card only stands
  // once the founding order is complete card by card, and this walk set the
  // constitution over the wire on purpose. `journey` and `seat-matrix` hold
  // the button; what is being asserted here is on the other side of it.
  const begun0 = await cmd('begin', {});
  if (begun0.status !== 200) {
    fail('begin → ' + begun0.status + ' ' + JSON.stringify((begun0.body || {}).error || '').slice(0, 200));
    await page.close(); return;
  }
  await page.goto(DOCBASE + '/d/' + SLUG);
  await T(2400);
  const begun = await page.evaluate(() => !!document.querySelector('.doc.begun'));
  say('🍾         · ' + (begun ? 'begun' : 'FAIL: the page does not read as begun'));
  if (!begun) { stuck.push(hat + ': 🍾'); await page.close(); return; }

  /* ---- after 🍾, per setting ------------------------------------------- */
  // What must be gone: the title lane, a live ✒️, the founder's own value
  // radios and the *why are you changing this* lane. What must be there: the
  // composer (a founder who is a member) or the settled sentence and nothing
  // pressable (a clerk, who composes nothing).
  const probe = async () => page.evaluate(() => {
    const c = document.querySelector('.setupcard');
    if (!c) return null;
    const live = [...c.querySelectorAll('.commitrow button')]
      .filter((b) => !b.disabled && !/🗑/.test(b.textContent))
      .map((b) => b.textContent.trim());
    return {
      lane: !!c.querySelector('[data-titlelane]'),
      radio: !!c.querySelector('[data-set]'),
      why: !!c.querySelector('[data-setwhy]'),
      pen: !!c.querySelector('.commitrow [data-confirm]:not([disabled])'),
      composer: !!c.querySelector('[data-putmotion], [data-holdmotion]'),
      live,
      // the card's own notes, whole: the clerk's *no ✏️ to spend* sentence is
      // asserted rather than merely inferred from an absent button (entry 161)
      note: [...c.querySelectorAll('.setnote')]
        .map((n) => n.textContent).join(' ').replace(/\s+/g, ' ').trim(),
      says: (c.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120),
    };
  });
  /* ---- the founding order has to be unblocked before the band exists ----
   * `visible(c)` is `orderReady(c)`, and `blocksOrder` is *the first unsettled
   * non-gate card in ORDER stops everything below it* — so until ✋ and 🖼️ are
   * answered the band holds ten tabs and this walk can reach none of the
   * settings it audits. Both are module-backed per seat (Q645), so one press
   * each sticks. It is done **here**, after 🍾, and not before, because 📧's
   * own settledness is `S.emailVerified` — page state a reload cannot rebuild
   * — and pre-start it blocks the order ahead of them. 🎩 needs no press at
   * all on this side of 🍾: `constituted()` settles it (Q682). */
  await page.goto(DOCBASE + '/d/' + SLUG);
  await T(2400);
  const order = [];
  for (const k of ['myname', 'mypic']) {
    if (!(await openCard(k))) { order.push(k + ':no card'); continue; }
    if (k === 'myname') await typeIn('.setupcard [data-txt="myname"]', 'Ada Founder');
    order.push(k + ':' + JSON.stringify(await press(1250)));
    await T(400);
  }
  say('order      · ✋ 🖼️ answered, which is what puts the constitution in the band · ' + order.join(' · '));
  // 💡 for the same reason the two grants are pressed before 🍾: `mayPropose()`
  // is `acked('canpropose')` as well as held, and entry 161's second commit
  // hangs off it. A walk that never opens the gate would find the Founder's
  // pair missing for the right reason and prove nothing.
  if (await openCard('canpropose')) await clickIn('[data-ok]');
  await T(700);

  // ⏱️'s pen, by hand, on a live document — the second of the two tab routes
  await layByHand('rate');
  say('by hand    · ✒️ laid down on ⏱️ through its own tab, after 🍾');

  for (const s of AUDIT) {
    if (!(await openCard(s.k))) { say('  ' + s.g + ' ' + s.k.padEnd(13) + '· no tab on the page'); continue; }
    const p = await probe();
    const bad = [];
    if (!p) bad.push('no card');
    else {
      if (p.lane) bad.push('a title lane');
      if (p.radio) bad.push('a value radio');
      if (p.why) bad.push('a why lane');
      if (p.pen) bad.push('a live ✒️ (' + JSON.stringify(p.live) + ')');
      // and what should be there instead
      if (hat === 'member' && !p.composer) bad.push('no composer for a member founder');
      if (hat === 'clerk' && p.composer) bad.push('a composer on a clerk’s page');
      if (hat === 'clerk' && p.live.length) bad.push('a live control (' + JSON.stringify(p.live) + ')');
    }
    const wire = await refuse('set-setting', { setting: s.id, value: s.value },
      /unilateral power is given up/, s.g + ' ' + s.id + ' after 🍾');
    if (bad.length) fail(s.g + ' ' + s.k + ' · ' + bad.join(' · ') + ' — says ' + JSON.stringify((p || {}).says));
    say('  ' + s.g + ' ' + s.k.padEnd(13) + '· ' + (!bad.length && wire ? 'PASS' : 'FAIL') +
      (bad.length ? ' — ' + bad.join(' · ') : ''));
    await clickIn('.setupcard [data-revert]');
  }
  // 📝's own road is proposing, and the module says so rather than naming a power
  await refuse('confirm-starting-text', { text: 'no' },
    /the text changes by proposing/, '📝 confirm-starting-text after 🍾');
  // …and the control: ⏰ kept its pen, so the founder still sets it
  const ctl = await cmd('set-setting', { setting: 'ending', value: { endsAtMs: ENDS + 60_000 } });
  say('control    · ⏰ kept its pen and still sets · ' + (ctl.status === 200 ? 'PASS' : 'FAIL ' + ctl.status));
  if (ctl.status !== 200) stuck.push(hat + ': the ⏰ control case');

  /* ---- ⏰ · the Founder's pair (entry 161, Q1023) ------------------------
   * ⏰ is the one card in this walk where the Founder still has a hand, which
   * is exactly where entry 161 puts a second commit: the pen, and the route's
   * own commit beside it, so a Founder who holds ✒️ can still choose to put
   * the change to the room. Both hats, because the asymmetry is the ruling —
   * a **clerk** has no ✏️ to spend and `openMotion` refuses a mover who is
   * not a member, so their card keeps the pen alone and says why.
   * It fails on the pre-change page at *⏰ · one commit where there should be
   * two* (member) and at *⏰ · no sentence saying why* (clerk). */
  await page.goto(DOCBASE + '/d/' + SLUG);
  await T(2400);
  if (!(await openCard('ending'))) fail('no ⏰ tab after 🍾 — the pair has nowhere to stand');
  else if (hat === 'clerk') {
    const p = await probe();
    const bad = [];
    if (!p) bad.push('no card');
    else {
      if (!p.pen) bad.push('no live ✒️ on the one setting whose pen is held');
      if (p.composer) bad.push('a second commit on a clerk’s card (' + JSON.stringify(p.live) + ')');
      if (!/not a member/i.test(p.note)) bad.push('no sentence saying why — notes read ' + JSON.stringify(p.note.slice(0, 160)));
    }
    if (bad.length) fail('⏰ pair · ' + bad.join(' · '));
    say('  ⏰ pair      · ' + (bad.length ? 'FAIL' : 'the pen alone, and the sentence — PASS'));
  } else {
    // the route is read off the value at compose time (K6), so the second
    // commit's own words are the assertion: a date is ordinary, *never* is
    // constitutional, on one card without leaving it
    const when = new Date(Date.now() + 7_200_000);
    const pad = (n) => String(n).padStart(2, '0');
    const local = when.getFullYear() + '-' + pad(when.getMonth() + 1) + '-' + pad(when.getDate()) +
      'T' + pad(when.getHours()) + ':' + pad(when.getMinutes());
    await page.evaluate((v) => {
      const el = document.querySelector('.setupcard [data-txt="endsAt"]');
      if (el) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }
    }, local);
    await T(500);
    const pOrd = await probe();
    const bad = [];
    if (!pOrd) bad.push('no card');
    else {
      if (!pOrd.pen) bad.push('no live ✒️ beside it');
      if (!pOrd.composer) bad.push('one commit where there should be two');
      if (!pOrd.live.some((l) => /Propose/.test(l))) {
        bad.push('an ordinary value offers no ✏️ Propose (' + JSON.stringify(pOrd.live) + ')');
      }
    }
    await clickIn('[data-set="ending"][data-val="perpetual"]');
    await T(600);
    const pCon = await probe();
    if (!pCon || !pCon.live.some((l) => /all members|ask everyone/i.test(l))) {
      bad.push('*never* offers no 🏛️ (' + JSON.stringify((pCon || {}).live) + ')');
    }
    // back to the date, and put *that* to the room: an ordinary motion is the
    // half with a stake to pay, so it is the one worth pressing
    await clickIn('[data-set="ending"][data-val="ends"]');
    await T(600);
    const label = await press(3600, '[data-putmotion]');
    if (!label) bad.push('the second commit would not press');
    await T(1200);
    const running = await page.evaluate(async (slug) => {
      const b = await (await fetch(`/api/d/${slug}/view`)).json().catch(() => null);
      const ms = (b && b.view && b.view.motions) || [];
      return ms.filter((m) => m.status === 'running' && m.payload &&
        m.payload.kind === 'set' && m.payload.setting === 'ending')
        .map((m) => ({ id: m.id, route: m.route, mine: m.mine }));
    }, SLUG);
    if (!running.length) bad.push('nothing is running on ⏰ after the press (pressed ' + JSON.stringify(label) + ')');
    else if (running[0].route !== 'ordinary') bad.push('the motion opened as ' + running[0].route);
    // **the pen is still live beside it**: proposing spends a ✏️, never the
    // ✒️, so the Founder can still set ⏰ directly with the motion running
    const still = await cmd('set-setting', { setting: 'ending', value: { endsAtMs: ENDS + 120_000 } });
    if (still.status !== 200) bad.push('the pen went with the proposal → ' + still.status);
    if (bad.length) fail('⏰ pair · ' + bad.join(' · '));
    say('  ⏰ pair      · ' + (bad.length ? 'FAIL — ' + bad.join(' · ')
      : 'the pen and ' + JSON.stringify(label) + ', the glyph following the value — PASS'));
    // put the document back the way the rest of this walk expects it: a
    // motion left running would still be running at the close, and the closed
    // page's *nothing commits* sweep is about cards, not about a live race
    for (const m of running) await cmd('withdraw-motion', { motion: m.id });
    await T(600);
  }
  await clickIn('.setupcard [data-revert]');

  /* ---- closed ----------------------------------------------------------- */
  const soon = Date.now() + 2_000;
  const closing = await cmd('set-setting', { setting: 'ending', value: { endsAtMs: soon } });
  if (closing.status !== 200) fail('could not bring ⏰ forward to close the document → ' +
    closing.status + ' ' + JSON.stringify((closing.body || {}).error || '').slice(0, 160));
  // **Only the minute tick closes a document.** A command reaches
  // `driveBridge` through `commit`, and that closes the *engine* — but
  // `doc.cs.tick(t)`, which is what runs the constitution's own close, is
  // called from the server's once-a-minute `tick` and from nowhere else
  // (`server.ts`). So there is nothing to poke and this waits on the
  // metronome, reading rather than writing: a poke would only add a refusal
  // the wire net below would then have to be told to expect.
  const shutNow = () => page.evaluate(async (slug) => {
    const b = await (await fetch(`/api/d/${slug}/view`)).json().catch(() => null);
    return !!(b && b.view && b.view.closed);
  }, SLUG);
  for (let i = 0; i < 45 && !(await shutNow()); i++) await T(2_000);
  await page.goto(DOCBASE + '/d/' + SLUG);
  await T(2600);
  const shut = await page.evaluate(() => !!document.querySelector('#doc.closedpage'));
  if (!shut) {
    fail('the document did not close · ' + JSON.stringify(await page.evaluate(async (slug) => {
      const b = await (await fetch(`/api/d/${slug}/view`)).json().catch(() => null);
      const rows = b && b.view && b.view.settings;
      return b && { closed: b.view && b.view.closed, now: b.serverNowMs,
        ending: rows && (rows.find((r) => r.setting === 'ending') || {}).value };
    }, SLUG)) + ' · wanted ' + soon);
    await page.close(); return;
  }

  // Q354: a filed pile is still openable to its settled card. Q470: and it
  // asks nothing. So every tab must still open, and nothing on any of them
  // may commit — including on ⏰, whose pen was never laid down.
  const tabs = await page.evaluate(() => [...document.querySelectorAll(
    '#band .achip[data-tab], #titlepara .achip[data-tab]')].map((el) => el.dataset.tab));
  let opened = 0;
  const armed = [];
  let gone = 0;
  for (const k of tabs) {
    if (!(await openCard(k))) {
      // the band is rebuilt as cards open and close, so a tab read into the
      // list above may simply not be there any more — which is not a filed
      // pile refusing to open, and only the latter is Q354's promise
      const still = await page.evaluate((kk) => !!document.querySelector(
        '#band [data-tab="' + kk + '"], #titlepara [data-tab="' + kk + '"]'), k);
      if (still) armed.push(k + ': would not open');
      else gone += 1;
      continue;
    }
    opened += 1;
    const p = await probe();
    if (!p) { armed.push(k + ': no card'); continue; }
    const bad = [];
    if (p.lane) bad.push('a title lane');
    if (p.radio) bad.push('a value radio');
    if (p.why) bad.push('a why lane');
    if (p.pen) bad.push('a live ✒️');
    if (p.composer) bad.push('a composer');
    if (bad.length) armed.push(k + ': ' + bad.join(' · '));
    await clickIn('.setupcard [data-revert]');
  }
  say('closed     · ' + opened + ' of ' + tabs.length + ' tabs still open (Q354)' +
    (gone ? ', ' + gone + ' redrawn away' : '') +
    (armed.length ? '\n  FAIL: still armed — ' + armed.join(' | ') : ' · and none of them commits'));
  if (armed.length) stuck.push(hat + ': cards still armed on the closed page');
  await refuse('set-setting', { setting: 'ending', value: { endsAtMs: soon + 60_000 } },
    /the document has closed/, '⏰ set-setting once closed');
  await refuse('relinquish', { setting: 'rate', power: 'assent' },
    /the document has closed/, 'relinquish once closed');

  if (errors.length) { say('page errors· ' + JSON.stringify(errors)); stuck.push(hat + ': page errors'); }
  await page.close();
};

const HATS = HAT === 'both' ? ['member', 'clerk'] : [HAT];
for (const hat of HATS) {
  say('\n──── the founder is a ' + hat + ' ' + '─'.repeat(40));
  await runDocument(hat);
}

// the net: this walk provokes refusals on purpose, so what it reports is the
// surplus — a 4xx nothing here asked for, which is the class of defect the
// whole entry is about (a refused act the page renders as though it worked)
if (refused.length > provoked) {
  say('\nwire       · FAIL: ' + refused.length + ' refusals at the wire, ' + provoked +
    ' of them provoked:\n  ' + refused.join('\n  '));
  stuck.push('unprovoked refusals at the wire');
} else {
  say('\nwire       · ' + refused.length + ' refusals, all ' + provoked + ' of them asked for');
}
say(stuck.length ? '\nFAILED: ' + stuck.join(' · ')
  : '\nok — a laid-down pen is laid down, and a closed document takes no edit');
await browser.close();
process.exit(stuck.length ? 1 : 0);
