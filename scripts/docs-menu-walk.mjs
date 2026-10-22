#!/usr/bin/env node
/**
 * docs-menu-walk — **the 🪶 documents menu** (issue #227, Q1603, Ed
 * 2026-10-22; SURFACE's topbar rule).
 *
 *   npm run docs-menu-walk -- [http://127.0.0.1:8181] [--shots=<dir>]
 *
 * One address, Eve, on a dev server:
 *   A — Eve founds it, a member;
 *   B — Fay founds it and invites Eve, who follows the link;
 *   C — the same, and then Eve resigns.
 * A browser holding all three of Eve's cookies is asserted:
 *   1. the 🪶 opens the menu, and it lists exactly A and B, each with a face,
 *      and neither marked *Closed*;
 *   2. **+ New document** goes to `/`;
 *   3. a stranger's browser sees only the two foot rows;
 *   4. *Email me a link to each* answers the same words, and the same wire
 *      body, for Eve's address and for an address on nothing;
 *   5. the outbox holds one mail to Eve with a login link for A and one for
 *      B, and none for C; and none at all to the unknown address;
 *   6. at 390 the menu stands inside the window and the topbar's height does
 *      not move when it opens.
 *
 * Needs a dev server (no RESEND_API_KEY: the outbox is read for the links).
 * Red on the page before #227 at 1 (the 🪶 opened no menu). Joins the sprint
 * tier from its first day (Q1547). Exit 0 when every check passes, 1 on a
 * defect, 2 on a set-up that never got there.
 */
import { chromium } from 'playwright';
import { post as postTo, followLink, outbox, sleep, say, arg } from './lib/walk.mjs';
import { assertServerBuild, walkBase } from './lib/assert-server.mjs';

const BASE = walkBase(process.argv, process.env, 'http://127.0.0.1:8181');
const SHOTS = arg('shots');
const die = (m) => { say(`SET-UP · ${m}`); process.exit(2); };
await assertServerBuild(BASE, 'docs-menu-walk');
const health = await (await fetch(`${BASE}/healthz`)).json();
if (health.devMail !== true) die(`${BASE} is not a dev server`);
const post = (path, body, cookie) => postTo(BASE, path, body, cookie);

const fails = [];
const check = (what, ok, detail = '') => {
  say(`${ok ? 'PASS · ' : 'FAIL · '}${what}${detail ? ` · ${detail}` : ''}`);
  if (!ok) fails.push(what);
};

const run = Date.now().toString(36);
const EVE = `dm-eve-${run}@example.org`;
const FAY = `dm-fay-${run}@example.org`;
const NOBODY = `dm-nobody-${run}@example.org`;

/** a document founded by `email`, a member; answers its slug, title and the founder's cookie */
async function found(tag, email) {
  const title = `Menu ${tag} ${run}`;
  const created = await (await post('/api/docs', { title, email, isMember: true })).json();
  if (!created.ok || !created.devLink) die(`${tag}: creation refused: ${JSON.stringify(created)}`);
  return { slug: created.slug, title, cookie: (await followLink(created.devLink)).cookie };
}
const cmdOn = async (slug, cookie, name, args = {}) => {
  const r = await post(`/api/d/${slug}/cmd`, { cmd: name, args }, cookie);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) die(`${slug} ${name}: ${r.status} ${JSON.stringify(j).slice(0, 200)}`);
  return j;
};
/** Fay's document, begun, with Eve invited and arrived: answers Eve's cookie */
async function roomWithEve(tag) {
  const d = await found(tag, FAY);
  await cmdOn(d.slug, d.cookie, 'confirm-starting-text', { text: `# ${d.title}\n\nThe club meets monthly.` });
  for (const [setting, value] of Object.entries({
    rate: { grant: 5, cap: 8, dripMinutes: 60 }, pace: { shape: 'fixed' }, quorum: { form: 'count', n: 2 },
    authorship: { rung: 'sealed' }, judgments: { rung: 'never' }, applications: { apply: false },
    admission: { price: 'pen' }, removal: { price: 'proposal' }, machines: { enabled: false, budget: 0 },
    lapse: { afterMs: 24 * 3_600_000 }, ending: { endsAtMs: Date.now() + 30 * 86_400_000 }, bar: { pct: 50 },
    chamber: { rung: 'link' },
  })) {
    await (await post(`/api/d/${d.slug}/cmd`, { cmd: 'reclaim', args: { setting } }, d.cookie)).text();
    await cmdOn(d.slug, d.cookie, 'set-setting', { setting, value });
  }
  await cmdOn(d.slug, d.cookie, 'invite', { email: EVE });
  await cmdOn(d.slug, d.cookie, 'begin', {});
  const m = (await outbox(BASE)).find((x) => x.to === EVE && x.link && x.link.includes(`d=${d.slug}`));
  if (!m) die(`${tag}: no invitation for Eve in the dev outbox`);
  const eve = (await followLink(m.link)).cookie;
  if (!eve) die(`${tag}: Eve's invitation seated nobody`);
  return { ...d, eve };
}

const A = await found('A', EVE);
await cmdOn(A.slug, A.cookie, 'set-identity', { name: 'Eve' });
const B = await roomWithEve('B');
const C = await roomWithEve('C');
await cmdOn(C.slug, C.eve, 'resign', {});
say(`rooms · A /d/${A.slug} · B /d/${B.slug} · C /d/${C.slug} (Eve resigned)`);

/* ---- the wire: what the menu is served ------------------------------------ */
const jar = [A.cookie, B.eve, C.eve].join('; ');
const served = (await (await fetch(`${BASE}/api/mine`, { headers: { cookie: jar } })).json()).docs || [];
check('served: exactly A and B', JSON.stringify(served.map((d) => d.slug).sort()) === JSON.stringify([A.slug, B.slug].sort()),
  served.map((d) => d.slug).join(', '));
check('served: nothing but what a row draws',
  served.every((d) => JSON.stringify(Object.keys(d).sort()) === JSON.stringify(['closed', 'name', 'picture', 'signedMs', 'slug', 'title'])));
check('served: a stranger, nothing', ((await (await fetch(`${BASE}/api/mine`)).json()).docs || []).length === 0);

/* ---- the pages ------------------------------------------------------------- */
const browser = await chromium.launch();
const errors = [];
async function seat(cookies, path, label, viewport = { width: 1600, height: 1000 }) {
  const ctx = await browser.newContext({ viewport, ...(viewport.width < 900 ? { isMobile: true, hasTouch: true } : {}) });
  for (const c of cookies) {
    const [name, ...rest] = c.split('=');
    await ctx.addCookies([{ name, value: rest.join('='), url: BASE }]);
  }
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${label}: ${e.message}`));
  await page.goto(`${BASE}${path}`);
  await page.waitForSelector('#quill', { timeout: 20_000 });
  await sleep(1200);
  return page;
}
/** press the 🪶 and read the menu once its rows have come */
const openMenu = async (page) => {
  await page.click('#quill');
  await page.waitForSelector('#docsmenu', { timeout: 5000 }).catch(() => {});
  await sleep(700);
  return page.evaluate(() => {
    const m = document.getElementById('docsmenu');
    if (!m) return null;
    return {
      docs: [...m.querySelectorAll('.dmdoc')].map((a) => ({
        href: a.getAttribute('href'), title: (a.querySelector('.dmtitle') || {}).textContent,
        face: !!a.querySelector('.av, .emojiface'), closed: !!a.querySelector('.dmclosed') })),
      foot: [...m.querySelectorAll('.dmnew, .dmmail')].map((a) => a.textContent),
      expanded: document.getElementById('quill').getAttribute('aria-expanded'),
    };
  });
};

const pe = await seat([A.cookie, B.eve, C.eve], `/d/${B.slug}`, 'Eve');
const menu = await openMenu(pe);
check('1 · the 🪶 opens the menu', menu !== null && menu.expanded === 'true');
if (menu) {
  const titles = menu.docs.map((d) => d.title).sort();
  check('1 · it lists exactly A and B', JSON.stringify(titles) === JSON.stringify([A.title, B.title].sort()), titles.join(' / '));
  check('1 · each row links to its document',
    menu.docs.every((d) => d.href === `/d/${A.slug}` || d.href === `/d/${B.slug}`));
  check('1 · each row wears a face', menu.docs.length > 0 && menu.docs.every((d) => d.face));
  check('1 · neither is marked Closed', menu.docs.every((d) => !d.closed));
  check('1 · the two foot rows follow', JSON.stringify(menu.foot) === JSON.stringify(['+ New document', 'Email me a link to each']), menu.foot.join(' / '));
}
if (SHOTS) await pe.screenshot({ path: `${SHOTS}/docs-menu-1600.png` });
await Promise.all([pe.waitForURL((u) => new URL(u).pathname === '/', { timeout: 15_000 }).catch(() => {}), pe.click('#docsmenu .dmnew')]);
check('2 · + New document goes to /', new URL(pe.url()).pathname === '/', pe.url());

const ps = await seat([], `/d/${B.slug}`, 'stranger');
const sm = await openMenu(ps);
check('3 · a stranger sees only the two foot rows', sm !== null && sm.docs.length === 0 && sm.foot.length === 2,
  sm ? `${sm.docs.length} docs, ${sm.foot.length} foot rows` : 'no menu');

/* ---- the mail ------------------------------------------------------------- */
const ask = async (page, email) => {
  const wire = page.waitForResponse((r) => r.url().endsWith('/api/mine/links'), { timeout: 10_000 }).catch(() => null);
  await page.click('#docsmenu .dmmail');
  await page.fill('#docsmenu .dminput', email);
  await page.click('#docsmenu .dmsend');
  // the status off the page's own request; its body is read on the wire
  // below, since Playwright's `text()` can wait for ever on a body it has
  const res = await wire;
  await sleep(400);
  const said = await page.evaluate(() => (document.querySelector('#docsmenu .dmsent') || {}).textContent || '');
  return { said, status: res ? res.status() : 0 };
};
const known = await ask(ps, EVE);
if (SHOTS) await ps.screenshot({ path: `${SHOTS}/docs-menu-sent-1600.png` });
await ps.keyboard.press('Escape');
await openMenu(ps);
const unknown = await ask(ps, NOBODY);
check('4 · the answer is said', known.said.length > 0 && known.status === 200, `${known.status} · ${known.said}`);
check('4 · a known and an unknown address are answered alike on the page',
  known.said === unknown.said && known.status === unknown.status, `${unknown.status} · ${unknown.said}`);

let mails = [];
for (let i = 0; i < 20; i += 1) {
  mails = (await outbox(BASE)).filter((m) => m.to === EVE && /Log in to/.test(m.subject || ''));
  if (mails.length) break;
  await sleep(250);
}
check('5 · one mail to Eve', mails.length === 1, `${mails.length}`);
const text = mails[0] ? String(mails[0].text || '') : '';
const links = text.match(/http:[A-Za-z0-9_?=/:.&-]+/g) || [];
check('5 · a link for A and for B, none for C',
  links.length === 2 && links.some((l) => l.includes(`d=${A.slug}`)) && links.some((l) => l.includes(`d=${B.slug}`)) &&
  !links.some((l) => l.includes(`d=${C.slug}`)), links.join(' '));
check('5 · nothing to the unknown address', !(await outbox(BASE)).some((m) => m.to === NOBODY));
const viaMail = links.find((l) => l.includes(`d=${A.slug}`));
if (viaMail) {
  const f = await followLink(viaMail);
  check('5 · the link signs in', f.status === 302 && f.cookie.startsWith('draft_session_') && f.location === `/d/${A.slug}`, `${f.status} ${f.location}`);
}

// and on the wire, byte for byte: Eve's address a second time, and another on nothing
const wireOf = async (email) => { const r = await post('/api/mine/links', { email }); return `${r.status} ${await r.text()}`; };
const [wk, wu] = [await wireOf(EVE), await wireOf(`dm-nobody2-${run}@example.org`)];
check('4 · …and on the wire', wk === wu, `${wk} | ${wu}`);

/* ---- 390 ------------------------------------------------------------------ */
const pn = await seat([A.cookie, B.eve], `/d/${A.slug}`, 'Eve 390', { width: 390, height: 844 });
const barBefore = await pn.evaluate(() => document.querySelector('.navbar').getBoundingClientRect().height);
const nm = await openMenu(pn);
const geo = await pn.evaluate(() => {
  const r = document.getElementById('docsmenu')?.getBoundingClientRect();
  return r ? { left: r.left, right: r.right, bottom: r.bottom, vw: window.innerWidth, vh: window.innerHeight,
    bar: document.querySelector('.navbar').getBoundingClientRect().height,
    scrollW: document.documentElement.scrollWidth } : null;
});
check('6 · 390: the menu opens with both documents', nm !== null && nm.docs.length === 2);
check('6 · 390: it stands inside the window',
  geo !== null && geo.left >= 0 && geo.right <= geo.vw && geo.bottom <= geo.vh && geo.scrollW <= geo.vw, JSON.stringify(geo));
check('6 · 390: the topbar keeps its height', geo !== null && Math.abs(geo.bar - barBefore) < 0.5, `${barBefore} → ${geo && geo.bar}`);
if (SHOTS) await pn.screenshot({ path: `${SHOTS}/docs-menu-390.png` });

check('no page error', errors.length === 0, errors.join(' | '));
await browser.close();
say(fails.length ? `docs-menu-walk: ${fails.length} FAILED` : 'docs-menu-walk: every check passed');
process.exit(fails.length ? 1 : 0);
