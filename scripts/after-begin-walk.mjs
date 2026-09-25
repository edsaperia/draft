/**
 * after-begin-walk — a member's page across 🍾 when the founder lays every
 * power down (Q1364, the lab-2026 bot room, 2026-09-15).
 *
 * The room that found this was founded by a bot that laid down everything at
 * 🍾, so every setting's holder was the membership and nobody wore 👑 — and
 * the page read *held by the membership* as *a blind question is open*. Three
 * faces, one rule: after 🍾 a setting held by nobody is a settled setting at
 * its standing value, neither an open question nor news owed to somebody who
 * did not watch it resolve.
 *
 *   (a) a member's fresh load of a begun document served ⏱️ 👥 🤝 as open
 *       answer cards, for settings the founder set and never delegated;
 *   (b) ✉️ composed a member's invitation with the 🏛️ hold while 🪪 stood at
 *       ✏️ and the card's own sentence said so;
 *   (c) a page open from before the founder's 🎩 answer, through the
 *       founding, that answered its questions on the page, showed *nothing*
 *       after 🍾 — the resolved questions' news sat behind an OK no card
 *       offered, and the gates and the 🏛️ grant waited behind the news.
 *
 * Three scenes, each its own document on the one server, driven at the wire
 * where the founding is not what is under test and on the page where it is:
 *
 *   scene 1 — a member's page open through 🍾, then reloaded (a, and the
 *             ✉️ route on a fresh login: b);
 *   scene 2 — Hossein's page: open from before 🎩, the three questions
 *             answered on the page, 🍾 — the news must be servable, the
 *             OKs must bring 💡 ⚖️ 🏛️, and ✉️ must compose at 🪪's price (c, b).
 *
 * Usage:  node scripts/after-begin-walk.mjs [http://127.0.0.1:8140] [--price=proposal|assembly]
 *   a dev server with the dev outbox (no RESEND_API_KEY); the base defaults
 *   to DRAFT_BASE_URL, then PORT, then 8140. `--price` is what 🪪 stands at,
 *   and what the member's ✉️ must therefore compose with: ✏️ at proposal,
 *   🏛️ at assembly.
 *
 * Red on the page as it stood on 2026-09-15 (before the Q1364 fix), five lines:
 *   FAIL · no answer card on a fresh load of a begun document · rail ["ans-applications", … "ans-rate","ans-quorum"]
 *   FAIL · ✉️ composes at 🪪’s price on a fresh login (proposal) · {"commit":"hold","title":"Ask all members — …"}
 *   FAIL · the resolved questions are news the rail serves · rail ["myname","mypic"]
 *   FAIL · the OKs bring 💡 ⚖️ and 🏛️ on the long-lived page · rail ["myname","mypic"]
 *   FAIL · ✉️ composes at 🪪’s price on the long-lived page (proposal) · {"commit":"hold", …}
 * Since Q1365 (2026-09-15) scene 2 OKs 🏛️ at arrival before answering — the
 * grant arrives with membership and no blind question is served until its OK —
 * so the long-lived page's post-🍾 OKs bring 💡 ⚖️ alone.
 * Since Q1540 (2026-09-24) a member is shown 💡 ⚖️ only after 🏛️'s OK, so
 * scene 1's OKs bring 🏛️ alone, and its OK brings 💡 ⚖️.
 */
import { chromium } from 'playwright';
import { assertServerBuild, walkBase } from './lib/assert-server.mjs';
import { say, sleep as T, arg, followLink, linkIn, outbox as devOutbox, post as postTo, landOn } from './lib/walk.mjs';

const BASE = walkBase(process.argv, process.env, 'http://127.0.0.1:8140');
const PRICE = arg('price', 'proposal');
const SCENE = arg('scene', 'both');   // 1 | 2 | both — one scene while the other is known
if (!['proposal', 'assembly'].includes(PRICE)) {
  say('FAIL: --price must be proposal or assembly');
  process.exit(1);
}
await assertServerBuild(BASE, 'after-begin-walk');
const stuck = [];
const errors = [];
const refused = [];
const run = Date.now().toString(36);
const post = (path, body, cookie) => postTo(BASE, path, body, cookie);
const outboxLink = async (to, seen = new Set()) => {
  for (let i = 0; i < 30; i++) {
    const m = (await devOutbox(BASE)).find((x) => x.to === to && linkIn(x) && !seen.has(linkIn(x)));
    if (m) { seen.add(linkIn(m)); return linkIn(m); }
    await T(300);
  }
  throw new Error('no mail to ' + to);
};
const POLL = 4600; // one 4s poll and a little air

/* ---- one document, at the wire ------------------------------------------ */
// the founder's constitution — 🪪 at the price under test, 🌍 delegated in
// scene 1, 👥 ⏱️ 🌍 delegated in scene 2; the rest the founder's own
const SETTINGS = () => ({
  ending: { endsAtMs: Date.now() + 30 * 24 * 3600_000 }, authorship: { rung: 'sealedElective' },
  judgments: { rung: 'after' }, applications: { apply: true }, admission: { price: PRICE },
  removal: { price: 'consent' }, lapse: { afterMs: null }, machines: { enabled: false, budget: 0 },
  pace: { shape: 'fixed' }, bar: { pct: 60 }, quorum: { form: 'share', n: 50 },
  rate: { grant: 5, cap: 8, dripMinutes: 10 }, chamber: { rung: 'link' },
});
const ANSWERS = { chamber: { rung: 'link' }, rate: { grant: 5, cap: 8, dripMinutes: 10 }, quorum: { form: 'share', n: 50 } };
class Doc {
  constructor(title) { this.title = title; this.jars = new Map(); this.slug = null; }
  async found(founderIsMember) {
    const email = `founder-${run}-${this.title.toLowerCase()}@example.org`;
    const created = await (await post('/api/docs', { title: `${this.title} ${run}`, email, isMember: true })).json();
    this.slug = created.slug;
    this.jars.set('founder', (await followLink(created.devLink)).cookie);
    await this.cmd('founder', 'confirm-starting-text', { text: ['# ' + this.title, 'One clause about the kitchen rota.', 'Another clause about guests.', 'A third clause about the noticeboard.'].join('\n') });
    if (founderIsMember) await this.cmd('founder', 'set-convenor-membership', { isMember: true });
  }
  async invite(who) {
    const email = `${who}-${run}-${this.title.toLowerCase()}@example.org`;
    await this.cmd('founder', 'invite', { email });
    return { who, email, link: await outboxLink(email) };
  }
  async seat(who, link) { this.jars.set(who, (await followLink(link)).cookie); }
  async loginLink(email) { return (await (await post(`/api/d/${this.slug}/login`, { email })).json()).devLink; }
  async login(who, email) {
    const r = await (await post(`/api/d/${this.slug}/login`, { email })).json();
    this.jars.set(who, (await followLink(r.devLink)).cookie);
    return r.devLink;
  }
  async cmd(who, name, args = {}) {
    const r = await post(`/api/d/${this.slug}/cmd`, { cmd: name, args }, this.jars.get(who));
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`${who} · ${name} refused (${r.status}): ${JSON.stringify(j)}`);
    return j.result ?? j;
  }
  async constitution(delegated) {
    for (const [setting, value] of Object.entries(SETTINGS())) {
      if (delegated.includes(setting)) continue;
      await this.cmd('founder', 'set-setting', { setting, value });
    }
    for (const setting of delegated) await this.cmd('founder', 'delegate', { setting });
  }
  /** 🍾 with every power laid down — the lab-2026 founding. */
  async beginLayingAllDown() {
    const health = await (await fetch(`${BASE}/healthz`)).json();
    const keys = [...health.catalogue.filter((id) => !['displayName', 'picture', 'startingText'].includes(id)),
      'startingText', 'door:invite', 'door:remove'];
    await this.cmd('founder', 'begin', { laidDown: keys.flatMap((setting) => [{ setting, power: 'unilateral' }, { setting, power: 'assent' }]) });
  }
}

/* ---- the page ----------------------------------------------------------- */
const browser = await chromium.launch();
const newPage = async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on('pageerror', (e) => errors.push(String(e && e.message)));
  page.on('response', (r) => { if (r.url().includes('/api/') && r.status() >= 400 && r.request().method() === 'POST') {
    refused.push(r.status() + ' ' + String(r.request().postData() || '').slice(0, 120)); } });
  return page;
};
const land = async (page, url) => { await landOn(page, url, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500); };
// the rail as the member sees it, and the readout beside it
const state = (page) => page.evaluate(() => {
  const f = window.__founding ? window.__founding() : null;
  return {
    rail: [...document.querySelectorAll('#rail .qitem')].map((el) => el.dataset.q),
    news: f ? f.order.filter((l) => / st=news$/.test(l)).map((l) => l.split(' ')[0]) : null,
    unservableNews: f ? f.unservableNews : null,
    constituted: f ? f.constituted : null,
  };
});
// press OK on every news entry in the rail, one press each, until none is left
const okEverything = async (page, max = 14) => {
  const pressed = [];
  for (let i = 0; i < max; i++) {
    const k = await page.evaluate(() => {
      const el = [...document.querySelectorAll('#rail .qitem')].map((e) => e.dataset.q)
        .find((q) => !/^(myname|mypic|ans-|grant-|canpropose|canjudge|mine:)/.test(q));
      return el || null;
    });
    if (!k) break;
    const r = await page.evaluate((k) => {
      const el = document.querySelector('#rail [data-card="' + k + '"]'); if (!el) return 'no entry';
      el.click();
      return new Promise((res) => setTimeout(() => {
        const b = document.querySelector('.setupcard [data-ok]');
        if (!b) return res('no OK on ' + k); if (b.disabled) return res('OK disabled on ' + k);
        b.click(); res(k);
      }, 500));
    }, k);
    pressed.push(r);
    if (!/^[a-z]/.test(r) || /^no |^OK /.test(r)) break;
    await T(1200);
  }
  return pressed;
};
// accept 🏛️ from its rail entry: 'ok', or what stood in the way
const okVoice = (page) => page.evaluate(() => new Promise((res) => {
  const entry = document.querySelector('#rail [data-card="grant-voice"]'); if (!entry) return res('no 🏛️ entry');
  entry.click();
  setTimeout(() => { const b = document.querySelector('.setupcard[data-setupcard="grant-voice"] [data-ok]');
    if (!b || b.disabled) return res('no live OK on 🏛️'); b.click(); res('ok'); }, 700);
}));
// the ✉️ tab, opened: what its commit is
const inviteRoute = (page) => page.evaluate(async () => {
  const t = document.querySelector('[data-tab="invite"]'); if (!t) return { err: 'no ✉️ tab' };
  t.click(); await new Promise((s) => setTimeout(s, 800));
  const card = document.querySelector('.setupcard'); if (!card) return { err: '✉️ opened no card' };
  const hold = card.querySelector('[data-holdmotion]'), put = card.querySelector('[data-putmotion]');
  return { card: card.dataset.setupcard,
    commit: hold ? 'hold' : put ? 'put' : 'none',
    title: (hold || put || {}).title || '',
    box: card.querySelector('textarea[data-mjoin]') ? 'textarea' : card.querySelector('input[data-mjoin]') ? 'input' : 'none',
    sentence: (card.textContent || '').replace(/\s+/g, ' ').slice(0, 200) };
});
const routeOk = (r) => (PRICE === 'proposal' ? r.commit === 'put' && r.box === 'textarea'
  : r.commit === 'hold' && r.box === 'input');
const verdict = (label, ok, detail) => {
  say((ok ? '  ok       · ' : '  FAIL     · ') + label + (detail ? ' · ' + detail : ''));
  if (!ok) stuck.push(label);
};

/* ---- scene 1 — a member's page open through 🍾, then reloaded ------------- */
if (SCENE !== '2') {
  say('scene 1    · a member’s page open through 🍾 (every power laid down), then a fresh load');
  const d = new Doc('Begun');
  await d.found(true);
  const m1 = await d.invite('m1'), m2 = await d.invite('m2');
  await d.seat('m2', m2.link);
  const page = await newPage();
  await land(page, m1.link);           // m1 arrives before any setting is set
  await d.login('m1', m1.email);       // and holds an API seat beside the page
  await d.constitution(['chamber']);
  for (const who of ['founder', 'm1', 'm2']) await d.cmd(who, 'answer', { setting: 'chamber', value: ANSWERS.chamber });
  await T(POLL * 2);
  await d.beginLayingAllDown();
  await T(POLL * 2);
  const s1 = await state(page);
  verdict('after 🍾 the page has begun', s1.constituted === true, 'constituted=' + s1.constituted);
  verdict('no answer card on a begun document (polled page)',
    !s1.rail.some((k) => /^ans-/.test(k)), 'rail ' + JSON.stringify(s1.rail));
  verdict('every news card is in the rail (polled page)',
    (s1.unservableNews || []).length === 0, 'unservable ' + JSON.stringify(s1.unservableNews) + ' · news ' + JSON.stringify(s1.news));
  const pressed = await okEverything(page);
  await T(POLL);
  const s2 = await state(page);
  say('           · OKs pressed ' + JSON.stringify(pressed));
  // **🏛️ first** (Q1540, Ed 2026-09-24): the news OKs bring 🏛️, and 💡 ⚖️
  // are not shown to a member until it is accepted
  verdict('the OKs bring 🏛️, and not yet 💡 ⚖️ (Q1540)',
    s2.rail.includes('grant-voice') && !s2.rail.some((k) => k === 'canpropose' || k === 'canjudge'),
    'rail ' + JSON.stringify(s2.rail));
  const voice = await okVoice(page);
  await T(POLL);
  const s2b = await state(page);
  verdict('accepting 🏛️ brings 💡 ⚖️', voice === 'ok' &&
    ['canpropose', 'canjudge'].every((k) => s2b.rail.includes(k)) && !s2b.rail.includes('grant-voice'),
    voice + ' · rail ' + JSON.stringify(s2b.rail));
  await land(page, page.url());
  const s3 = await state(page);
  verdict('no answer card on a fresh load of a begun document',
    !s3.rail.some((k) => /^ans-/.test(k)), 'rail ' + JSON.stringify(s3.rail));
  verdict('a fresh load re-owes none of the acknowledged news',
    (s3.news || []).filter((k) => !/^(canpropose|canjudge|grant-voice)$/.test(k)).length === 0, 'news ' + JSON.stringify(s3.news));
  // (b) on a fresh login: the member's ✉️ composes at 🪪's price
  const p2 = await newPage();
  await land(p2, await d.loginLink(m2.email));
  const r = await inviteRoute(p2);
  verdict('✉️ composes at 🪪’s price on a fresh login (' + PRICE + ')', !r.err && routeOk(r), JSON.stringify(r));
  await page.close(); await p2.close();
}

/* ---- scene 2 — Hossein's page ------------------------------------------- */
if (SCENE !== '1') {
  say('scene 2    · a page open from before 🎩, the questions answered on it, then 🍾');
  const d = new Doc('Hossein');
  await d.found(false);                // 🎩 unanswered, as found-lab left it
  const m1 = await d.invite('m1'), m2 = await d.invite('m2');
  await d.seat('m2', m2.link);
  await d.constitution(['quorum', 'rate', 'chamber']);
  const page = await newPage();
  await land(page, m1.link);
  await T(POLL);
  await d.cmd('founder', 'set-convenor-membership', { isMember: true });
  await T(POLL * 2);
  // the three questions, answered on the page: first block, then the ✓
  const answerOnPage = (k) => page.evaluate(async (k) => {
    const entry = document.querySelector('#rail [data-card="' + k + '"]'); if (!entry) return 'no entry ' + k;
    entry.click(); await new Promise((s) => setTimeout(s, 700));
    const card = document.querySelector('.setupcard'); if (!card) return 'no card for ' + k;
    const rung = card.querySelector('.lanepick'); if (rung) { rung.click(); await new Promise((s) => setTimeout(s, 400)); }
    // the rung click re-renders the card: re-read it before the fields and the row
    const live = () => document.querySelector('.setupcard');
    for (const f of live().querySelectorAll('input:not([type=radio]):not([type=checkbox])')) {
      f.focus(); f.value = '10'; f.dispatchEvent(new Event('input', { bubbles: true })); f.dispatchEvent(new Event('change', { bubbles: true }));
    }
    await new Promise((s) => setTimeout(s, 400));
    const btns = [...live().querySelectorAll('button')].filter((b) => !b.disabled);
    const b = btns[btns.length - 1]; if (!b) return 'nothing enabled on ' + k;
    b.click(); return k;
  }, k);
  // **🏛️ first** (Q1365, Ed 2026-09-15): the grant arrives at arrival on the
  // Founded line and no blind question is served until it is OK'd — so the
  // member's page holds the voice and nothing else askable until this press
  const voiceOk = await okVoice(page);
  await T(1500);
  verdict('🏛️ is served at arrival and OK\'d before any question (Q1365)', voiceOk === 'ok', voiceOk);
  const answered = [];
  for (const k of ['ans-chamber', 'ans-rate', 'ans-quorum']) { answered.push(await answerOnPage(k)); await T(1500); }
  verdict('the three questions answered on the page', answered.join() === 'ans-chamber,ans-rate,ans-quorum', JSON.stringify(answered));
  for (const who of ['founder', 'm2']) for (const [setting, value] of Object.entries(ANSWERS)) await d.cmd(who, 'answer', { setting, value });
  await T(POLL * 2);
  await d.beginLayingAllDown();
  await T(POLL * 2);
  const s1 = await state(page);
  verdict('after 🍾 the page has begun', s1.constituted === true, 'constituted=' + s1.constituted);
  verdict('the resolved questions are news the rail serves',
    ['rate', 'quorum', 'chamber'].every((k) => s1.rail.includes(k)) && (s1.unservableNews || []).length === 0,
    'rail ' + JSON.stringify(s1.rail) + ' · unservable ' + JSON.stringify(s1.unservableNews));
  verdict('no answer card after 🍾 (polled page)', !s1.rail.some((k) => /^ans-/.test(k)), 'rail ' + JSON.stringify(s1.rail));
  const pressed = await okEverything(page);
  await T(POLL);
  const s2 = await state(page);
  say('           · OKs pressed ' + JSON.stringify(pressed));
  // 🏛️ was OK'd at arrival (Q1365), so after 🍾 the OKs bring the two gates
  // and the voice is not served again
  verdict('the OKs bring 💡 ⚖️ on the long-lived page, 🏛️ having been OK\'d at arrival',
    ['canpropose', 'canjudge'].every((k) => s2.rail.includes(k)) && !s2.rail.includes('grant-voice'),
    'rail ' + JSON.stringify(s2.rail));
  const r = await inviteRoute(page);
  verdict('✉️ composes at 🪪’s price on the long-lived page (' + PRICE + ')', !r.err && routeOk(r), JSON.stringify(r));
  await page.close();
}

await browser.close();
say('errors     · ' + (errors.length ? errors.slice(0, 4).join(' / ') : 'none'));
say('refused    · ' + (refused.length ? refused.join(' / ') : 'none'));
say(stuck.length ? 'FAIL · ' + stuck.length + ' · ' + stuck.join(' · ') : 'ok · after-begin-walk');
process.exit(stuck.length || errors.length || refused.length ? 1 : 0);
