/**
 * member-questions-walk — a member's page while the founder is still founding
 * (Q1365, Q1372; Ed, 2026-09-15, after the `lab-2026` room).
 *
 * Two rulings, one scene. The founder saves, invites a member, sets 🌍 and 🪪,
 * delegates ⏱️ and 👥, and leaves 🎩 unanswered — which the lab room's bot
 * founder did for two hours. The member follows their invitation:
 *
 *   1 — 🏛️ is served at arrival, a tab on the Founded line beside where the
 *       founder's ✒️ 🛡️ ride (Q1365: *you should get a 🏛️ grant when you first
 *       become a member*); and no blind question is served until its OK
 *       (*don't show blind questions until you have acknowledged the power*).
 *   2 — the delegated settings' paragraphs are on the member's page and, once
 *       the grant is OK'd, the first question is served with 🎩 still
 *       unanswered (Q1372: *if the founder hasn't decided whether to delegate a
 *       setting yet, how could it be blocking decisions for members?*); the
 *       member's own questions still cascade in the document's order.
 *   3 — on a fresh load the same holds (the OK persists; the rail is rebuilt
 *       from the module, not the page).
 *
 * Pre-fix, the page was red on 1 (no 🏛️ at arrival — it hung off the first
 * question, which was withheld) and 2 (no paragraph and no question until the
 * founder answered 🎩). Usage: `npm run member-questions-walk -- <base>`.
 */
import { chromium } from 'playwright';
import { assertServerBuild, walkBase } from './lib/assert-server.mjs';
import { say, sleep as T, followLink, linkIn, outbox as devOutbox, post as postTo } from './lib/walk.mjs';

const BASE = walkBase(process.argv, process.env, 'http://127.0.0.1:8140');
await assertServerBuild(BASE, 'member-questions-walk');
const stuck = [];
const errors = [];
const refused = [];
const run = Date.now().toString(36);
const post = (path, body, cookie) => postTo(BASE, path, body, cookie);
const outboxLink = async (to) => {
  for (let i = 0; i < 30; i++) {
    const m = (await devOutbox(BASE)).find((x) => x.to === to && linkIn(x));
    if (m) return linkIn(m);
    await T(300);
  }
  throw new Error('no mail to ' + to);
};
const POLL = 4600; // one 4s poll and a little air
const jars = new Map();
let SLUG;
const cmd = async (who, name, args = {}) => {
  const r = await post(`/api/d/${SLUG}/cmd`, { cmd: name, args }, jars.get(who));
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${who} · ${name} refused (${r.status}): ${JSON.stringify(j)}`);
  return j.result ?? j;
};
const check = (label, ok, detail) => {
  say((ok ? '  ok   · ' : '  FAIL · ') + label + (ok ? '' : ' · ' + detail));
  if (!ok) stuck.push(label);
};

/* ---- the founding, at the wire ------------------------------------------ */
const founderMail = `founder-${run}@example.org`;
const created = await (await post('/api/docs', { title: `Member questions ${run}`, email: founderMail, isMember: true })).json();
SLUG = created.slug;
jars.set('founder', (await followLink(created.devLink)).cookie);
await cmd('founder', 'confirm-starting-text', { text: '# Member questions\nOne clause about the kitchen rota.' });
const m1 = `m1-${run}@example.org`;
await cmd('founder', 'invite', { email: m1 });
const m1Invite = await outboxLink(m1);
await cmd('founder', 'set-setting', { setting: 'chamber', value: { rung: 'link' } });
await cmd('founder', 'set-setting', { setting: 'admission', value: { price: 'proposal' } });
await cmd('founder', 'delegate', { setting: 'rate' });
await cmd('founder', 'delegate', { setting: 'quorum' });
say(`founded ${SLUG} · 🌍 🪪 set, ⏱️ 👥 delegated, 🎩 left unanswered, ${m1.split('@')[0]} invited`);

/* ---- the member's page --------------------------------------------------- */
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
page.on('pageerror', (e) => errors.push(String(e)));
page.on('response', (r) => { if (r.url().includes('/api/') && r.status() >= 400) {
  refused.push(r.status() + ' ' + r.request().method() + ' ' + new URL(r.url()).pathname + ' ' +
    String(r.request().postData() || '').slice(0, 120));
} });
await page.goto(m1Invite, { waitUntil: 'networkidle' });
for (let i = 0; i < 40 && !page.url().includes('/d/'); i++) await page.waitForTimeout(500);
await page.waitForTimeout(2600);
const state = () => page.evaluate(() => ({
  rail: [...document.querySelectorAll('.qitem')].map((el) => el.dataset.q),
  paras: [...document.querySelectorAll('[data-para]')].map((el) => el.dataset.para),
  founded: [...document.querySelectorAll('[data-para="founded"] [data-tab], [data-setupcard="grant-voice"] [data-tab]')]
    .map((el) => el.dataset.tab),
  f: window.__founding ? (({ constituted, amFounder, viewerIsMember, voiceAcked }) =>
    ({ constituted, amFounder, viewerIsMember, voiceAcked }))(window.__founding()) : null,
}));

// 1 — at arrival: 🏛️ on the Founded line, no question, the delegated paragraphs present
let s = await state();
say(`arrival    · rail ${JSON.stringify(s.rail)} · paras ${s.paras.join(' ')}`);
check('the invited seat is a member of an unbegun document', s.f && s.f.viewerIsMember && !s.f.amFounder && !s.f.constituted, JSON.stringify(s.f));
check('🏛️ is served at arrival (Q1365)', s.rail.includes('grant-voice'), 'rail ' + JSON.stringify(s.rail));
check('🏛️ rides the Founded line', s.founded.includes('grant-voice'), 'Founded line tabs ' + JSON.stringify(s.founded));
check('no blind question before the grant is OK\'d (Q1365)', !s.rail.some((k) => k.startsWith('ans-')), 'rail ' + JSON.stringify(s.rail));
check('the delegated settings are on the page with 🎩 unanswered (Q1372)', s.paras.includes('rate') && s.paras.includes('quorum'), 'paras ' + s.paras.join(' '));
check('what the founder has not reached is absent', !s.paras.includes('hat') && !s.paras.includes('lapse'), 'paras ' + s.paras.join(' '));

// 2 — the OK releases the first question, in order, with 🎩 still unanswered
const pressed = await page.evaluate(() => new Promise((res) => {
  const el = document.querySelector('#rail [data-card="grant-voice"]');
  if (!el) return res('no entry');
  el.click();
  setTimeout(() => {
    const b = document.querySelector('.setupcard[data-setupcard="grant-voice"] [data-ok]');
    if (!b) return res('no OK on the open card');
    if (b.disabled) return res('OK disabled');
    b.click(); res('ok');
  }, 600);
}));
await T(1600);
s = await state();
say(`after OK   · ${pressed} · rail ${JSON.stringify(s.rail)}`);
check('the grant\'s OK is pressed', pressed === 'ok', pressed);
check('⏱️ is served once 🏛️ is acknowledged (Q1365, Q1372)', s.rail.includes('ans-rate'), 'rail ' + JSON.stringify(s.rail));
check('👥 waits its turn behind ⏱️ (the member\'s own cascade)', !s.rail.includes('ans-quorum'), 'rail ' + JSON.stringify(s.rail));
check('🏛️ leaves the rail once OK\'d', !s.rail.includes('grant-voice'), 'rail ' + JSON.stringify(s.rail));

// the member answers ⏱️ by the API; the page learns by its poll
const login = await (await post(`/api/d/${SLUG}/login`, { email: m1 })).json();
jars.set('m1', (await followLink(login.devLink)).cookie);
await cmd('m1', 'answer', { setting: 'rate', value: { grant: 3, cap: 5, dripMinutes: 10 } });
await T(POLL + 1500);
s = await state();
say(`answered ⏱️ · rail ${JSON.stringify(s.rail)}`);
check('👥 follows ⏱️ by the poll', s.rail.includes('ans-quorum'), 'rail ' + JSON.stringify(s.rail));

// 3 — a fresh load says the same
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(2600);
s = await state();
say(`reload     · rail ${JSON.stringify(s.rail)} · paras ${s.paras.join(' ')}`);
check('the OK persists: no 🏛️ and 👥 served on a fresh load', !s.rail.includes('grant-voice') && s.rail.includes('ans-quorum'), 'rail ' + JSON.stringify(s.rail));
check('the delegated paragraphs stand on a fresh load, 🎩 still unanswered', s.paras.includes('rate') && s.paras.includes('quorum') && !s.paras.includes('hat'), 'paras ' + s.paras.join(' '));

/* ---- 4 — 💤 answered in minutes, and back (Q1439, ruling j) --------------
 * The blind period is stated in minutes, hours or days from Q1439, because
 * one period does two jobs: silent on everything for that long and a
 * membership lapses, silent on one proposal for that long and the member
 * abstains on it — and a card offering 7 to 365 days could never turn silence
 * into an abstention inside a room that lasts an afternoon.
 *
 * Driven through the card rather than the wire, because what is under test is
 * the round trip *the surface* makes: the member types a number in a unit,
 * the module is handed a spell in milliseconds, and the card has to come back
 * saying what they said. The page's own scalar for 💤 is the spell now, so a
 * straight `PAGEVAL` read of the committed answer would put 1,200,000 in the
 * box (`ANSBACK` is what stops it). 👥 is answered first because the member's
 * questions cascade in the document's order.
 */
await cmd('m1', 'answer', { setting: 'quorum', value: { form: 'share', n: 40 } });
await cmd('founder', 'delegate', { setting: 'lapse' });
await T(POLL + 1500);
s = await state();
check('💤 is served once it is handed over', s.rail.includes('ans-lapse'), 'rail ' + JSON.stringify(s.rail));
if (s.rail.includes('ans-lapse')) {
  const drove = await page.evaluate(() => new Promise((res) => {
    const entry = document.querySelector('#rail [data-card="ans-lapse"]') ||
      [...document.querySelectorAll('#rail .qitem')].find((e) => e.dataset.q === 'ans-lapse');
    if (!entry) return res('no rail entry');
    (entry.querySelector('[data-card]') || entry).click();
    setTimeout(() => {
      const c = document.querySelector('.setupcard');
      const u = c && c.querySelector('[data-ansunit="lapse"]');
      if (!u) return res('no unit picker on the open card');
      u.value = 'minutes';
      u.dispatchEvent(new Event('change', { bubbles: true }));
      setTimeout(() => {
        const c2 = document.querySelector('.setupcard');
        const n = c2 && c2.querySelector('[data-ansnum="lapse"]');
        if (!n) return res('no number box');
        n.value = '20';
        for (const e of ['input', 'change']) n.dispatchEvent(new Event(e, { bubbles: true }));
        setTimeout(() => {
          const b = document.querySelector('.setupcard [data-confirm]');
          if (!b) return res('no ✓ on the card');
          if (b.disabled) return res('the ✓ is dark on 20 minutes');
          b.click(); res('ok');
        }, 500);
      }, 500);
    }, 700);
  }));
  check('the member answers 💤 as 20 minutes', drove === 'ok', drove);
  await T(POLL + 1500);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2800);
  const back = await page.evaluate(() => new Promise((res) => {
    const tab = document.querySelector('[data-tab="ans-lapse"]') ||
      document.querySelector('[data-card="ans-lapse"]') ||
      document.querySelector('[data-para="lapse"] [data-tab="lapse"]') ||
      document.querySelector('[data-tab="lapse"]');
    if (!tab) return res({ err: 'no 💤 tab to open' });
    tab.click();
    setTimeout(() => {
      const c = document.querySelector('.setupcard');
      const n = c && c.querySelector('[data-ansnum="lapse"]');
      const u = c && c.querySelector('[data-ansunit="lapse"]');
      res({ n: n ? n.value : null, unit: u ? u.value : null,
        card: c ? c.dataset.setupcard : null });
    }, 900);
  }));
  check('the answer comes back as 20 minutes, not as a spell in milliseconds',
    back.n === '20' && back.unit === 'minutes', JSON.stringify(back));
}

say('errors     · ' + (errors.length ? errors.slice(0, 4).join(' / ') : 'none'));
say('refused    · ' + (refused.length ? refused.join(' / ') : 'none'));
say(stuck.length ? `member-questions-walk · ${stuck.length} FAIL` : 'member-questions-walk · ok');
await browser.close();
process.exit(stuck.length || errors.length || refused.length ? 1 : 0);
