// repro-begin — does a member's open page learn of 🍾 by its own poll?
// A dev server at BASE; founder + two members; one member's page open headless
// through Begin; the rail dumped after three polls, then again after a reload.
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
  if (!r.ok) throw new Error(`${who} · ${name} refused (${r.status}): ${JSON.stringify(j)}`);
  return j.result ?? j;
};

// found
const created = await (await post('/api/docs', { title: `Repro ${run}`, email: `founder-${run}@example.org`, isMember: true })).json();
SLUG = created.slug;
jars.set('founder', await followLink(created.devLink));
await cmd('founder', 'confirm-starting-text', { text: ['# Repro', 'One clause about the kitchen rota.', 'Another clause about guests.'].join('\n') });
await cmd('founder', 'set-convenor-membership', { isMember: true });
const m1 = `m1-${run}@example.org`, m2 = `m2-${run}@example.org`;
await cmd('founder', 'invite', { email: m1 });
await cmd('founder', 'invite', { email: m2 });
const m1Invite = await outboxLink(m1);
jars.set('m2', await followLink(await outboxLink(m2)));
say(`founded ${SLUG}, invited m1 and m2`);

// m1 arrives in the browser, by their invitation link
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const logs = [];
page.on('console', (m) => { if (m.type() !== 'log') logs.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`PAGEERROR ${e.message}`));
await landOn(page, m1Invite, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
say(`m1's page at ${page.url()}`);
// m1's API seat, by a fresh login link (dev hands it back)
const login = await (await post(`/api/d/${SLUG}/login`, { email: m1 })).json();
jars.set('m1', await followLink(login.devLink));

// the constitution: everything held but 🌍, which the three answer
for (const [setting, value] of Object.entries({
  ending: { endsAtMs: Date.now() + 30 * 24 * 3600_000 }, authorship: { rung: 'sealedElective' },
  judgments: { rung: 'after' }, applications: { apply: true }, admission: { price: 'proposal' },
  removal: { price: 'consent' }, lapse: { afterMs: null }, machines: { enabled: false, budget: 0 },
  pace: { shape: 'fixed' }, bar: { pct: 60 }, quorum: { form: 'share', n: 50 },
  rate: { grant: 5, cap: 8, dripMinutes: 10 },
})) await cmd('founder', 'set-setting', { setting, value });
await cmd('founder', 'delegate', { setting: 'chamber' });
for (const who of ['founder', 'm1', 'm2']) await cmd(who, 'answer', { setting: 'chamber', value: { rung: 'link' } });
await sleep(9000); // two polls so m1's page holds the settled constitution

const dump = async (label) => {
  const out = await page.evaluate(() => ({
    rail: [...document.querySelectorAll('.qitem')].map((el) => el.dataset.q + ' · ' + el.textContent.trim().replace(/\s+/g, ' ').slice(0, 50)),
    paras: [...document.querySelectorAll('[data-para]')].map((el) => el.dataset.para).join(' '),
    wallet: !!document.querySelector('#wallet'), ridetab: !!document.querySelector('#ridetab'),
  }));
  say(`${label}: rail = [${out.rail.join(' | ')}]`);
  say(`${label}: paras = ${out.paras} · wallet=${out.wallet} ridetab=${out.ridetab}`);
};
await dump('before 🍾');

// 🍾, every power laid down
const health = await (await fetch(`${BASE}/healthz`)).json();
const keys = [...health.catalogue.filter((id) => !['displayName', 'picture', 'startingText'].includes(id)), 'startingText', 'door:invite', 'door:remove'];
await cmd('founder', 'begin', { laidDown: keys.flatMap((setting) => [{ setting, power: 'unilateral' }, { setting, power: 'assent' }]) });
say('🍾 pressed');
for (const wait of [5000, 5000, 5000]) { await sleep(wait); await dump(`after 🍾 +${wait / 1000}s more`); }

// OK every news card on the polled page, one press each, and look for the gates
for (let round = 0; round < 12; round++) {
  const k = await page.evaluate(() => {
    const el = [...document.querySelectorAll(".qitem")].map((e) => e.dataset.q)
      .find((q) => !/^(myname|mypic|ans-|grant-|canpropose|canjudge|mine:)/.test(q));
    return k = el || null;
  }).catch(() => null);
  if (!k) break;
  const pressed = await page.evaluate((k) => {
    const el = document.querySelector("#rail [data-card=\"" + k + "\"]"); if (!el) return "no entry";
    el.click();
    return new Promise((res) => setTimeout(() => {
      const b = document.querySelector(".setupcard [data-ok]");
      if (!b) return res("no OK on " + k); if (b.disabled) return res("OK disabled on " + k);
      b.click(); res("ok " + k);
    }, 500));
  }, k);
  say("press: " + pressed);
  await sleep(1200);
}
await sleep(5000);
await dump("after every OK, +5s");
const st = (await (await fetch(BASE + "/api/d/" + SLUG + "/view", { headers: { cookie: jars.get("m1") } })).json());
const set = (st.view && st.view.settings) || st.settings || null;
say("m1 view: " + JSON.stringify(set ? Object.fromEntries(["applications","rate","quorum","admission","chamber"].map((k) => [k, set[k] && { holder: set[k].holder, collecting: set[k].collecting, settledBy: set[k].settledBy, powers: set[k].powers }])) : Object.keys(st.view || st)));
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
await dump('after reload');
if (logs.length) console.log('page console:\n  ' + logs.slice(0, 20).join('\n  '));
await browser.close();
