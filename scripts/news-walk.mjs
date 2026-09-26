#!/usr/bin/env node
/**
 * news-walk — **the four live-only news families, opened** (Q1541 stage 2;
 * design/redesign/BUILD.md stage 2's acceptance). A release batch (👑, SURFACE
 * E9), a Founder's text amendment (SURFACE E35), a mail the outbox gave up on
 * (📭, E34) and a departure (🥾, E31) exist only on a live document, so no
 * fixture walk and no card-audit run had ever opened one. This walk performs
 * the act each needs on a real dev server, seats a member who is owed all
 * four, opens each card from the rail and reads its slots — the first time
 * any instrument has seen them.
 *
 *   PORT=8193 DRAFT_BASE_URL=http://127.0.0.1:8193 DRAFT_DATA_DIR=<fresh> npm run server
 *   node scripts/news-walk.mjs http://127.0.0.1:8193 [--seed=4242] [--width=390 --height=844] [--shots=<dir>]
 *
 * The acts, as the founder's seat over the wire: ✒️ laid down on 💤 after 🍾
 * (`relinquish` on 💤, one release batch); a ✒️ amendment to the text's first line
 * (`pen-text`); an invitation to an address no seat follows, driven to its
 * attempt cap through the dev-only forced give-up; and ❌ on a member who is
 * not the seat reading. Then one member's page, and each card read for what
 * it is today — which family, whether it opens, what its row asks. A card the
 * stage has converted is read as the shell draws it (`data-kind`, one label,
 * the first line, an OK only while owed); one still on its old builder is read
 * for opening and its OK. Nothing here judges the drawing beyond that: the
 * drawing is card-audit's.
 *
 * Exit 0 when every family opens with an OK owed and the page threw nothing,
 * 1 on a defect, 2 on a set-up that never got there.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { assertServerBuild, walkBase } from './lib/assert-server.mjs';
import { say, arg, landOn, withWas, sleep } from './lib/walk.mjs';

const BASE = walkBase(process.argv, process.env, 'http://127.0.0.1:8193');
const SEED = Number(arg('seed') ?? 4242);
const VIEW = { width: Number(arg('width') ?? 1600), height: Number(arg('height') ?? 1000) };
const SHOTS = arg('shots');

const fails = [];
const check = (what, ok, detail = '') => {
  say(`${ok ? 'PASS · ' : 'FAIL · '}${what}${detail ? ` · ${detail}` : ''}`);
  if (!ok) fails.push(what);
};
const bail = (why) => { say(`SET-UP · ${why}`); process.exit(2); };

const post = async (path, body, cookie) => {
  const r = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: BASE, ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
  return { status: r.status, cookie: (r.headers.get('set-cookie') ?? '').split(';')[0],
    json: await r.json().catch(() => ({})) };
};
const viewAs = (slug, cookie) => fetch(`${BASE}/api/d/${slug}/view`, { headers: { cookie } })
  .then((r) => r.json()).catch(() => null);

await assertServerBuild(BASE, 'news-walk');

// **Ready, not session**: the ladder's own 🍾 lays the Text's pair down, and a
// ✒️ amendment needs the pen kept — so the walk climbs to *ready* and presses
// 🍾 itself, keeping every power (`laidDown: []`)
const ladder = await post('/api/dev/ladder', { to: 'ready', seed: SEED });
if (ladder.json.phase !== 'ready' || !ladder.json.slug) {
  bail(`the ladder did not ready a document: ${JSON.stringify(ladder.json).slice(0, 300)}`);
}
const slug = ladder.json.slug;
const seats = ladder.json.seats ?? [];
const founder = seats.find((s) => s.founder);
const others = seats.filter((s) => !s.founder);
if (!founder || others.length < 2) bail(`the ladder seated no room: ${JSON.stringify(seats).slice(0, 300)}`);
const ME = others[0].id;
const GONE = others[others.length - 1].id;

const f = await post('/api/dev/seat', { slug, member: founder.id });
if (f.status !== 200) bail(`the seat switch refused the founder: ${f.status}`);
const cmd = (op, args) => post(`/api/d/${slug}/cmd`, { cmd: op, args }, f.cookie);
const begun = await cmd('begin', { laidDown: [] });
if (begun.status !== 200) bail(`begin → ${begun.status} ${JSON.stringify(begun.json)}`);

// 👑 — a power laid down after 🍾 is one release batch, news to every other member
const rel = await cmd('relinquish', { setting: 'lapse', power: 'unilateral' });
if (rel.status !== 200) bail(`relinquish → ${rel.status} ${JSON.stringify(rel.json)}`);
// ✒️ on the Text — the Founder's amendment passes on submission, news to the room
const v0 = await viewAs(slug, f.cookie);
const pen = await cmd('pen-text', { baseVersion: v0.textVersion,
  hunks: withWas(v0.text, [{ start: 0, end: 1, lines: ['The clubhouse shall be kept open on weekdays.'] }]),
  why: 'the hours were never the club’s to promise' });
if (pen.status !== 200) bail(`pen-text → ${pen.status} ${JSON.stringify(pen.json)}`);
// 📭 — an invitation nobody follows, driven to its attempt cap
const dead = `dead${Date.now()}@example.org`;
const inv = await cmd('invite', { email: dead });
if (inv.status !== 200) bail(`invite ${dead} → ${inv.status} ${JSON.stringify(inv.json)}`);
await sleep(1500);
const gu = await post('/api/dev/outbox/give-up', { slug, to: dead }, f.cookie);
if (gu.status !== 200) bail(`forced give-up → ${gu.status} ${JSON.stringify(gu.json)}`);
// 🥾 — the Founder's ❌ on a member who is not the one reading
const rm = await cmd('remove', { member: GONE });
if (rm.status !== 200) bail(`remove ${GONE} → ${rm.status} ${JSON.stringify(rm.json)}`);
say(`document /d/${slug} · seed ${SEED} · reading as ${ME} · removed ${GONE} · ${VIEW.width}×${VIEW.height}`);

const seat = await post('/api/dev/seat', { slug, member: ME });
if (seat.status !== 200) bail(`the seat switch refused ${ME}: ${seat.status}`);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: VIEW });
const [cname, cval] = seat.cookie.split(/=(.*)/s);
await ctx.addCookies([{ name: cname, value: cval, url: BASE }]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await landOn(page, `${BASE}/d/${slug}`);
await page.waitForSelector('#rail .qitem', { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(4500);   // the boot render and one poll

/* **What this seat owes**, read off the rail: the entries are what the page
   serves, and each family has its key prefix (`rel:`, `amd:`, `mail:`,
   `dep:`). The 🏛️, ✏️ and ⚖️ grants a fresh seat owes are accepted first,
   since the rail stages news behind nothing but serves the grants ahead. */
const railKeys = () => page.evaluate(() => [...document.querySelectorAll('#rail li')].map((li) =>
  li.dataset.q || (li.querySelector('[data-card]') ?? { dataset: {} }).dataset.card || '?'));
for (const g of ['grant-voice', 'canpropose', 'canjudge']) {
  if (!(await railKeys()).includes(g)) continue;
  await page.evaluate(async (k) => {
    document.querySelector('#rail li[data-q="' + k + '"] button')?.click();
    await new Promise((r) => setTimeout(r, 700));
    document.querySelector('.setupcard [data-ok="' + k + '"]')?.click();
  }, g);
  await page.waitForTimeout(1600);
}
const rail = await railKeys();
say('rail · ' + JSON.stringify(rail));

const FAMILIES = [
  { name: '👑 release batch (E9)', prefix: 'rel:' },
  { name: '✒️ amendment news (E35)', prefix: 'amd:' },
  { name: '📭 mail give-up (E34)', prefix: 'mail:' },
  { name: '🥾 departure (E31)', prefix: 'dep:' },
];
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
for (const fam of FAMILIES) {
  const key = rail.find((k) => k.startsWith(fam.prefix));
  check(fam.name + ' is served to the member', !!key, key || 'rail ' + JSON.stringify(rail));
  if (!key) continue;
  const r = await page.evaluate(async (k) => {
    const q = String(k).replace(/["\\]/g, '\\$&');
    document.querySelector('#rail li[data-q="' + q + '"] button, #rail [data-card="' + q + '"]')?.click();
    await new Promise((res) => setTimeout(res, 1200));
    const c = document.querySelector('.setupcard[data-setupcard="' + q + '"], .sugg[data-card="' + q + '"]');
    if (!c) return null;
    const txt = (el) => (el ? (window.CARDS.glyphTextOf ? window.CARDS.glyphTextOf(el) : el.textContent) : '').replace(/\s+/g, ' ').trim();
    const row = c.querySelector(':scope > .commitrow, :scope > .race-mid.commitrow');
    const labels = [...c.querySelectorAll(':scope > .glabslot .glab')].map(txt);
    return {
      shell: c.classList.contains('gshell'), kind: c.dataset.kind || null, labels,
      head: txt(c.querySelector(':scope > .clausehead .rtext')).slice(0, 120),
      body: txt(c.querySelector(':scope > .gbody, :scope > .field, :scope > .setnote')).slice(0, 160),
      row: row ? [...row.querySelectorAll('button')].map((b) => txt(b) || b.title) : [],
      shape: row ? row.dataset.shape || null : 'absent',
    };
  }, key);
  check(fam.name + ' opens', !!r, JSON.stringify(r));
  if (!r) continue;
  check(fam.name + ' asks only for its OK', r.row.length === 1 && /^OK$/.test(r.row[0]), 'row ' + JSON.stringify(r.row));
  if (r.shell) {
    check(fam.name + ' carries one label above its first line', r.labels.length === 1, JSON.stringify(r.labels));
    check(fam.name + ' has a first line', !!r.head, r.head);
  }
  if (SHOTS) {
    const c = await page.$('.setupcard[data-setupcard="' + key + '"], .sugg[data-card="' + key + '"]');
    if (c) await c.screenshot({ path: join(SHOTS, 'news-' + fam.prefix.replace(':', '') + '-' + VIEW.width + '.png') });
  }
  // **…and the OK answers it**: pressed, the entry leaves the rail — the
  // command landed and nothing is owed any more (Q846's one press)
  await page.evaluate((k) => {
    const q = String(k).replace(/["\\]/g, '\\$&');
    const c = document.querySelector('.setupcard[data-setupcard="' + q + '"], .sugg[data-card="' + q + '"]');
    const ok = c && [...c.querySelectorAll('.commitrow button')].find((b) => /^OK$/.test(b.textContent.trim()));
    if (ok) ok.click();
  }, key);
  await page.waitForTimeout(2500);
  const after = await railKeys();
  check(fam.name + '’s OK takes it off the rail', !after.includes(key), 'rail ' + JSON.stringify(after));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
}

check('the page threw nothing', errors.length === 0, errors.join(' · '));
await browser.close();
say(fails.length ? `\n✗ ${fails.length} failed: ${fails.join('; ')}` : '\n✓ every live-only news family opens, asking only for its OK');
process.exit(fails.length ? 1 : 0);
