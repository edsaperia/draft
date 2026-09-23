#!/usr/bin/env node
/**
 * crown-rail — **a change the membership carried, parked on the Founder's 🛡️, is the
 * Founder's to answer and everybody else's to wait on** (issue #32; built as Q1475,
 * 2026-09-19, 77766042; this is its guard for the parts no walk reached)
 *
 *   PORT=8232 DRAFT_BASE_URL=http://127.0.0.1:8232 DRAFT_DATA_DIR=<fresh> npm run server
 *   node scripts/repro/crown-rail.mjs http://127.0.0.1:8232
 *
 * Three documents founded over the wire, 🍾 keeping every power but the Text (the default):
 *
 *   admission  somebody applies at 🪪 ✏️; the founder and m1 carry it; ✉️'s 🛡️ parks it. The
 *              founder's `adm:` entry asks and its card is the 👑 pair (Refuse / Accept);
 *              m2's waits, has nothing to press, says *Awaiting assent from the Founder*
 *              and never *you have voted on it* (m2 never voted).
 *   member     m1 puts a 🏛️ motion on 💤; m2 and the founder accept; it parks. The
 *              founder's `mo:` entry asks.
 *   clerk      the same with a clerk founder (🎩 no), who answers nothing and holds the 🛡️:
 *              their `mo:` entry asks too — before Q1475 a clerk had no entry at all.
 *
 * Exit 0 only if all pass; 1 on a failure. Red on the pre-Q1475 page at all three.
 */
import { chromium } from 'playwright';
import { post, followLink, outbox, linkIn, sleep, landOn } from '../lib/walk.mjs';

const B = process.argv[2] || 'http://127.0.0.1:8232';
const say = (s) => console.log(s);
const fails = [];
const check = (name, ok, detail) => {
  say((ok ? 'PASS · ' : 'FAIL · ') + name + (ok ? '' : ' · ' + detail));
  if (!ok) fails.push(name);
};
const cmd = async (slug, cookie, name, args = {}) => {
  const r = await post(B, `/api/d/${slug}/cmd`, { cmd: name, args }, cookie);
  return { status: r.status, body: await r.json().catch(() => null) };
};
const view = async (slug, cookie) => (await fetch(`${B}/api/d/${slug}/view`, { headers: { cookie } })).json();
const mailTo = async (to) => {
  for (let i = 0; i < 30; i++) {
    const m = (await outbox(B)).find((x) => x.to === to && linkIn(x));
    if (m) return m;
    await sleep(300);
  }
  throw new Error('no mail to ' + to);
};
async function found({ clerk = false } = {}) {
  const u = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const c = await (await post(B, '/api/docs', { title: 'Crown ' + u, email: `founder-${u}@example.com` })).json();
  const jars = { founder: (await followLink(c.devLink)).cookie };
  await cmd(c.slug, jars.founder, 'confirm-starting-text', { text: '# Charter\nThe club meets weekly.' });
  await cmd(c.slug, jars.founder, 'set-convenor-membership', { isMember: !clerk });
  const values = { rate: { grant: 3, cap: 3, dripMinutes: 60 }, quorum: { form: 'count', n: 1 }, authorship: { rung: 'sealed' },
    judgments: { rung: 'after' }, applications: { apply: true }, admission: { price: 'proposal' }, machines: { enabled: false, budget: 0 },
    lapse: { afterMs: null }, ending: { endsAtMs: Date.now() + 7 * 864e5 }, chamber: { rung: 'link' }, removal: { price: 'proposal' } };
  for (const [setting, value] of Object.entries(values)) await cmd(c.slug, jars.founder, 'set-setting', { setting, value });
  for (const w of ['m1', 'm2']) {
    const e = `${w}-${u}@example.com`;
    await cmd(c.slug, jars.founder, 'invite', { email: e });
    jars[w] = (await followLink(linkIn(await mailTo(e)))).cookie;
  }
  await cmd(c.slug, jars.founder, 'begin', {});
  return { slug: c.slug, jars, u };
}

const browser = await chromium.launch();
const seat = async (slug, cookie) => {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1100 } });
  const [n, ...v] = cookie.split('='); await ctx.addCookies([{ name: n, value: v.join('='), url: B }]);
  const page = await ctx.newPage();
  await landOn(page, `${B}/d/${slug}`); await sleep(3500);
  return page;
};
const entry = (page, prefix) => page.evaluate((p) => {
  const li = [...document.querySelectorAll('#rail li')].find((x) => (x.dataset.q || '').startsWith(p));
  const b = li && li.querySelector('button');
  return b ? { q: li.dataset.q, st: [...b.classList].find((c) => c.startsWith('st-')) || null } : null;
}, prefix);
const cardOf = async (page, q) => {
  await page.evaluate((k) => { const b = document.querySelector(`#rail [data-card="${k}"]`); if (b) b.click(); }, q);
  await sleep(1200);
  return page.evaluate(() => {
    const c = document.querySelector('.setupcard');
    return c ? { crown: [...c.querySelectorAll('[data-crownq]')].map((b) => b.dataset.crownq),
      live: c.querySelectorAll('.lanepick:not([disabled]), [data-confirm]:not([disabled])').length,
      text: c.innerText.replace(/\s+/g, ' ') } : null;
  });
};

// ---- admission ------------------------------------------------------------------
{
  const d = await found();
  const e = `rowan-${d.u}@example.com`;
  await post(B, `/api/d/${d.slug}/apply`, { email: e }); await sleep(300);
  const app = (await followLink(linkIn(await mailTo(e)))).cookie;
  await cmd(d.slug, app, 'submit-application', { name: 'Rowan Vale', words: 'hello' });
  for (const w of ['m1', 'founder']) {
    const rc = ((await view(d.slug, d.jars[w])).raceCards || []).find((r) => r.a.setting && String(r.a.setting.settingId).startsWith('admit:'));
    if (rc) await cmd(d.slug, d.jars[w], 'judge-race', { a: rc.a.id, b: rc.b.id, outcome: 'a' });
  }
  const mm = ((await view(d.slug, d.jars.founder)).view.motions || []).find((m) => m.payload.kind === 'admit');
  if (!mm || mm.status !== 'awaiting-crown') say('SET-UP · the admission did not park: ' + JSON.stringify(mm && mm.status));
  const pf = await seat(d.slug, d.jars.founder);
  const ef = await entry(pf, 'adm:');
  const cf = ef ? await cardOf(pf, ef.q) : null;
  check('admission · the founder is asked, and the card is the 👑 pair',
    !!ef && ef.st === 'st-ask' && !!cf && cf.crown.join('|') === 'reject|accept', JSON.stringify({ ef, crown: cf && cf.crown }));
  const pm = await seat(d.slug, d.jars.m2);
  const em = await entry(pm, 'adm:');
  const cm = em ? await cardOf(pm, em.q) : null;
  check('admission · m2 waits on the Founder, nothing to press, not told they voted',
    !!em && em.st === 'st-wait' && !!cm && cm.crown.length === 0 && cm.live === 0 &&
      /Awaiting assent from the Founder/.test(cm.text) && !/you have voted on it/.test(cm.text),
    JSON.stringify({ em, cm: cm && { crown: cm.crown, live: cm.live, text: cm.text.slice(0, 200) } }));
  await pf.context().close(); await pm.context().close();
}

// ---- a 🏛️ motion on 💤, member and clerk founder ---------------------------------
for (const clerk of [false, true]) {
  const name = clerk ? 'clerk' : 'member';
  const d = await found({ clerk });
  const o = await cmd(d.slug, d.jars.m1, 'open-motion', { payload: { kind: 'set', setting: 'lapse', value: { afterMs: 3 * 864e5 } }, why: 'a spell' });
  const id = o.body && o.body.result;
  for (const w of clerk ? ['m2'] : ['m2', 'founder']) await cmd(d.slug, d.jars[w], 'answer-motion', { motion: id, answer: 'accept' });
  const mm = ((await view(d.slug, d.jars.founder)).view.motions || []).find((m) => m.id === id);
  if (!mm || mm.status !== 'awaiting-crown') say('SET-UP · the motion did not park: ' + JSON.stringify(mm && mm.status));
  const pf = await seat(d.slug, d.jars.founder);
  const ef = await entry(pf, 'mo:');
  const cf = ef ? await cardOf(pf, ef.q) : null;
  check(name + ' · the founder\'s entry for a parked motion asks, and its card is the 👑 pair',
    !!ef && ef.st === 'st-ask' && !!cf && cf.crown.join('|') === 'reject|accept', JSON.stringify({ ef, crown: cf && cf.crown }));
  await pf.context().close();
}

await browser.close();
say(fails.length ? `FAILED: ${fails.join(' · ')}` : 'all four cases pass');
process.exit(fails.length ? 1 : 0);
