#!/usr/bin/env node
/**
 * closing-line — **the Rules' closing line carries the counts** (Q464,
 * issue #230; Ed 2026-10-22/23): *Proposals closed at 18:00 on 14 November.
 * 9 members made 31 proposals: 14 passed, 12 didn’t, 3 were withdrawn and 2
 * were still open.*
 *
 *   PORT=8341 DRAFT_BASE_URL=http://127.0.0.1:8341 DRAFT_DATA_DIR=<fresh> npm run server
 *   node scripts/repro/closing-line.mjs http://127.0.0.1:8341 [--seed=7272]
 *
 * The ladder closes a real document. The view's `closed.tally` is read for a
 * member and checked against itself (the four outcomes add up to the whole)
 * and against the records the same view serves (every ✔ is a passed
 * wording, every wording on an undecided record is still open); then the
 * page's Rules is read at 1600 for a member and, where 🌍 lets a stranger
 * read the closed page, at the door — the line is the copy function over
 * those counts, and *members have signed* is gone.
 *
 * Joins the sprint tier from its first day (`scripts/ci-walks.sh`, Q1547).
 * Exit 0 when every check passes, 1 on a defect, 2 on a set-up that never got there.
 */
import { assertServerBuild, walkBase } from '../lib/assert-server.mjs';
import { say, arg, landOn, browserFor } from '../lib/walk.mjs';

const BASE = walkBase(process.argv, process.env, 'http://127.0.0.1:8341');
const SEED = Number(arg('seed') ?? 7272);

const fails = [];
const check = (what, ok, detail = '') => {
  say(`${ok ? 'PASS · ' : 'FAIL · '}${what}${detail ? ` · ${detail}` : ''}`);
  if (!ok) fails.push(what);
};
const bail = (why) => { say(`SET-UP · ${why}`); process.exit(2); };
const post = async (path, body) => {
  const r = await fetch(BASE + path, { method: 'POST',
    headers: { 'content-type': 'application/json', origin: BASE }, body: JSON.stringify(body) });
  return { cookie: (r.headers.get('set-cookie') ?? '').split(';')[0], json: await r.json().catch(() => ({})) };
};
const viewAs = (slug, cookie) => fetch(`${BASE}/api/d/${slug}/view`, { headers: cookie ? { cookie } : {} })
  .then((r) => r.json()).catch(() => null);

await assertServerBuild(BASE, 'closing-line');
const ladder = await post('/api/dev/ladder', { to: 'closed', seed: SEED });
if (ladder.json.phase !== 'closed' || !ladder.json.slug) {
  bail(`the ladder did not close a document: ${JSON.stringify(ladder.json).slice(0, 300)}`);
}
const slug = ladder.json.slug;
const member = (ladder.json.seats ?? []).find((s) => !s.founder);
if (!member) bail('the ladder seated no member');
const seat = await post('/api/dev/seat', { slug, member: member.id });
const v = await viewAs(slug, seat.cookie);
const t = v && v.view && v.view.closed && v.view.closed.tally;
if (!t) bail(`the member's view carries no closed.tally: ${JSON.stringify(v && v.view && v.view.closed).slice(0, 300)}`);
say(`document /d/${slug} · seed ${SEED} · tally ${JSON.stringify(t)}`);

check('the four outcomes add up to the proposals',
  t.passed + t.failed + t.withdrawn + t.open === t.proposals, JSON.stringify(t));
check('the closed document had proposals to count', t.proposals > 0);
check('the membership is counted', t.members > 0);
const rec = v.record || {};
const undecidedWordings = (rec.undecided || []).reduce((n, o) => n + (o.field || []).length, 0);
check('every wording on an undecided record is still open', t.open >= undecidedWordings,
  `open ${t.open} · undecided wordings ${undecidedWordings}`);
const passedWordings = (rec.adopted || []).length;
check('every ✔ is a passed wording', t.passed >= passedWordings,
  `passed ${t.passed} · ✔ records ${passedWordings}`);

const browser = await browserFor().launch();
/** The Rules' closing line as a reader's page draws it. */
async function lineFor(cookie) {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  if (cookie) {
    const [cname, cval] = cookie.split(/=(.*)/s);
    await ctx.addCookies([{ name: cname, value: cval, url: BASE }]);
  }
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await landOn(page, `${BASE}/d/${slug}`);
  await page.waitForTimeout(3500);
  const got = await page.evaluate(() => {
    const p = [...document.querySelectorAll('#band p, #band .cpara, #band [data-para]')]
      .map((e) => e.textContent.replace(/\s+/g, ' ').trim())
      .filter((x) => x.includes('Proposals closed at'));
    return { line: p[0] || null, signed: document.body.textContent.includes('members have signed') };
  }).catch(() => null);
  // the copy function over the served counts, evaluated on the page itself
  const want = got && got.line ? await page.evaluate(({ line, tally }) => {
    const at = /Proposals closed at (\d\d:\d\d) on ([^.]+)\./.exec(line);
    return at ? window.COPY.page.clause.closed(at[1], at[2], tally) : null;
  }, { line: got.line, tally: t }) : null;
  await ctx.close();
  return { line: got && got.line, want, signed: got && got.signed, errors };
}

const m = await lineFor(seat.cookie);
say(`member's line: ${m.line}`);
check('a member reads the closing line', !!m.line);
check('…and it is the copy over the served counts', !!m.line && m.line.includes(m.want || '\u0000'),
  `want ${m.want}`);
check('…which states the proposal count', !!m.line && m.line.includes(' made ' + t.proposals + ' proposal'));
check('*members have signed* is gone', !m.signed);
check('no page error for the member', m.errors.length === 0, m.errors.join(' | ').slice(0, 300));

const door = await viewAs(slug, null);
if (door && door.canRead) {
  check('the door serves the same counts where 🌍 lets it read',
    JSON.stringify(door.closed && door.closed.tally) === JSON.stringify(t));
  const s = await lineFor(null);
  say(`stranger's line: ${s.line}`);
  check('a stranger reads the same line', !!s.line && !!s.want && s.line.includes(s.want) && s.want === m.want);
  check('no page error at the door', s.errors.length === 0, s.errors.join(' | ').slice(0, 300));
} else {
  check('the door serves no counts where 🌍 does not let it read', !(door && door.closed && door.closed.tally));
}

await browser.close();
say(fails.length ? `closing-line: ${fails.length} FAIL` : 'closing-line: all PASS');
process.exit(fails.length ? 1 : 0);
