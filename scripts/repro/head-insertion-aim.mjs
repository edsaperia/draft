#!/usr/bin/env node
/**
 * head-insertion-aim — **is a member's proposal aimed where they meant it?** (Q1477)
 *
 *   node scripts/repro/head-insertion-aim.mjs http://127.0.0.1:8261 [--case=cork|insertion]
 *
 * The nh2026 convention (2026-09-20) refused five proposals from two members inside two
 * minutes at version 0, each aimed **exactly two lines below** the wording it attested —
 * line 5 for line 3, line 70 for line 68 of 70 — while one rival's one-line insertion stood
 * live at `[0, 0)`. The host's own guard caught all five (R-136); the page's `standDown` let
 * all five through. Two readings of that, and this drives both.
 *
 *   insertion  the reading the plan named: a live insertion at the head of the text is a
 *              race whose span is empty, and a reader keyed beneath it could be a line or
 *              two out. Seat A puts the head insertion up and two replacements beside it;
 *              seat B — page already open, fresh load, after the withdrawal and a quarter of
 *              a minute later — drafts on the third line and on the last, by click-and-type
 *              and by ✏️ *propose edit*, and every aim is read against the text the host
 *              serves. **Green**: the insertion is not it.
 *
 *   cork       what it actually was. `textVersion` reads 0 on both sides of 🍾 — over the
 *              founder's unversioned text before it, over the engine's document at version 0
 *              after — so a page that polled through the cork claimed `tv=0` for a text the
 *              engine had never held and the slim view (2026-09-11) answered without one.
 *              🍾 confirms whatever the column holds (R-081), and the column draws no
 *              paragraph for a blank line, so the engine opened on a text two lines shorter
 *              than the one every page was reading. The room then drew the document in a
 *              line space that was not the engine's, and it stood until the first adoption
 *              moved the version — an hour, at the convention.
 *
 * Exit 0 only if both pass; 1 on any failure, 2 on a broken set-up.
 */
import { chromium } from 'playwright';
import { post as postTo, followLink, sleep, withWas, landOn } from '../lib/walk.mjs';

const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || 'http://127.0.0.1:8208').replace(/\/$/, '');
const ONLY = (argv.find((a) => a.startsWith('--case=')) || '').slice(7);
const say = (s) => console.log(`[${new Date().toTimeString().slice(0, 8)}] ${s}`);
const die = (m) => { console.error(`head-insertion-aim: ${m}`); process.exit(2); };

const health = await (await fetch(`${BASE}/healthz`)).json();
if (health.devMail !== true) die(`${BASE} is not a dev server`);
const post = (path, body, cookie) => postTo(BASE, path, body, cookie);

const fails = [];
const check = (name, ok, detail) => {
  say(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) fails.push(name);
};

/* ------------------------------------------------------------------ *
 * a document, its seats, and the founder's pen
 * ------------------------------------------------------------------ */
const SETTINGS = {
  rate: { grant: 8, cap: 8, dripMinutes: 1 }, pace: { shape: 'fixed' },
  quorum: { form: 'count', n: 2 }, authorship: { rung: 'sealedElective' },
  judgments: { rung: 'after' }, applications: { apply: false }, admission: { price: 'pen' },
  removal: { price: 'proposal' }, machines: { enabled: false, budget: 0 },
  lapse: { afterMs: 5 * 60_000 }, bar: { pct: 50 }, chamber: { rung: 'link' },
};

/** founded, settled and invited, but **not begun**: the cork is the subject */
async function found(run, text, seats) {
  const founderEmail = `founder-${run}@example.org`;
  const created = await (await post('/api/docs',
    { title: `Aim ${run}`, email: founderEmail, isMember: true })).json();
  if (!created.ok || !created.devLink) die(`creation refused: ${JSON.stringify(created)}`);
  const slug = created.slug;
  const founder = (await followLink(created.devLink)).cookie;
  const cmd = async (name, args = {}, cookie = founder) => {
    const r = await post(`/api/d/${slug}/cmd`, { cmd: name, args }, cookie);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) die(`${name} refused (${r.status}): ${JSON.stringify(j)}`);
    return j.result ?? j;
  };
  await cmd('confirm-starting-text', { text });
  await cmd('set-convenor-membership', { isMember: true });
  for (const [setting, value] of Object.entries({
    ...SETTINGS, ending: { endsAtMs: Date.now() + 6 * 3_600_000 },
  })) {
    await (await post(`/api/d/${slug}/cmd`, { cmd: 'reclaim', args: { setting } }, founder)).text();
    await cmd('set-setting', { setting, value });
  }
  const links = {}, emails = {};
  for (const who of seats) {
    const email = `${who}-${run}@example.org`;
    await cmd('invite', { email });
    const tail = await (await fetch(`${BASE}/api/dev/outbox`)).json();
    const mail = (tail.mails ?? []).find((m) => m.to === email && m.link);
    if (!mail) die(`no invitation for ${who} in the dev outbox`);
    links[who] = mail.link; emails[who] = email;
  }
  // an empty `laidDown` keeps every power, the Text's pen included: a Founder
  // who can decree is how an adoption lands on demand
  const begin = async (confirm) => {
    // 🍾 as the press sends it: confirm whatever the column holds, then begin
    if (confirm != null) await cmd('confirm-starting-text', { text: confirm });
    await cmd('begin', { laidDown: [] });
  };
  const view = async (cookie = founder) =>
    (await (await fetch(`${BASE}/api/d/${slug}/view`, { headers: { cookie } })).json());
  const decree = async (hunks, why) => {
    const v = await view();
    return cmd('pen-text', { baseVersion: v.textVersion ?? 0, hunks: withWas(v.text, hunks), why });
  };
  // a seat's id off the founder's own view, so the invitation's one-shot
  // token is left for the page that will spend it
  const midOf = async (who) => {
    const v = await view();
    const row = (v.view.members || []).find((r) => r.email === emails[who]);
    if (!row) die(`no member row for ${who}`);
    return row.id;
  };
  return { slug, cmd, begin, view, decree, links, emails, midOf, founder };
}

/** a seat with a page, its grants already given so nothing has to be reloaded
 *  — a reload would fetch a full view and cure the cork defect before it could
 *  be read */
async function seat(browser, where, slug, me) {
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  // the grants' OKs live in localStorage, one key per document and seat, and
  // they are read at boot — seeded before the first script runs so that no
  // reload is needed, since a reload fetches a full view and would cure the
  // cork defect before it could be read
  await context.addInitScript(([s, m]) => {
    try {
      localStorage.setItem('draft:grants:' + s + ':' + m,
        JSON.stringify(['canpropose', 'grant-pen', 'grant-shield', 'grant-voice', 'canjudge']));
    } catch { /* private mode */ }
  }, [slug, me]);
  // an invitation link is spent once: the first seat follows it, and a second
  // page for the same member carries the cookie it left behind
  if (where.cookie) {
    // by `url`, never by a domain of our own: the host's links are built from
    // its own base, so a seat keyed to 127.0.0.1 against a server that says
    // localhost is no seat at all — and a walk whose second page silently
    // becomes the stranger's door reads as green
    await context.addCookies(where.cookie.split('; ').filter(Boolean).map((c) => ({
      name: c.slice(0, c.indexOf('=')), value: c.slice(c.indexOf('=') + 1), url: BASE })));
  }
  const page = await context.newPage();
  const errs = [];
  page.on('pageerror', (e) => { errs.push(e.message); say(`  pageerror: ${e.message}`); });
  await landOn(page, where.cookie ? `${BASE}/d/${slug}` : where.link);
  await page.waitForURL(new RegExp(`/d/${slug}`), { timeout: 20_000 });
  // before 🍾 the charter column is invisible and `#prose` is the one on show,
  // so the wait is for the element rather than for a painted box
  await page.waitForSelector('#charter', { timeout: 20_000, state: 'attached' });
  await sleep(1500);
  const cookie = (await context.cookies()).map((c) => `${c.name}=${c.value}`).join('; ');
  return { page, cookie, me, errs, context };
}

const linesOf = async (slug, cookie) => {
  const v = await (await fetch(`${BASE}/api/d/${slug}/view`, { headers: { cookie } })).json();
  return { lines: String(v.text || '').split('\n'), version: v.textVersion };
};

/** what the page is drawing, block by block, and what its draft is keyed to.
 *  `LIVE_HOOKS` is closed over inside session-view.html and no walk can reach
 *  it, so the aim is read where it is decided: a site's engine keys and the
 *  wording it remembers being written against, which is exactly what `hunksOf`
 *  turns into `start`/`end`/`was`. */
const model = (page) => page.evaluate(() => {
  const d = (window.SESSION.SUGGS || []).find((x) => x.id === 'draft-yours');
  return {
    prose: (document.querySelector('#prose') || {}).innerText || '',
    blocks: (window.SESSION.DOC || []).filter((l) => !l.gap)
      .map((l) => ({ key: l.key, x: (l.t === 'h' ? '#'.repeat(l.level || 1) + ' ' : '') + (l.x || '') })),
    draft: !d ? null : {
      stranded: !!d.stranded, refusal: d.refusal || null,
      sites: d.sites.map((s) => ({ keys: s.keys, text: s.text, lost: !!s.lost,
        origin: (s.origin || []).map((o) => o.text),
        after: s.insertAfterKey ?? null, afterText: s.afterText ?? null })),
    },
  };
});

/** into edit mode, past the resting 📝 tab */
async function intoEdit(page) {
  await page.evaluate(() => {
    const c = document.querySelector('#ridetab .achip[data-tab="text"]');
    if (c) { c.scrollIntoView({ block: 'start' }); window.scrollBy(0, -200); }
  });
  await sleep(300);
  const door = page.locator('#editdoor [data-act="edit-door"]');
  if (await door.count()) { await door.click(); await sleep(600); }
}

/** the caret at the end of a clause, then the words */
async function typeInto(page, hasText, words) {
  const clause = page.locator('#charter .anch, #charter [data-key]').filter({ hasText }).first();
  if (!(await clause.count())) return false;
  await clause.click();
  await clause.evaluate((el) => {
    const r = document.createRange(); r.selectNodeContents(el); r.collapse(false);
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
  });
  await page.keyboard.type(words, { delay: 25 });
  await sleep(700);
  return true;
}

/** the proposal-row's ✏️, and every /cmd that leaves under it */
async function pressPropose(page) {
  const sent = [];
  const onResp = async (r) => {
    if (!r.url().endsWith('/cmd')) return;
    sent.push({ status: r.status(), sent: r.request().postData() || '',
      body: (await r.text().catch(() => '')).slice(0, 220) });
  };
  page.on('response', onResp);
  // the hold is the proposal-row's ✏️ (Q1382); where a card is open over the
  // draft it is the card's own Propose
  let btn = page.locator('#charter [data-proposalrow] [data-act="row-commit"]:not([data-pen])').first();
  if (!(await btn.count())) btn = page.locator('[data-act="draft-propose"]:not([data-pen])').first();
  await btn.scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {});
  const box = await btn.boundingBox({ timeout: 4000 }).catch(() => null);
  if (!box) { page.off('response', onResp); return { sent, pressed: false }; }
  const held = await page.evaluate(() => window.SESSION.gesture === 'hold');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  if (held) { await page.mouse.down(); await sleep(1600); await page.mouse.up(); }
  else await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await sleep(2500);
  page.off('response', onResp);
  return { sent, pressed: true };
}
const proposals = (sent) => sent.filter((c) => /"propose-text"/.test(c.sent))
  .map((c) => { try { return { args: JSON.parse(c.sent).args, status: c.status, body: c.body }; } catch { return null; } })
  .filter(Boolean);

// a marker respaced on the way through `blocksOf` is still the same paragraph
const same = (a, b) => String(a == null ? '' : a).replace(/^(#{1,3}|-)\s+/, '$1 ').replace(/\s+$/, '')
  === String(b == null ? '' : b).replace(/^(#{1,3}|-)\s+/, '$1 ').replace(/\s+$/, '');
const num = (k) => Number(String(k).slice(1));

/** every site read against the text the host is serving: the line each key
 *  names must still hold the wording the site was written against, and a gap's
 *  clause must be the line immediately above it */
function aimOf(draft, lines) {
  const bad = [];
  for (const s of (draft && draft.sites) || []) {
    if (/^G\d+$/.test(s.keys[0])) {
      const n = num(s.keys[0]);
      if (s.after == null) { if (n !== 0) bad.push(`${s.keys[0]} has no clause above it but is not at the top`); continue; }
      if (s.afterText != null && !same(lines[num(s.after)], s.afterText)) {
        bad.push(`${s.keys[0]} follows ${s.after}, which the host serves as ` +
          JSON.stringify(String(lines[num(s.after)] || '').slice(0, 40)));
      }
      continue;
    }
    s.keys.forEach((k, i) => {
      const want = s.origin[i];
      if (want == null) return;
      if (same(lines[num(k)], want)) return;
      const at = lines.findIndex((l) => same(l, want));
      bad.push(`${k} attests ${JSON.stringify(String(want).slice(0, 40))}` +
        (at >= 0 ? ` which stands at line ${at} (${at - num(k)} out)` : ' which the text does not hold'));
    });
  }
  return bad;
}

/** and the same question asked of the wire: `was` against the served lines */
function wireAim(hunks, lines) {
  const bad = [];
  for (const h of hunks || []) {
    if (h.start === h.end) {
      const want = h.start === 0 ? null : lines[h.start - 1];
      if ((h.after ?? null) !== (want ?? null)) {
        bad.push(`[${h.start}, ${h.end}) says it follows ${JSON.stringify(h.after)}, the text holds ${JSON.stringify(want)}`);
      }
      continue;
    }
    const held = lines.slice(h.start, h.end), was = h.was || [];
    if (held.length !== was.length || held.some((l, i) => l !== was[i])) {
      const at = lines.findIndex((l, i) => was.length && was.every((w, k) => lines[i + k] === w));
      bad.push(`[${h.start}, ${h.end}) attests ${JSON.stringify(String(was[0] || '').slice(0, 40))}` +
        (at >= 0 ? ` which stands at line ${at} (${at - h.start} out)` : ' which the text does not hold'));
    }
  }
  return bad;
}

/* ================================================================== *
 * 1 · cork — a page that polled across 🍾 keeps the pre-🍾 text
 * ================================================================== */
// the founder's column holds blank lines; the drawn column has no paragraph
// for one, so the text 🍾 confirms is the same words two lines shorter
const BLANKS = [
  '# The Compact', '',
  'One. The society meets on the first Tuesday of the month, upstairs, at seven.', '',
  'Two. The treasurer keeps the accounts and shows them at the annual meeting.',
  'Three. The secretary writes, kindly, to anyone who misses three meetings.',
  'Four. Subscriptions fall due in January and are the same for every member.',
  'Five. This compact may be amended by the members at any ordinary meeting.',
];
const DRAWN = BLANKS.filter((l) => l.trim());
const CLAUSE = 'Two. The treasurer keeps the accounts';

if (!ONLY || ONLY === 'cork') {
  say('case cork: a member\'s page open across 🍾, the founder\'s text holding blank lines');
  const run = 'c' + Date.now().toString(36);
  const doc = await found(run, BLANKS.join('\n'), ['member']);
  const browser = await chromium.launch();
  const { page, cookie } = await seat(browser, { link: doc.links.member }, doc.slug,
    await doc.midOf('member'));

  const before = await model(page);
  check('the page is reading the founder\'s text before the cork',
    before.prose.includes('Two. The treasurer'), JSON.stringify(before.prose.slice(0, 60)));

  await doc.begin(DRAWN.join('\n'));
  say('  🍾 pressed: the column confirmed, the two blank lines gone, the engine opened on ' +
    DRAWN.length + ' lines');
  await sleep(10_000);                                   // two turns of the 4s poll

  const { lines } = await linesOf(doc.slug, cookie);
  const drawn = await model(page);
  const wrong = drawn.blocks.filter((b) => lines[Number(String(b.key).slice(1))] !== b.x);
  say('  the page draws ' + JSON.stringify(drawn.blocks.map((b) => b.key)) +
    ' against a text of ' + lines.length + ' lines');
  check('every block the page draws names the line the host serves',
    wrong.length === 0, wrong.map((b) => b.key + ' draws ' + JSON.stringify(b.x.slice(0, 34)) +
      ', the host serves ' + JSON.stringify(String(lines[Number(String(b.key).slice(1))] || '').slice(0, 34))).join(' · '));

  await intoEdit(page);
  const typed = await typeInto(page, CLAUSE, ' They are open to any member who asks.');
  const drafted = typed ? (await model(page)).draft : null;
  if (!drafted || !(drafted.sites || []).length) {
    check('a draft could be begun on the third clause', false, 'no draft in the model');
  } else {
    const d = drafted;
    say('  drafted: ' + JSON.stringify(d.sites.map((s) => s.keys)));
    const bad = aimOf(d, lines);
    check('the draft is keyed to the line its wording stands on', bad.length === 0, bad.join(' · '));
    const { sent, pressed } = await pressPropose(page);
    const out = proposals(sent);
    say('  pressed: ' + pressed + ' · ' + JSON.stringify(sent.map((c) => c.status + ' ' + c.body.slice(0, 90))));
    check('the proposal is taken', pressed && out.length === 1 && out[0].status === 200,
      out.map((o) => o.status + ' ' + o.body).join(' · '));
    if (out.length) {
      const w = wireAim(out[0].args.hunks, lines);
      check('what went over the wire is aimed at the wording it attests', w.length === 0, w.join(' · '));
    }
    // **and a refusal the page could have seen coming is the page's** (Q1463's
    // `standDown`): where nothing is sent at all, it has caught it
    if (out.length && out[0].status !== 200) {
      const said = (await model(page)).draft;
      check('…and where it was not, the page stood the press down first',
        false, 'the page sent it and the host refused; its own card says ' +
          JSON.stringify(said && said.refusal));
    }
  }
  await browser.close();
}

/* ================================================================== *
 * 2 · insertion — a rival's live insertion at the head of the text
 * ================================================================== */
const PLAIN = [
  '# The Compact',
  'One. The society meets on the first Tuesday of the month, upstairs, at seven.',
  'Two. The treasurer keeps the accounts and shows them at the annual meeting.',
  'Three. The secretary writes, kindly, to anyone who misses three meetings.',
  'Four. Subscriptions fall due in January and are the same for every member.',
  'Five. This compact may be amended by the members at any ordinary meeting.',
];
const THIRD = 'Two. The treasurer keeps the accounts';
const LAST = 'Five. This compact may be amended';

if (!ONLY || ONLY === 'insertion') {
  say('case insertion: a one-line insertion live at [0, 0), and a draft begun beneath it');
  const run = 'i' + Date.now().toString(36);
  const doc = await found(run, PLAIN.join('\n'), ['alfa', 'bravo']);
  await doc.begin(null);
  const browser = await chromium.launch();

  // seat A: the head insertion, and two replacements so that ✏️ *propose
  // edit* has a rival's wording to start from (an insertion's card offers
  // none — Q261, `noEdit`)
  const a = await followLink(doc.links.alfa);
  const aCmd = async (name, args) => {
    const r = await post(`/api/d/${doc.slug}/cmd`, { cmd: name, args }, a.cookie);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) die(`${name} by alfa refused (${r.status}): ${JSON.stringify(j)}`);
    return j.result ?? j;
  };
  const v0 = await doc.view(a.cookie);
  const base = v0.textVersion ?? 0;
  const head = await aCmd('propose-text', { baseVersion: base, why: 'a preamble',
    hunks: [{ start: 0, end: 0, lines: ['A preamble, set above everything else.'], after: null }] });
  await aCmd('propose-text', { baseVersion: base, why: 'plainer',
    hunks: withWas(v0.text, [{ start: 2, end: 3, lines: [PLAIN[2] + ' Plainly.'] }]) });
  await aCmd('propose-text', { baseVersion: base, why: 'plainer still',
    hunks: withWas(v0.text, [{ start: 5, end: 6, lines: [PLAIN[5] + ' Plainly.'] }]) });
  say('  alfa: one insertion at [0, 0) (' + (head && head.id) + ') and two replacements beside it');

  const { lines } = await linesOf(doc.slug, a.cookie);

  /** seat B begins a draft on one clause, the aim is read off the model, and
   *  the draft is put back — a press is driven once per state, below, so the
   *  wallet is not what decides how many ways can be walked */
  async function aim(page, where, how) {
    let began = false;
    if (how === 'type') began = await typeInto(page, where, ' And it is written up.');
    else {
      // ✏️ *propose edit* on a rival's wording: the clause's tab opens its
      // card, and the button sits under each lane (`data-propose-from`)
      const clause = page.locator('#charter [data-key]').filter({ hasText: where }).first();
      if (await clause.count()) {
        await clause.scrollIntoViewIfNeeded().catch(() => {});
        await clause.evaluate((el) => {
          const col = el.closest('.cpara, .anch') || el.parentElement;
          const c = col && col.querySelector('.achip');
          if (c) c.click();
        });
        await sleep(900);
      }
      const edit = page.locator('[data-propose-from]').first();
      if (await edit.count()) { await edit.click(); await sleep(900); began = true; }
    }
    if (!began) return { skipped: true };
    const d = (await model(page)).draft;
    // **a check that never ran is not a pass**: a draft the model does not
    // hold has no aim to read, and saying nothing about it would make every
    // way of failing to open one read as green
    if (!d || !(d.sites || []).length) return { skipped: true };
    const bad = aimOf(d, lines);
    // 🗑️ *discard all* puts the column back
    const drop = page.locator('#charter [data-proposalrow] [data-act="row-discard"]').first();
    if (await drop.count()) { await drop.click(); await sleep(700); }
    else {
      const cancel = page.locator('[data-act="draft-cancel"]').first();
      if (await cancel.count()) { await cancel.click(); await sleep(700); }
    }
    return { sites: d && d.sites.map((s) => s.keys), bad };
  }

  async function walkState(what, page) {
    await intoEdit(page);
    for (const where of [THIRD, LAST]) {
      for (const how of ['type', 'edit']) {
        const r = await aim(page, where, how);
        if (r.skipped) {
          check(`${what}: ${how} on ${where.slice(0, 16)} opened a draft to read`, false, 'no draft in the model');
          continue;
        }
        say(`  ${what} · ${how} on “${where.slice(0, 20)}…” → ${JSON.stringify(r.sites)}`);
        check(`${what}: ${how} on ${where.slice(0, 16)} is keyed where its wording stands`,
          r.bad.length === 0, r.bad.join(' · '));
      }
    }
    // one real press from this state, so the wire agrees with the model.
    // ✏️ *propose edit* leaves the card open and the column back in read
    // mode, so the door is pressed again before the caret is asked for
    await intoEdit(page);
    await typeInto(page, THIRD, ' And it is written up.');
    const ready = (await model(page)).draft;
    if (!ready) say(`  ${what} · no draft to press — the press is not walked from this state`);
    else {
      const { sent, pressed } = await pressPropose(page);
      const out = proposals(sent);
      say(`  ${what} · pressed ${pressed} · ` + JSON.stringify(sent.map((c) => c.status + ' ' + c.body.slice(0, 80))));
      check(`${what}: the proposal is taken`,
        pressed && out.length === 1 && out[0].status === 200,
        out.map((o) => o.status + ' ' + o.body).join(' · '));
      if (out.length && out[0].args) {
        const w = wireAim(out[0].args.hunks, lines);
        check(`${what}: what went over the wire is aimed at the wording it attests`,
          w.length === 0, w.join(' · '));
      }
    }
  }

  const mid = await doc.midOf('bravo');
  const open = await seat(browser, { link: doc.links.bravo }, doc.slug, mid);
  await walkState('the page already open', open.page);
  await open.context.close();

  const fresh = await seat(browser, { cookie: open.cookie }, doc.slug, mid);
  await walkState('a fresh load', fresh.page);
  await fresh.context.close();

  // …and after the insertion is withdrawn, at once and a quarter-minute later
  await aCmd('withdraw-text', { candidate: head && head.id });
  say('  alfa withdrew the head insertion');
  const late = await seat(browser, { cookie: open.cookie }, doc.slug, mid);
  await intoEdit(late.page);
  for (const [wait, label] of [[6_000, 'just after the withdrawal'], [10_000, 'sixteen seconds after it']]) {
    await sleep(wait);
    for (const where of [THIRD, LAST]) {
      const r = await aim(late.page, where, 'type');
      if (r.skipped) {
        check(`${label}: a draft opened on ${where.slice(0, 16)}`, false, 'no draft in the model');
        continue;
      }
      say(`  ${label} · “${where.slice(0, 20)}…” → ${JSON.stringify(r.sites)}`);
      check(`${label}: the draft on ${where.slice(0, 16)} is keyed where its wording stands`,
        r.bad.length === 0, r.bad.join(' · '));
    }
  }
  await browser.close();
}

say(fails.length ? `FAILED: ${fails.join(' · ')}` : 'all cases pass');
process.exit(fails.length ? 1 : 0);
