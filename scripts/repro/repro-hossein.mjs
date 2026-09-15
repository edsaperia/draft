// repro-hossein — Hossein's exact sequence on one long-lived page: invited and
// arrived before the founder answered 🎩, watched the founding settle by poll,
// answered the three blind questions on the page, then 🍾 fired. What did the
// page show after 🍾, and what does its ✉️ tab open?
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://127.0.0.1:8181';
const run = Date.now().toString(36);
const clock = () => new Date().toTimeString().slice(0, 8);
const say = (s) => console.log(`[${clock()}] ${s}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const post = (path, body, cookie) => fetch(BASE + path, {
  method: 'POST', headers: { 'content-type': 'application/json', origin: BASE, ...(cookie ? { cookie } : {}) },
  body: JSON.stringify(body) });
const followLink = async (link) => {
  const u = new URL(link);
  await fetch(u.origin + u.pathname + u.search);
  const r = await fetch(u.origin + u.pathname, { method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', origin: u.origin },
    body: new URLSearchParams({ token: u.searchParams.get('token') ?? '' }).toString(), redirect: 'manual' });
  return (r.headers.get('set-cookie') ?? '').split(';')[0];
};
const outboxLink = async (to) => {
  for (let i = 0; i < 20; i++) {
    const { mails } = await (await fetch(`${BASE}/api/dev/outbox`)).json();
    const m = mails.find((x) => x.to === to && x.link);
    if (m) return m.link;
    await sleep(300);
  }
  throw new Error(`no mail to ${to}`);
};
const jars = new Map();
let SLUG;
const cmd = async (who, name, args = {}) => {
  const r = await post(`/api/d/${SLUG}/cmd`, { cmd: name, args }, jars.get(who));
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { say(`  ✗ ${who} · ${name} refused (${r.status}): ${JSON.stringify(j)}`); return null; }
  return j.result ?? j;
};

// the birth, exactly as found-lab did it: no 🎩 press
const created = await (await post('/api/docs', { title: `Hossein ${run}`, email: `founder-${run}@example.org`, isMember: true })).json();
SLUG = created.slug;
jars.set('founder', await followLink(created.devLink));
await cmd('founder', 'confirm-starting-text', { text: ['# Hossein', 'One clause about the kitchen rota.', 'Another clause about guests.', 'A third clause about the noticeboard.'].join('\n') });
const m1 = `m1-${run}@example.org`, m2 = `m2-${run}@example.org`;
await cmd('founder', 'invite', { email: m1 });
await cmd('founder', 'invite', { email: m2 });
jars.set('m2', await followLink(await outboxLink(m2)));
for (const [setting, value] of Object.entries({
  ending: { endsAtMs: Date.now() + 30 * 24 * 3600_000 }, authorship: { rung: 'sealedElective' },
  judgments: { rung: 'after' }, applications: { apply: true }, admission: { price: 'proposal' },
  removal: { price: 'consent' }, lapse: { afterMs: null }, machines: { enabled: false, budget: 0 },
  pace: { shape: 'fixed' }, bar: { pct: 60 },
})) await cmd('founder', 'set-setting', { setting, value });
for (const setting of ['quorum', 'rate', 'chamber']) await cmd('founder', 'delegate', { setting });
say(`founded ${SLUG}; 🎩 unanswered, three questions delegated`);

// m1 arrives on the page and stays there
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const logs = [];
page.on('console', (m) => { if (m.type() !== 'log') logs.push(`${m.type()}: ${m.text().slice(0, 200)}`); });
page.on('pageerror', (e) => logs.push(`PAGEERROR ${e.message}`));
const sent = [];
page.on('response', async (r) => { if (/\/cmd$/.test(r.url()) && r.request().method() === 'POST') sent.push(r.status() + ' ' + (r.request().postData() || '').slice(0, 90)); });
await page.goto(await outboxLink(m1), { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const dump = async (label) => {
  const out = await page.evaluate(() => ({
    rail: [...document.querySelectorAll('.qitem')].map((el) => el.dataset.q),
    paras: [...document.querySelectorAll('[data-para]')].map((el) => el.dataset.para).join(' '),
    open: document.querySelector('.setupcard')?.dataset.setupcard ?? null,
  }));
  say(`${label}: rail=[${out.rail.join(' ')}] · paras: ${out.paras} · open=${out.open}`);
};
await dump('m1 arrived');

// the founder's 🎩 lands later, as it did in the room
await sleep(5000);
await cmd('founder', 'set-convenor-membership', { isMember: true });
say('founder answered 🎩');
await sleep(9000);
await dump('two polls later');

// m1 answers the three questions on the page: first rung, commit
const answerOnPage = async (k) => {
  const r = await page.evaluate(async (k) => {
    const entry = document.querySelector('#rail [data-card="' + k + '"]'); if (!entry) return 'no entry ' + k;
    entry.click(); await new Promise((s) => setTimeout(s, 700));
    const card = document.querySelector('.setupcard'); if (!card) return 'no card for ' + k;
    const rung = card.querySelector('.lanepick'); if (rung) { rung.click(); await new Promise((s) => setTimeout(s, 400)); }
    const fields = [...document.querySelector('.setupcard').querySelectorAll('input:not([type=radio]):not([type=checkbox])')];
    for (const f of fields) { f.focus(); f.value = '10'; f.dispatchEvent(new Event('input', { bubbles: true })); f.dispatchEvent(new Event('change', { bubbles: true })); }
    await new Promise((s) => setTimeout(s, 400));
    const ctl = [...document.querySelector('.setupcard').querySelectorAll('input, button, .lanepick')].map((e) => e.tagName.toLowerCase() + (e.type ? ':' + e.type : '') + (e.disabled ? '(disabled)' : '')).join(',');
    const btns = [...document.querySelector('.setupcard').querySelectorAll('button')].filter((b) => !b.disabled);
    const b = btns[btns.length - 1]; if (!b) return 'nothing enabled on ' + k;
    b.click();
    return 'answered ' + k + ' by "' + (b.title || b.textContent.trim()) + '" · controls ' + ctl;
  }, k);
  say('  ' + r);
  await sleep(1500);
};
for (const k of ['ans-chamber', 'ans-rate', 'ans-quorum']) await answerOnPage(k);
await sleep(5000);
await dump('m1 answered on the page');
// the founder and m2 answer by API
for (const who of ['founder', 'm2']) {
  await cmd(who, 'answer', { setting: 'chamber', value: { rung: 'link' } });
  await cmd(who, 'answer', { setting: 'rate', value: { grant: 5, cap: 8, dripMinutes: 10 } });
  await cmd(who, 'answer', { setting: 'quorum', value: { form: 'share', n: 50 } });
}
await sleep(6000);
await dump('everyone answered');

// 🍾
const health = await (await fetch(`${BASE}/healthz`)).json();
const keys = [...health.catalogue.filter((id) => !['displayName', 'picture', 'startingText'].includes(id)), 'startingText', 'door:invite', 'door:remove'];
const begun = await cmd('founder', 'begin', { laidDown: keys.flatMap((setting) => [{ setting, power: 'unilateral' }, { setting, power: 'assent' }]) });
say('🍾 ' + (begun ? 'pressed' : 'REFUSED'));
for (const n of [1, 2, 3]) { await sleep(5000); await dump(`after 🍾, poll ${n}`); }
const f = await page.evaluate(() => { const f = window.__founding(); return { constituted: f.constituted, viewer: f.viewer, viewerIsMember: f.viewerIsMember, roomExists: f.roomExists, otherTasksLeft: f.otherTasksLeft, ansDue: f.ansDue, order: f.order, answers: f.answers, owedUnservable: f.owedUnservable }; });
say("readout after 🍾: " + JSON.stringify(f).replace(/","/g, "\" | \""));

// press OK on whatever news is in the rail, then look for the gates and the ✉️ card
for (let round = 0; round < 12; round++) {
  const k = await page.evaluate(() => [...document.querySelectorAll('.qitem')].map((e) => e.dataset.q)
    .find((q) => !/^(myname|mypic|ans-|grant-|canpropose|canjudge|mine:)/.test(q)) || null);
  if (!k) break;
  const r = await page.evaluate(async (k) => {
    document.querySelector('#rail [data-card="' + k + '"]')?.click(); await new Promise((s) => setTimeout(s, 500));
    const b = document.querySelector('.setupcard [data-ok]'); if (!b) return 'no OK on ' + k; if (b.disabled) return 'OK disabled on ' + k;
    b.click(); return 'ok ' + k;
  }, k);
  say('  ' + r);
  await sleep(1200);
}
await sleep(5000);
await dump('after the OKs');
const inv = await page.evaluate(async () => {
  const t = document.querySelector('[data-tab="invite"]'); if (!t) return 'no ✉️ tab';
  t.click(); await new Promise((s) => setTimeout(s, 800));
  const card = document.querySelector('.setupcard'); if (!card) return '✉️ tab opened no card';
  const ctl = [...card.querySelectorAll('input, textarea, button')].map((e) => e.tagName.toLowerCase() + (e.disabled ? '(disabled)' : '') + (e.title ? '{' + e.title + '}' : ''));
  return 'card ' + card.dataset.setupcard + ' · "' + card.textContent.trim().replace(/\s+/g, ' ').slice(0, 260) + '" · ' + ctl.join(', ');
});
say('✉️: ' + inv);
say('commands the page sent: ' + JSON.stringify(sent));
if (logs.length) console.log('page console:\n  ' + logs.slice(0, 20).join('\n  '));
await browser.close();
