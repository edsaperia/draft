// repro-reapply — a member leaves a begun document and applies again from the
// door: what is the applicant's page served, and do its cards commit? Also: a
// member's ✉️ once every founder power is laid down.
import { chromium } from 'playwright';
import { landOn } from '../lib/walk.mjs';

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
  return { cookie: (r.headers.get('set-cookie') ?? '').split(';')[0], location: r.headers.get('location'), status: r.status };
};
const outboxMail = async (to, seen = new Set()) => {
  for (let i = 0; i < 20; i++) {
    const { mails } = await (await fetch(`${BASE}/api/dev/outbox`)).json();
    const m = mails.find((x) => x.to === to && x.link && !seen.has(x.link));
    if (m) return m;
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

const created = await (await post('/api/docs', { title: `Reapply ${run}`, email: `founder-${run}@example.org`, isMember: true })).json();
SLUG = created.slug;
jars.set('founder', (await followLink(created.devLink)).cookie);
await cmd('founder', 'confirm-starting-text', { text: ['# Reapply', 'One clause about the kitchen rota.', 'Another clause about guests.'].join('\n') });
await cmd('founder', 'set-convenor-membership', { isMember: true });
const m1 = `m1-${run}@example.org`, m2 = `m2-${run}@example.org`;
await cmd('founder', 'invite', { email: m1 });
await cmd('founder', 'invite', { email: m2 });
const seen = new Set();
const m1Mail = await outboxMail(m1); seen.add(m1Mail.link);
const m2Mail = await outboxMail(m2); seen.add(m2Mail.link);
jars.set('m1', (await followLink(m1Mail.link)).cookie);
jars.set('m2', (await followLink(m2Mail.link)).cookie);
await cmd('m2', 'set-identity', { name: 'Hossein Test', picture: 'e🦊' });
for (const [setting, value] of Object.entries({
  ending: { endsAtMs: Date.now() + 30 * 24 * 3600_000 }, authorship: { rung: 'sealedElective' },
  judgments: { rung: 'after' }, applications: { apply: true }, admission: { price: 'proposal' },
  removal: { price: 'consent' }, lapse: { afterMs: null }, machines: { enabled: false, budget: 0 },
  pace: { shape: 'fixed' }, bar: { pct: 60 }, quorum: { form: 'share', n: 50 },
  rate: { grant: 5, cap: 8, dripMinutes: 10 }, chamber: { rung: 'link' },
})) await cmd('founder', 'set-setting', { setting, value });
const health = await (await fetch(`${BASE}/healthz`)).json();
const keys = [...health.catalogue.filter((id) => !['displayName', 'picture', 'startingText'].includes(id)), 'startingText', 'door:invite', 'door:remove'];
await cmd('founder', 'begin', { laidDown: keys.flatMap((setting) => [{ setting, power: 'unilateral' }, { setting, power: 'assent' }]) });
say(`founded ${SLUG}, begun, m1 and m2 members (m2 named, with a face)`);

// m2 leaves, then knocks at the door with the same address
await cmd('m2', 'resign', {});
say('m2 resigned');
const ap = await post(`/api/d/${SLUG}/apply`, { email: m2 });
say(`apply -> ${ap.status}`);
const apMail = await outboxMail(m2, seen);
say(`the door mailed m2: "${apMail.subject}"`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const logs = [];
page.on('console', (m) => { if (m.type() !== 'log') logs.push(`${m.type()}: ${m.text().slice(0, 200)}`); });
page.on('pageerror', (e) => logs.push(`PAGEERROR ${e.message}`));
const sent = [];
page.on('request', (r) => { if (/\/cmd$/.test(r.url()) && r.method() === 'POST') sent.push(r.postData()); });
await landOn(page, apMail.link, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
say(`m2 landed at ${page.url()}`);
const dump = async (label) => {
  const out = await page.evaluate(() => ({
    rail: [...document.querySelectorAll('.qitem')].map((el) => el.dataset.q + ' · ' + el.textContent.trim().replace(/\s+/g, ' ').slice(0, 40)),
    open: document.querySelector('.setupcard')?.dataset.setupcard ?? null,
  }));
  say(`${label}: open=${out.open} rail=[${out.rail.join(' | ')}]`);
};
await dump('applicant page');
const applicantNow = () => page.evaluate(async () => (await (await fetch(location.origin + '/api/d/' + location.pathname.split('/')[2] + '/view')).json()).applicant);
say(`applicant: ${JSON.stringify(await applicantNow())}`);

const openCard = (k) => page.evaluate(async (k) => {
  document.querySelector('#rail [data-card="' + k + '"]')?.click();
  await new Promise((s) => setTimeout(s, 600));
  return !!document.querySelector('.setupcard[data-setupcard="' + k + '"]');
}, k);
const cardSummary = () => page.evaluate(() => [...document.querySelectorAll('.setupcard *')]
  .filter((e) => (/^(BUTTON|INPUT|TEXTAREA)$/.test(e.tagName) || e.isContentEditable || e.classList.contains('pick')) && !e.classList.contains('avopt'))
  .map((e) => e.tagName.toLowerCase() + (e.className ? '.' + String(e.className).trim().replace(/\s+/g, '.') : '')
    + Object.entries(e.dataset).map(([a, b]) => '[' + a + '=' + b + ']').join('') + (e.disabled ? '(disabled)' : '')
    + ' "' + String(e.value ?? e.textContent).trim().replace(/\s+/g, ' ').slice(0, 30) + '"').join('\n      '));
const pressCommit = () => page.evaluate(async () => {
  const card = document.querySelector('.setupcard'); if (!card) return 'no card';
  const btns = [...card.querySelectorAll('button')].filter((b) => !b.disabled);
  const b = btns[btns.length - 1]; if (!b) return 'no enabled button';
  const ev = (t) => b.dispatchEvent(new PointerEvent(t, { bubbles: true, pointerId: 1, isPrimary: true }));
  ev('pointerdown'); await new Promise((s) => setTimeout(s, 1300)); ev('pointerup'); b.click();
  return 'pressed ' + (b.dataset.act || b.className) + ' "' + b.textContent.trim() + '"';
});

say('appname opened: ' + await openCard('appname')); say('    ' + await cardSummary());
await page.fill('.setupcard input[data-appname]', 'Hossein Again'); await page.keyboard.press('Tab');
await sleep(300); say('  name commit: ' + await pressCommit()); await sleep(1500);

say('apppic opened: ' + await openCard('apppic')); say('    ' + await cardSummary());
await page.evaluate(async () => { const picks = [...document.querySelectorAll('.setupcard .lanepick')]; picks[picks.length - 1]?.click(); await new Promise((s) => setTimeout(s, 500)); });
say('    after choosing the last block:\n      ' + await cardSummary());
const glyph = await page.click('.setupcard button.avopt[data-apppic="e🐼"]').then(() => 'clicked 🐼').catch((e) => 'no 🐼: ' + e.message.slice(0, 60));
say('    ' + glyph);
await sleep(300); say('  picture commit: ' + await pressCommit()); await sleep(1500);

say('apptext opened: ' + await openCard('apptext')); say('    ' + await cardSummary());
await page.click('.setupcard .editlane'); await page.keyboard.type('Let me back in.');
await sleep(300); say('  words commit: ' + await pressCommit()); await sleep(1500);

say('apply opened: ' + await openCard('apply')); say('    ' + await cardSummary());
say('  apply commit: ' + await pressCommit()); await sleep(5000);
say('commands the page sent: ' + JSON.stringify(sent));
say('applicant now: ' + JSON.stringify(await applicantNow()));
await dump('after the acts');

// a member's ✉️ once every power is laid down
const p2 = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const sent2 = [];
p2.on('request', (r) => { if (/\/cmd$/.test(r.url()) && r.method() === 'POST') sent2.push(r.postData()); });
const login = await (await post(`/api/d/${SLUG}/login`, { email: m1 })).json();
await landOn(p2, login.devLink, { waitUntil: 'networkidle' });
await p2.waitForTimeout(1500);
const inv = await p2.evaluate(async () => {
  const tab = document.querySelector('[data-tab="invite"]'); if (!tab) return 'no invite tab';
  tab.click(); await new Promise((s) => setTimeout(s, 600));
  const card = document.querySelector('.setupcard'); if (!card) return 'invite tab opened no card';
  const ta = card.querySelector('textarea'); if (!ta) return 'no address box';
  ta.focus(); ta.value = 'newbie@example.org'; ta.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise((s) => setTimeout(s, 400));
  const all = [...card.querySelectorAll('button')];
  const desc = all.map((b) => (b.dataset.act || b.className) + ' "' + b.textContent.trim() + '"' + (b.disabled ? '(disabled)' : '') + (b.title ? '[' + b.title + ']' : '')).join(', ');
  const b = all.filter((x) => !x.disabled).pop(); if (!b) return 'after typing: ' + desc + ' - nothing enabled';
  const ev = (t) => b.dispatchEvent(new PointerEvent(t, { bubbles: true, pointerId: 1, isPrimary: true }));
  ev('pointerdown'); await new Promise((s) => setTimeout(s, 1300)); ev('pointerup'); b.click();
  await new Promise((s) => setTimeout(s, 2500));
  return 'after typing: ' + desc + ' | card now: ' + (document.querySelector('.setupcard')?.textContent.trim().replace(/\s+/g, ' ').slice(0, 200) ?? 'closed');
});
say('member invite: ' + inv);
say('  sent: ' + JSON.stringify(sent2));
if (logs.length) console.log('page console:\n  ' + logs.slice(0, 20).join('\n  '));
await browser.close();
