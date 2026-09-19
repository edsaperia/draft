#!/usr/bin/env node
/**
 * line-above — **does a reader's decision card ever put a proposal against the
 * wrong clause?** (Q1477; Ed, the tea room, 2026-09-19: *I made a proposal on a
 * line, and the decision card was correct, but on another person's screen it was
 * a choice between my proposed text and the line above the one I changed*.)
 *
 *   node scripts/repro/line-above.mjs http://127.0.0.1:8290 [--case=<name>]
 *
 * The tea room's own shape, on a dev server, with a READER's page open
 * throughout: a document of one line, a second line appended and carried by the
 * room, a third carried in *above* it — which moves every engine line key
 * beneath it by one — and a live race on the line that moved.  Two things are
 * asserted on the reader's page at every sample: the card's head, *what stands*,
 * which the page reads out of the charter column **by key**, must be the wording
 * the proposal actually replaces; and every key an item carries must name a
 * block the column actually holds, which is where an item keyed in one line
 * space and a column built in another disagree first.  The second is asserted
 * again **on every `setData`**, from inside the page, because a sample every
 * 120ms can step over a swap — and `--case=<family>` takes a whole family.
 *
 * Both directions are driven, because they read differently.  A line carried in
 * **above** the race moves its key UP: an item newer than the column then names
 * a block that does not exist, or the line below.  A line **taken away** above
 * it moves the key DOWN, and a newer item against an older column is headed by
 * exactly the line above — which is the report's own sentence, so it is driven
 * three ways (a clause deleted, two clauses merged into one, a blank line taken
 * out) against four reader states.
 *
 *   tea          the whole sequence, the reader idle and then opening
 *   open-card    the card open on the contested clause across the adoption
 *   other-card   another clause's card open across it, then this one opened
 *   caret        a draft of the reader's own being typed across it
 *   command      the reader's own judgment sent in the same instant
 *   storm        six lines carried in above the open card, one every 400ms
 *   delete/*     a clause deleted above the race, four reader states: their own
 *                judgment sent in the same instant, a caret in a draft, another
 *                clause's card open, and a propose hold still held down
 *   delete-carried  the same deletion carried by the room rather than decreed
 *   merge/*      two clauses above it rewritten as one
 *   blank/*      a blank line above it taken out
 *   parked       the tea room's own configuration — the Founder keeping the
 *                Text's 🛡️ — where the change parks and the room reads a ⏳
 *   seeded       ✏️ *propose edit* on a rival's wording that is carried
 *                before the draft is proposed (Q1477 suspect 2)
 *
 * Exit 0 when every card read the clause it is about; 1 on any mismatch, 2 on
 * a broken set-up.
 */
import { chromium } from 'playwright';
import { post as postTo, followLink, sleep } from '../lib/walk.mjs';

const BASE = (process.argv.find((a) => /^https?:/.test(a)) || 'http://127.0.0.1:8290').replace(/\/$/, '');
const ONLY = (process.argv.find((a) => a.startsWith('--case=')) || '').slice(7);
const post = (p, b, c) => postTo(BASE, p, b, c);
const say = (s) => console.log(`[${new Date().toTimeString().slice(0, 8)}] ${s}`);
const die = (m) => { console.error(`line-above: ${m}`); process.exit(2); };

const health = await (await fetch(`${BASE}/healthz`)).json().catch(() => ({}));
if (health.devMail !== true) die(`${BASE} is not a dev server`);

/** what a patch states it is replacing (Q1463 (1)), over the served text */
const H = (v, h) => {
  const lines = v.text === '' || v.text == null ? [''] : String(v.text).split('\n');
  return h.map((x) => (x.start === x.end
    ? { ...x, after: x.start === 0 ? null : (lines[x.start - 1] ?? null) }
    : { ...x, was: lines.slice(x.start, x.end) }));
};

let N = 0;
/** a document begun with every power kept, `pageSeats`' invitations unconsumed */
async function found(text, members, pageSeats = [], laidDown = [{ setting: 'startingText', power: 'assent' }]) {
  const run = `la${++N}-${Date.now().toString(36)}`;
  const created = await (await post('/api/docs', { title: `Line above ${run}`, email: `f-${run}@example.org`, isMember: true })).json();
  if (!created.ok) die(`creation refused: ${JSON.stringify(created)}`);
  const slug = created.slug;
  const founder = (await followLink(created.devLink)).cookie;
  const cmd = async (name, args = {}, cookie = founder) => {
    const r = await post(`/api/d/${slug}/cmd`, { cmd: name, args }, cookie);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`${name} refused (${r.status}): ${JSON.stringify(j)}`);
    return j.result ?? j;
  };
  await cmd('confirm-starting-text', { text });
  await cmd('set-convenor-membership', { isMember: true });
  for (const [setting, value] of Object.entries({
    rate: { grant: 8, cap: 12, dripMinutes: 1 }, pace: { shape: 'fixed' }, quorum: { form: 'share', n: 50 },
    authorship: { rung: 'sealedElective' }, judgments: { rung: 'after' }, applications: { apply: false },
    admission: { price: 'pen' }, removal: { price: 'proposal' }, machines: { enabled: false, budget: 0 },
    lapse: { afterMs: 5 * 60_000 }, ending: { endsAtMs: Date.now() + 6 * 3_600_000 }, bar: { pct: 50 },
    chamber: { rung: 'link' },
  })) {
    await (await post(`/api/d/${slug}/cmd`, { cmd: 'reclaim', args: { setting } }, founder)).text();
    await cmd('set-setting', { setting, value });
  }
  const emails = members.map((m) => `${m}-${run}@example.org`);
  for (const e of emails) await cmd('invite', { email: e });
  // the Text's 🛡️ goes at 🍾, or every carried change parks on the Founder
  // (SPEC §9.7 rule 8) and nothing ever reaches the document; the ✒️ stays,
  // which is how a decree lands an adoption on demand
  await cmd('begin', { laidDown });
  const tail = await (await fetch(`${BASE}/api/dev/outbox`)).json();
  const links = {}, cookies = {};
  for (const m of members) {
    const mail = (tail.mails ?? []).find((x) => x.to === `${m}-${run}@example.org`);
    if (!mail) die(`no invitation for ${m}`);
    links[m] = mail.link;
    if (!pageSeats.includes(m)) cookies[m] = (await followLink(mail.link)).cookie;
  }
  const view = (cookie = founder) => fetch(`${BASE}/api/d/${slug}/view`, { headers: { cookie } }).then((r) => r.json());
  const lines = async () => String((await view()).text || '').split('\n');
  return { slug, cmd, founder, cookies, links, view, lines, members, run };
}

/** every seat that can judge votes for `cid`, which is how a room adopts */
async function carry(d, cid, voters) {
  let cast = 0;
  for (const m of voters) {
    const c = m === 'founder' ? d.founder : d.cookies[m];
    if (!c) continue;
    const v = await d.view(c);
    const clause = (v.clauses ?? []).find((r) => r.candidates?.some((k) => k.id === cid));
    if (!clause) continue;            // it carried before this seat was asked
    const card = (v.raceCards ?? []).find((x) => x.a.id === cid || x.b.id === cid) ?? clause.ask;
    if (!card) continue;
    await d.cmd('judge-race', { a: card.a.id, b: card.b.id, outcome: card.a.id === cid ? 'a' : 'b' }, c);
    cast++;
  }
  const v = await d.view();
  const still = (v.clauses ?? []).some((r) => r.candidates?.some((k) => k.id === cid));
  const rec = (v.records || []).find((x) => x.candidateId === cid || x.field?.some((f) => f.candidateId === cid));
  if (still || !rec || rec.outcome !== 'adopted') {
    die(`${cid} did not carry after ${cast} judgment(s) — floor ${v.floor}, still=${still}, ` +
      `record ${JSON.stringify(rec && { o: rec.outcome, c: rec.candidateId })}, text ${JSON.stringify(v.text)}`);
  }
}

async function seat(browser, link, slug, gesture) {
  const page = await (await browser.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  // journey's own seam: the commit gesture is a click on this tree, and a hold
  // is the one state the 4s poll defers for, so the hold case asks for one
  if (gesture) await page.addInitScript((g) => { window.COMMIT_GESTURE_OVERRIDE = g; }, gesture);
  const errs = [];
  page.on('pageerror', (e) => { errs.push(e.message); say(`  pageerror: ${e.message}`); });
  await page.goto(link);
  await page.waitForURL(new RegExp(`/d/${slug}`), { timeout: 20_000 });
  await page.waitForSelector('#charter', { timeout: 20_000 });
  await sleep(1200);
  // the grants' OKs live in localStorage, one key per document and seat
  await page.evaluate(() => fetch(location.pathname.replace('/d/', '/api/d/') + '/view').then((r) => r.json())
    .then((v) => localStorage.setItem('draft:grants:' + location.pathname.split('/')[2] + ':' + (v.me || ''),
      JSON.stringify(['canpropose', 'grant-pen', 'grant-shield', 'grant-voice', 'canjudge']))));
  await page.reload();
  await page.waitForSelector('#charter', { timeout: 20_000 });
  await sleep(1500);
  // **The check that samples cannot make**: every data swap, not every 120ms.
  // `setData` is the one door both the column and the items go through, so the
  // invariant is asserted on the far side of each call — if an item's engine
  // key ever names a block the column does not hold, the two are in different
  // line spaces at that instant, however briefly. `had` records whether that
  // call carried a column of its own, which is what tells a SUGGS-only swap
  // apart from a full one.
  await page.evaluate(() => {
    const S = window.SESSION;
    window.__la = [];
    const orig = S.setData;
    window.__laN = 0;
    S.setData = (next) => {
      window.__laN++;
      const r = orig(next);
      try {
        const keys = new Set(S.DOC.filter((l) => !l.gap).map((l) => l.key));
        for (const g of S.SUGGS) {
          for (const k of (g.keys || [])) {
            if (/^L\d+$/.test(k) && !keys.has(k)) {
              window.__la.push({ id: g.id, key: k, doc: [...keys], withColumn: !!(next && next.DOC) });
            }
          }
        }
      } catch (e) { window.__la.push({ threw: String(e && e.message) }); }
      return r;
    };
  });
  return { page, errs };
}

/**
 * The page's own reading of the open card, and the column it drew it against.
 * `head` is what the card puts at the top as *what stands* — the sentence the
 * whole defect is about.
 */
const snap = (page) => page.evaluate(() => {
  const S = window.SESSION;
  const open = document.querySelector('.sugg.quick-open, .sugg.race-open, .sugg.patch-open');
  const headEl = open && open.querySelector('.clausehead .rtext');
  return {
    openId: S.openId,
    doc: S.DOC.filter((l) => !l.gap).map((l) => l.key + '=' + (l.x || '')),
    items: S.SUGGS.filter((g) => g.raceId).map((g) => ({ id: g.id, kind: g.kind, keys: g.keys, insert: !!g.isInsert })),
    card: open ? open.getAttribute('data-card') : null,
    site: open ? open.getAttribute('data-site') : null,
    head: headEl ? headEl.textContent.trim() : null,
    lanes: open ? [...open.querySelectorAll('.lane .rtext, .prop .rtext')].map((e) => e.textContent.trim()) : null,
  };
});

/** open a race's card — its tab where one is drawn, else through the page's own toggle */
async function openRace(page, raceId) {
  return page.evaluate((rid) => {
    const S = window.SESSION;
    const it = S.SUGGS.find((g) => g.raceId === rid && (g.kind === 'quick' || g.kind === 'race'));
    if (!it) return null;
    let hit = null;
    for (const t of document.querySelectorAll('.qitem')) if (t.getAttribute('data-q') === it.id) hit = t;
    if (!hit) for (const t of document.querySelectorAll('.achip')) {
      if (t.getAttribute('data-anchor') === it.id || t.getAttribute('data-tab') === it.id) hit = t;
    }
    if (hit) { hit.scrollIntoView({ block: 'center' }); hit.click(); }
    if (S.openId !== it.id) S.toggle(it.id, false);
    return it.id;
  }, raceId);
}

const bad = [];
const WANT = 'No sugar';
/**
 * The verdict, and the whole point of the walk: a card open on the contested
 * race must be headed by the wording that race is about, whatever the text has
 * done beneath it.  Only that race's card is judged — another clause's card is
 * rightly headed by another clause.
 */
function verdict(label, s, raceId) {
  // …and the structural half, which needs no expected wording: an item keyed
  // in one line space and a column built in another disagree here first
  const keys = new Set(s.doc.map((l) => l.split('=')[0]));
  for (const it of s.items) {
    const off = (it.keys || []).filter((k) => /^Ld+$/.test(k) && !keys.has(k));
    if (off.length) {
      bad.push({ label: label + '/key', item: it.id, keys: it.keys, doc: s.doc });
      say(`  *** MISMATCH [${label}] item ${it.id} is keyed ${off.join(',')} and the column has no such block`);
    }
  }
  if (s.head === null || s.card === null) return;
  if (raceId && !String(s.card).startsWith(raceId + '#')) return;
  if (s.head === WANT) return;
  bad.push({ label, head: s.head, site: s.site, doc: s.doc, items: s.items });
  say(`  *** MISMATCH [${label}] head ${JSON.stringify(s.head)} at ${s.site} — the card is about ${JSON.stringify(WANT)}`);
}

/** every swap the page made, read once a case is over */
async function swaps(page, label) {
  const seen = await page.evaluate(() => window.__la || []).catch(() => []);
  const n = await page.evaluate(() => window.__laN || 0).catch(() => 0);
  // a check nothing runs is not a check (CLAUDE.md: a sink with no source)
  if (!n) { bad.push({ label: label + '/swap', never: true }); say(`  *** the swap check never ran in ${label}`); return; }
  say(`  ${n} swap(s) watched, ${seen.length} bad`);
  if (!seen.length) return;
  for (const x of seen) {
    bad.push({ label: label + '/swap', ...x });
    say(`  *** MISMATCH [${label}] a swap left ${x.id} keyed ${x.key} against a column without it` +
      ` (the call ${x.withColumn ? 'carried' : 'did NOT carry'} a column)`);
  }
}

/** sample the open card until `ms` has passed, reporting every change */
async function watch(page, ms, label, raceId) {
  const t0 = Date.now();
  let last = '';
  while (Date.now() - t0 < ms) {
    const s = await snap(page);
    const k = JSON.stringify([s.card, s.site, s.head, s.doc.length]);
    if (k !== last) {
      last = k;
      say(`  ${label} +${Date.now() - t0}ms  site=${s.site} head=${JSON.stringify(s.head)} blocks=${s.doc.length}`);
      verdict(label, s, raceId);
    }
    await sleep(120);
  }
}

/**
 * The tea room's own history: one line, *No sugar* appended and carried, then
 * *No milk* inserted above it and carried — which moves *No sugar* from L1 to
 * L2 — then a member's proposal on *No sugar*.
 */
async function teaRoom() {
  const d = await found('Yorkshire tea, 8 teabags', ['a', 'b', 'r'], ['r']);
  const everyone = ['founder', 'a', 'b'];
  let v = await d.view(d.cookies.a);
  let cid = (await d.cmd('propose-text', { baseVersion: v.textVersion,
    hunks: H(v, [{ start: 1, end: 1, lines: ['No sugar'] }]), why: 'sugar spoils it' }, d.cookies.a)).id;
  await carry(d, cid, everyone);
  say(`  after No sugar: ${JSON.stringify(await d.lines())}`);
  return { d, everyone };
}

const browser = await chromium.launch();
const ran = [];
async function run(name, fn) {
  if (ONLY && name !== ONLY && !name.startsWith(ONLY + '/')) return;   // `--case=delete` takes the family
  ran.push(name);
  say(`=== ${name}`);
  await fn();
}

/* ---- the whole sequence, the reader watching -------------------------- */
await run('tea', async () => {
  const { d, everyone } = await teaRoom();
  const { page } = await seat(browser, d.links.r, d.slug);
  // a member proposes on *No sugar* while it is still line 1
  let v = await d.view(d.cookies.b);
  await d.cmd('propose-text', { baseVersion: v.textVersion,
    hunks: H(v, [{ start: 1, end: 2, lines: ['No sugar unless everyone agrees'] }]),
    why: 'people take sugar' }, d.cookies.b);
  let raceId = ((await d.view()).clauses || []).find((r) => r.candidates.length)?.id;
  await sleep(4500);
  await openRace(page, raceId);
  await sleep(500);
  let s = await snap(page);
  say(`  reader's card: site=${s.site} head=${JSON.stringify(s.head)}`);
  verdict('tea/before', s, raceId);
  // …and now *No milk* is carried in above it, moving every key beneath
  v = await d.view(d.cookies.a);
  const cid = (await d.cmd('propose-text', { baseVersion: v.textVersion,
    hunks: H(v, [{ start: 1, end: 1, lines: ['No milk'] }]), why: 'milk spoils it' }, d.cookies.a)).id;
  await carry(d, cid, everyone);
  say(`  after No milk: ${JSON.stringify(await d.lines())}`);
  await watch(page, 16_000, 'tea/after', raceId);
  await swaps(page, 'case');
  await page.context().close();
});

/* ---- the same move with the reader in each of four states ------------- */
async function moveUnder(name, prepare) {
  await run(name, async () => {
    const { d, everyone } = await teaRoom();
    const { page } = await seat(browser, d.links.r, d.slug);
    let v = await d.view(d.cookies.b);
    await d.cmd('propose-text', { baseVersion: v.textVersion,
      hunks: H(v, [{ start: 1, end: 2, lines: ['No sugar unless everyone agrees'] }]),
      why: 'people take sugar' }, d.cookies.b);
    const raceId = ((await d.view()).clauses || []).find((r) => r.candidates.length)?.id;
    await sleep(4500);
    await prepare({ d, page, raceId });
    v = await d.view(d.cookies.a);
    const cid = (await d.cmd('propose-text', { baseVersion: v.textVersion,
      hunks: H(v, [{ start: 1, end: 1, lines: ['No milk'] }]), why: 'milk spoils it' }, d.cookies.a)).id;
    await carry(d, cid, everyone);
    say(`  carried; document ${JSON.stringify(await d.lines())}`);
    await watch(page, 14_000, name, raceId);
    // and opened afresh afterwards, in case the card was never re-drawn
    await openRace(page, raceId);
    await sleep(600);
    const s = await snap(page);
    say(`  re-opened: site=${s.site} head=${JSON.stringify(s.head)}`);
    verdict(name + '/reopen', s, raceId);
    await swaps(page, name);
    await page.context().close();
  });
}

await moveUnder('open-card', async ({ page, raceId }) => {
  await openRace(page, raceId); await sleep(500);
  say(`  card open: ${JSON.stringify((await snap(page)).site)}`);
});

await moveUnder('other-card', async ({ d, page }) => {
  // a second race on line 0, so the reader has another card open
  const v = await d.view(d.cookies.b);
  await d.cmd('propose-text', { baseVersion: v.textVersion,
    hunks: H(v, [{ start: 0, end: 1, lines: ['Yorkshire tea, 10 teabags'] }]), why: 'stronger' }, d.cookies.b);
  await sleep(4500);
  const other = ((await d.view()).clauses || []).find((r) => r.contested?.[0]?.start === 0);
  if (other) { await openRace(page, other.id); await sleep(500); }
  say(`  other card open: ${JSON.stringify((await snap(page)).site)}`);
});

await moveUnder('caret', async ({ page }) => {
  // a draft of the reader's own, open and being typed — the column's typing guard
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('#charter [data-key]')].find((x) => /^L/.test(x.getAttribute('data-key')));
    if (!el) return;
    el.scrollIntoView({ block: 'center' });
    el.click();
  });
  await sleep(600);
  await page.keyboard.type(' — and warm the pot');
  await sleep(500);
  say(`  draft open: ${JSON.stringify((await snap(page)).openId)}`);
});

await moveUnder('command', async ({ page, raceId }) => {
  // the reader picks a lane and **sends** the judgment, so their own command's
  // refresh — and live.js's SUGGS-only swap behind it — lands beside the move
  await openRace(page, raceId); await sleep(500);
  await page.evaluate(() => {
    const r = document.querySelector('.sugg .lanepick input, .sugg .lanepick');
    if (r) r.click();
  });
  await sleep(250);
  page.evaluate(() => {
    const b = [...document.querySelectorAll('.sugg .commitrow button')]
      .find((x) => !x.disabled && !x.querySelector('[data-gl="bin"]'));
    if (b) b.click();
  }).catch(() => {});
});

/* ---- a fast room: proposals and adoptions arriving under an open card ----
   The tea room's real conditions — something landing every minute or so — and
   the one window nobody can enumerate by hand.  The reader sits with the
   contested card open while six lines are decreed in above it, one every
   400ms, and the card is read every 100ms throughout. */
await run('storm', async () => {
  const d = await found('Yorkshire tea, 8 teabags\nNo sugar', ['a', 'b', 'r'], ['r']);
  let v = await d.view(d.cookies.b);
  await d.cmd('propose-text', { baseVersion: v.textVersion,
    hunks: H(v, [{ start: 1, end: 2, lines: ['No sugar unless everyone agrees'] }]),
    why: 'people take sugar' }, d.cookies.b);
  const raceId = ((await d.view()).clauses || []).find((r) => r.candidates.length)?.id;
  const { page } = await seat(browser, d.links.r, d.slug);
  await sleep(4500);
  await openRace(page, raceId);
  await sleep(600);
  say(`  card open: ${JSON.stringify((await snap(page)).site)}`);
  let stop = false;
  const storm = (async () => {
    for (let i = 0; i < 6 && !stop; i++) {
      const x = await d.view();
      await d.cmd('pen-text', { baseVersion: x.textVersion,
        hunks: H(x, [{ start: 1, end: 1, lines: [`Rule ${i + 1}`] }]), why: 'more rules' });
      await sleep(400);
    }
  })();
  await watch(page, 14_000, 'storm', raceId);
  stop = true; await storm;
  say(`  document ${JSON.stringify(await d.lines())}`);
  await openRace(page, raceId);
  await sleep(700);
  const s = await snap(page);
  say(`  re-opened: site=${s.site} head=${JSON.stringify(s.head)}`);
  verdict('storm/reopen', s, raceId);
  await swaps(page, 'case');
  await page.context().close();
});

/* ---- a line REMOVED above the contested one ----------------------------
   The other direction, and the one the report's own words need (the
   coordinator's reading, 2026-09-19). Every case above adds a line above the
   race, which moves its key UP; an item newer than the column then names a
   block that does not exist, or the line below. A line **taken away** above it
   moves the key DOWN, and a newer item drawn against an older column is headed
   by exactly the line above. Three removals — a clause deleted, two clauses
   merged into one, a blank line taken out — against four reader states: their
   own command in the same instant, a caret in a draft, another clause's card
   open, and a press still held down (which is the one state the 4s poll defers
   for, so nothing else can repaint under it). */

/** a four-line document with the race on `at`, and whatever moves the text above it */
async function removeUnder(name, { text, at, move, carried = false, gesture = null }, prepare) {
  await run(name, async () => {
    const d = await found(text, ['a', 'b', 'r'], ['r']);
    const lines0 = await d.lines();
    let v = await d.view(d.cookies.b);
    await d.cmd('propose-text', { baseVersion: v.textVersion,
      hunks: H(v, [{ start: at, end: at + 1, lines: [lines0[at] + ' unless everyone agrees'] }]),
      why: 'people take sugar' }, d.cookies.b);
    const raceId = ((await d.view()).clauses || []).find((r) => r.candidates.length)?.id;
    const { page } = await seat(browser, d.links.r, d.slug, gesture);
    await sleep(4500);
    const back = await prepare({ d, page, raceId });
    const during = back && back.during ? back.during : null;
    const after = back && back.after ? back.after : (typeof back === 'function' ? back : null);
    v = await d.view();
    if (during) during({ page, raceId });
    if (carried) {
      // the room's own removal, not the Founder's — the tea room's way
      const cid = (await d.cmd('propose-text', { baseVersion: v.textVersion,
        hunks: H(v, move(String(v.text).split('\n'))), why: 'tidier' }, d.cookies.a)).id;
      await carry(d, cid, ['founder', 'b']);
    } else {
      await d.cmd('pen-text', { baseVersion: v.textVersion, hunks: H(v, move(String(v.text).split('\n'))), why: 'tidier' });
    }
    say(`  removed; document ${JSON.stringify(await d.lines())}`);
    if (after) { await sleep(400); await after({ page, raceId }); }
    await watch(page, 15_000, name, raceId);
    await openRace(page, raceId);
    await sleep(700);
    const s = await snap(page);
    say(`  re-opened: site=${s.site} head=${JSON.stringify(s.head)}`);
    verdict(name + '/reopen', s, raceId);
    await page.mouse.up().catch(() => {});
    await swaps(page, name);
    await page.context().close();
  });
}

// the three removals, each above the contested line
const FOUR = 'Yorkshire tea, 8 teabags\nWarm the pot first\nNo sugar\nMugs, not cups';
const BLANK = 'Yorkshire tea, 8 teabags\n\nNo sugar\nMugs, not cups';
const DEL = { text: FOUR, at: 2, move: () => [{ start: 1, end: 2, lines: [] }] };
const MERGE = { text: FOUR, at: 2, move: (l) => [{ start: 0, end: 2, lines: [`${l[0]}, ${l[1].toLowerCase()}`] }] };
const UNBLANK = { text: BLANK, at: 2, move: () => [{ start: 1, end: 2, lines: [] }] };

// (i) the reader's own command in the same instant
const withCommand = async ({ page, raceId }) => {
  await openRace(page, raceId); await sleep(500);
  await page.evaluate(() => {
    const r = document.querySelector('.sugg .lanepick input, .sugg .lanepick');
    if (r) r.click();
  });
  await sleep(250);
  return { during: ({ page: pg }) => pg.evaluate(() => {
    const b = [...document.querySelectorAll('.sugg .commitrow button')]
      .find((x) => !x.disabled && !/🗑/u.test(x.textContent) && !x.querySelector('[data-gl="bin"]'));
    if (b) b.click();
    return !!b;
  }).catch(() => false) };
};
// (ii) a caret in a draft on another clause
const withCaret = async ({ page }) => {
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('#charter [data-key]')].find((x) => x.getAttribute('data-key') === 'L0');
    if (!el) return;
    el.scrollIntoView({ block: 'center' });
    el.click();
  });
  await sleep(600);
  await page.keyboard.type(' — warmed');
  await sleep(500);
  say(`  draft open: ${JSON.stringify((await snap(page)).openId)}`);
};
// (iii) another clause's card open
const withOtherCard = async ({ d, page }) => {
  const v = await d.view(d.cookies.b);
  const last = (await d.lines()).length - 1;
  await d.cmd('propose-text', { baseVersion: v.textVersion,
    hunks: H(v, [{ start: last, end: last + 1, lines: ['Mugs, never cups'] }]), why: 'mugs' }, d.cookies.b);
  await sleep(4500);
  const other = ((await d.view()).clauses || []).find((r) => r.contested?.[0]?.start === last);
  if (other) { await openRace(page, other.id); await sleep(500); }
  say(`  other card open: ${JSON.stringify((await snap(page)).site)}`);
  // …and the contested card is opened once the text has moved, which is where
  // a column spared behind another card would show
  return async ({ page: pg, raceId }) => { await openRace(pg, raceId); await sleep(500); };
};
// (iv) a press still held down — the propose hold is the one gesture the two
// polls defer for by name (`SESSION.holding`, CLAUDE.md's *nothing rebuilds
// under a press*), so the page is frozen while the text moves beneath it and
// has to catch up whole when the hand lets go
const withHold = async ({ page }) => {
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('#charter [data-key]')].find((x) => x.getAttribute('data-key') === 'L0');
    if (!el) return;
    el.scrollIntoView({ block: 'center' });
    el.click();
  });
  await sleep(600);
  await page.keyboard.type(' — warmed');
  await sleep(600);
  const box = await page.evaluate(() => {
    const b = document.querySelector('[data-act="draft-propose"]:not([disabled]), [data-act="row-commit"]:not([disabled])');
    if (!b) return null;
    b.scrollIntoView({ block: 'center' });
    const r = b.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  if (!box) { say('  no ✏️ to hold'); return null; }
  await page.mouse.move(box.x, box.y);
  await page.mouse.down();
  await sleep(150);
  say(`  holding ✏️: ${JSON.stringify(await page.evaluate(() => ({ holding: window.SESSION.holding })))}`);
  // let go once the text has moved, and let the page catch up
  return async ({ page: pg, raceId }) => {
    say(`  held through the move: ${JSON.stringify(await pg.evaluate(() => ({ holding: window.SESSION.holding,
      doc: window.SESSION.DOC.filter((l) => !l.gap).length })))}`);
    await pg.mouse.up();
    await sleep(2500);
    await openRace(pg, raceId);
    await sleep(600);
  };
};

await removeUnder('delete/command', DEL, withCommand);
await removeUnder('delete/caret', DEL, withCaret);
await removeUnder('delete/other-card', DEL, withOtherCard);
await removeUnder('delete/hold', { ...DEL, gesture: 'hold' }, withHold);
await removeUnder('delete-carried/command', { ...DEL, carried: true }, withCommand);
await removeUnder('merge/command', MERGE, withCommand);
await removeUnder('merge/other-card', MERGE, withOtherCard);
await removeUnder('blank/command', UNBLANK, withCommand);
await removeUnder('blank/other-card', UNBLANK, withOtherCard);

/* ---- the tea room's own configuration: the Founder keeps the Text's 🛡️ ---
   A change the membership carries then *parks* (SPEC §9.7 rule 8), and every
   other seat is served a ⏳ park card headed by the clause — a card whose key
   comes from the parked candidate's own footprint rather than from a race's
   pair, which is a second road to the head.  Then a line is decreed in above
   it, moving every key beneath. */
await run('parked', async () => {
  const d = await found('Yorkshire tea, 8 teabags\nNo sugar', ['a', 'b', 'r'], ['r'], []);
  let v = await d.view(d.cookies.a);
  const cid = (await d.cmd('propose-text', { baseVersion: v.textVersion,
    hunks: H(v, [{ start: 1, end: 2, lines: ['No sugar unless everyone agrees'] }]),
    why: 'people take sugar' }, d.cookies.a)).id;
  const { page } = await seat(browser, d.links.r, d.slug);
  // the membership carries it; with the 🛡️ kept it parks rather than lands
  for (const m of ['founder', 'b']) {
    const c = m === 'founder' ? d.founder : d.cookies[m];
    const x = await d.view(c);
    const clause = (x.clauses ?? []).find((r) => r.candidates?.some((k) => k.id === cid));
    if (!clause) continue;
    const card = (x.raceCards ?? []).find((y) => y.a.id === cid || y.b.id === cid) ?? clause.ask;
    if (card) await d.cmd('judge-race', { a: card.a.id, b: card.b.id, outcome: card.a.id === cid ? 'a' : 'b' }, c);
  }
  const vp = await d.view(d.cookies.b);
  say(`  parked: ${JSON.stringify((vp.parked || []).map((p) => ({ r: p.raceId, sp: p.contested })))}; text ${JSON.stringify(await d.lines())}`);
  await sleep(5000);
  const park = await page.evaluate(() => {
    const S = window.SESSION;
    const it = S.SUGGS.find((g) => g.kind === 'park');
    if (!it) return { none: true, kinds: S.SUGGS.map((g) => g.kind) };
    S.toggle(it.id, false);
    return { id: it.id, keys: it.keys };
  });
  say('  reader park item: ' + JSON.stringify(park));
  await sleep(600);
  let s = await snap(page);
  say(`  park card: site=${s.site} head=${JSON.stringify(s.head)}`);
  verdict('parked/before', s, null);
  // …and a line the room carries in above it. **A decree is refused outright
  // while a park stands** (§9.7 rule 8), so this is the only way the text can
  // move under a parked card at all — and the sweep may pass it over too.
  let x = await d.view(d.cookies.b);
  const cid2 = (await d.cmd('propose-text', { baseVersion: x.textVersion,
    hunks: H(x, [{ start: 1, end: 1, lines: ['No milk'] }]), why: 'milk spoils it' }, d.cookies.b)).id;
  for (const m of ['founder', 'a']) {
    const c = m === 'founder' ? d.founder : d.cookies[m];
    const y = await d.view(c);
    const cl = (y.clauses ?? []).find((r) => r.candidates?.some((k) => k.id === cid2));
    if (!cl) continue;
    const card = (y.raceCards ?? []).find((z) => z.a.id === cid2 || z.b.id === cid2) ?? cl.ask;
    if (card) await d.cmd('judge-race', { a: card.a.id, b: card.b.id, outcome: card.a.id === cid2 ? 'a' : 'b' }, c);
  }
  say(`  carried?; document ${JSON.stringify(await d.lines())}`);
  await sleep(6000);
  const park2 = await page.evaluate(() => {
    const S = window.SESSION;
    const it = S.SUGGS.find((g) => g.kind === 'park');
    if (!it) return { none: true, kinds: S.SUGGS.map((g) => g.kind) };
    if (S.openId !== it.id) S.toggle(it.id, false);
    return { id: it.id, keys: it.keys };
  });
  say('  reader park item after: ' + JSON.stringify(park2));
  await sleep(600);
  s = await snap(page);
  say(`  park card after: site=${s.site} head=${JSON.stringify(s.head)}`);
  verdict('parked/after', s, null);
  await swaps(page, 'case');
  await page.context().close();
});

/* ---- suspect 2: a seeded draft whose wording is adopted beneath it -----
   An insertion's card offers no ✏️ at all (Q261, `noEdit` in session.js), so
   the only *propose edit* road is a rival to a **replacement**: B seeds a
   draft from A's wording, A's wording is carried while B's draft still sits
   unproposed, and the question is where B's draft then stands. */
await run('seeded', async () => {
  const d = await found('Yorkshire tea, 8 teabags\nNo sugar', ['a', 'b', 'r'], ['b']);
  const everyone = ['founder', 'a', 'r'];
  let v = await d.view(d.cookies.a);
  const cid = (await d.cmd('propose-text', { baseVersion: v.textVersion,
    hunks: H(v, [{ start: 1, end: 2, lines: ['No sugar unless everyone agrees'] }]),
    why: 'people take sugar' }, d.cookies.a)).id;
  const { page } = await seat(browser, d.links.b, d.slug);
  const raceId = ((await d.view()).clauses || []).find((r) => r.candidates.some((c) => c.id === cid))?.id;
  await openRace(page, raceId);
  await sleep(700);
  const s0 = await snap(page);
  say(`  B's card: site=${s0.site} head=${JSON.stringify(s0.head)}`);
  verdict('seeded/before', s0, raceId);
  // B presses ✏️ *propose edit* on A's own wording (Q1476's road)
  const opened = await page.evaluate(() => {
    const b = [...document.querySelectorAll('.sugg .lanepropose')];
    if (!b.length) return { none: true };
    const from = b[b.length - 1].getAttribute('data-propose-from');
    b[b.length - 1].click();
    return { from };
  });
  say('  propose-edit: ' + JSON.stringify(opened));
  await sleep(900);
  await page.evaluate(() => {
    const lane = document.querySelector('[data-lane]');
    if (!lane) return;
    lane.focus();
    const r = document.createRange(); r.selectNodeContents(lane); r.collapse(false);
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
  });
  await page.keyboard.type(' at all');
  await sleep(700);
  const draft = () => page.evaluate(() => {
    const dd = window.SESSION.SUGGS.find((x) => x.id === window.SESSION.DRAFT_ID);
    return dd ? { sites: dd.sites.map((x) => ({ keys: x.keys, text: x.text, origin: (x.origin || []).map((o) => o.text), lost: !!x.lost })),
      stranded: !!dd.stranded, refusal: dd.refusal || null } : null;
  });
  say('  B draft: ' + JSON.stringify(await draft()));
  // …and A's wording is carried while B's draft still sits unproposed
  await carry(d, cid, everyone);
  say(`  carried; document ${JSON.stringify(await d.lines())}`);
  await sleep(6000);
  say('  B draft after: ' + JSON.stringify(await draft()));
  say('  B page after: ' + JSON.stringify(await snap(page)).slice(0, 400));
  await swaps(page, 'case');
  await page.context().close();
});

await browser.close();
console.log('');
if (bad.length) {
  console.log(`line-above: ${bad.length} card(s) drawn against the wrong clause`);
  for (const b of bad) console.log('  ' + JSON.stringify(b).slice(0, 400));
  process.exit(1);
}
console.log(`line-above: every card read the clause it is about (${ran.join(', ')})`);
process.exit(0);
