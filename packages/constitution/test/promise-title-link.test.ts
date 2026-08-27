/**
 * **Promise-coverage — 🪶 title and 📍 link** (backlog entry 92, series 77,
 * batch L). Two settings taken together because they make the same promise:
 * they name and locate the document, they are both **ordinary** and both
 * **undelegable**, and they are the only two settings the birth sets before
 * anything else exists. Enumerate the promises, find the enforcement twice
 * (fold and surface) in all three epochs, lock what holds, name what does
 * not. **This file fixes nothing** — where it locks behaviour the audit
 * calls a gap, the `it` says so in its own name and its comment names the
 * finding, so the lock fails the day either side of the disagreement moves
 * without the other.
 *
 * `TextValue` is `{ text }`; `SlugValue` is `{ slug }`, validated against
 * `/^[a-z0-9]+(-[a-z0-9]+)*$/` (`values.ts`). Both catalogue entries are
 * `kind: 'ordinary'`, `delegable: false`, `judgeGate: false`, `deps: []`,
 * with no `consent` order and no `routeOf` — so `motionRouteOf` returns
 * `ordinary` for every move that is not the first.
 *
 * ## The holder states — there is no held-unset, and no ceremony state
 *
 * The `created` fold sets both (`session.ts:257`–`:258`), so on any document
 * that exists at all 🪶 and 📍 are **set**. `delegable: false` means no blind
 * question can ever collect them — there is no most-protective title for
 * maxima to find — so `delegate` on them is the **hand-over** branch
 * (`session.ts:1107`, which needs `entry.delegable`), and the hand-over keeps
 * the settled value where a delegation would null it. Two states, then:
 * founder-held-and-set, and members-held-by-hand-over.
 *
 * ## The enumeration — every promise, in every epoch
 *
 * Fold = the method that keeps or breaks it. Surface = the control on
 * `design/session-view.html`. **holds** · **gap (fold)** · **gap (surface)**.
 *
 * | # | the promise, in the room's words | before 🍾 | live | after the close |
 * | --- | --- | --- | --- | --- |
 * | 1 | *the title and link change only by an ordinary motion at the threshold, or the founder's pen while held* | **holds** — there is no motion to make: `openMotion` refuses outright (*before the start nothing is amended — only set*, §9.6a), the room cannot answer them (`answer` → *not collecting*), and `setSetting` is the founder's whole route | **holds on the route, with a qualification on what carrying means** — `motionRouteOf` returns `ordinary` and `openMotion` stakes 1; but a carried motion lands at **`awaiting-crown`**, not on the setting, because `reservedTarget` reads `powers.assent` and the start never lays 🪶/📍's shield down (see promise 3). The founder's pen is the direct route while ✒️ stands | **holds** — `requireOpen` refuses `setSetting` and `openMotion` alike |
 * | 2 | *every link the document has ever had keeps working* (§9.7a) | **holds** — the `created` fold pushes the birth slug (`session.ts:259`); `DocStore.register` indexes every entry of `cs.slugs` | **holds on both routes** — the `setting-set` fold pushes a new slug (`:369`–`:372`) and so does `applyPayloadSet`, the carried-motion path (`:821`–`:824`); `DocStore.persist` re-indexes `cs.slugs` wholesale, and nothing ever removes an index entry. **The invitation link is stronger than the promise needs**: it is `/auth/login?token=`, whose token carries `docId`, so it never contained a slug to break (locked server-side) | **holds** — the index is not torn down at the close, and `requireOpen` stops further change |
 * | 2a | *…and a change never takes an address that is somebody else's* | **holds** — creation uniquifies (`uniqueSlug` over `store.slugTaken`) and the 📍 card asks `/api/slug/:slug` before the ✒️ lights | **gap (fold and surface)** — see below. Locked server-side | n/a |
 * | 3 | *neither is editable by the founder alone after Begin* | n/a — before the start everything is the founder's alone, by construction | **the code says the opposite, deliberately** — the `constituted` fold lays down **only** `startingText`'s pair plus whatever was pending (`session.ts:496`–`:507`), so 🪶 and 📍 keep both the founder's ✒️ and 🛡️. `setSetting` therefore succeeds post-start, folds a `route: 'pen'` motion and owes every arrived member an OK. The audit's reading is below | **holds** — `requireOpen` |
 * | 4 | *a change is news: it is reported as an amendment and owed an acknowledgement* | **holds by being silent** — nothing is owed pre-start (E3: audience *nobody*) | **holds** — `setSetting`'s `changed` is true for 🪶/📍 on **every** post-birth set, since the birth set them, so the ordinary-setting exception (*the founder deciding something for the first time is not a change*) can never apply to these two; `oweOks` owes every arrived member. This is SURFACE §2's E7 | **holds** — no change to report |
 *
 * ## Promise 2a — the collision, the one real gap
 *
 * A **live** slug change is checked for freeness by nobody.
 *
 * - the module: `setSetting` runs `validateFor`, which is `SlugValue`'s shape
 *   regex and nothing else. It has no store to ask;
 * - the command: `commands.ts`'s `set-setting` adds `founderOnly` and a
 *   length cap;
 * - the store: `DocStore.persist` does `slugIndex.set(slug, doc.id)` for every
 *   entry of `cs.slugs` — **last writer wins**, silently;
 * - the page: `slugKnown()` is `!BIRTH || …`, and `BIRTH` is
 *   `location.pathname === '/'`, so on a live document at `/d/:slug` the
 *   commit's freeness gate is **unconditionally true**; and `checkSlug`'s
 *   `!BIRTH` arm answers from the mockup's hard-coded `TAKEN` set rather than
 *   `/api/slug/:slug`, so the live 📍 card never asks the server at all. The
 *   motion composer (`PROPOSE.slug`) has no freeness gate either.
 *
 * So document B may take document A's address, and every link to A then
 * resolves to B. That breaks promise 2 for A by an act of B's — the one way
 * *the link is never broken* can fail. Locked in
 * `packages/server/test/promise-title-link.test.ts`, where a store exists to
 * demonstrate it.
 *
 * ## Promise 3 — the reading this audit takes
 *
 * The entry's words are *neither is editable by the founder alone after
 * Begin*. The fold disagrees: the founder keeps ✒️ on 🪶 and 📍 through 🍾
 * and can re-title unilaterally for ever after.
 *
 * The audit reads the entry as a promise about **reporting**, not about
 * power, and proceeds on that: *a pen change is a legitimate amendment owed
 * an acknowledgement, not a back door*. §9.7 rule 5 and the `'pen'` route
 * exist precisely so a unilateral founder change joins the motions rather
 * than happening off the record — a founder who re-titles has amended the
 * document in public, and every arrived member is owed an OK for it (promise
 * 4, locked below). What the entry is protecting against is a **silent**
 * re-title, and there is none.
 *
 * The other reading — that the room expects 🪶/📍 to leave the founder's hand
 * at 🍾 the way the Text does (X9) — is a spec question, not a code one, and
 * it is in the closing report for Ed. If it were taken, the change would be
 * one line in the `constituted` fold; the lock at *the start does not lay
 * 🪶/📍 down* below is deliberately written so that line cannot land by
 * accident.
 *
 * ## The surface, read and not changed
 *
 * `docAddr` is `'docs.vote/d/' + slug` (`session-view.html:245`) and
 * `linkify`'s pattern is `\bdocs\.vote\/(?:d\/)?[a-z0-9][a-z0-9-]*`
 * (`:4147`), so the clause's own address links whole — **backlog 70's fix
 * stands**, and the address the clause prints is the address `/d/:slug`
 * serves. `holderLine` (`:4121`) states the founder's pen wherever it is
 * held, so a founder-held 🪶 reads its deviation in the clause. `PROPOSE.title`
 * and `PROPOSE.slug` compose the ordinary motions with the setting's own
 * control, and 📍's composer carries the promise in words: *Every link the
 * document has ever had keeps working — a change leaves a redirect behind.*
 *
 * **No seat-matrix row.** The surface event for a post-start title change is
 * §2's **E7**, whose Audience cell is the literal string `as E5`. The harness
 * keys `AUDIENCE` on the cell **verbatim** (`seat-matrix.mjs:890`), there is
 * no `'as E5'` entry, and adding one is out of this entry's scope. An E7 row
 * would therefore report *no rule* and add an exit-3 line rather than an
 * assertion, so the step table is untouched.
 */
import { describe, expect, it } from 'vitest';
import { ConstitutionSession } from '../src/session.js';
import { CATALOGUE, entryOf, motionRouteOf } from '../src/catalogue.js';
import { validateValue } from '../src/values.js';
import { buildConstituted } from './helpers.js';

const openDoc = () => ConstitutionSession.open({
  title: 'Hollow Oak Club Charter',
  slug: 'hollow-oak',
  convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
}, 0);

/** The close `buildConstituted` rides to: the maximum of the three answers. */
const CLOSES_AT = 1_000_000;

describe('🪶/📍 — the catalogue entry (SPEC §9.7.1)', () => {
  for (const id of ['title', 'link'] as const) {
    it(`${id} is ordinary, undelegable, no deps, no consent, no judge gate`, () => {
      const e = entryOf(id);
      expect(e.kind).toBe('ordinary');
      expect(e.delegable).toBe(false);
      expect(e.judgeGate).toBe(false);
      expect(e.deps).toEqual([]);
      expect(e.consent).toBeUndefined();
      // no `routeOf`: the route is the kind, for every value of it. ⏰ is the
      // one ordinary setting whose route can turn constitutional (Q329), and
      // these two carry nothing like it
      expect(e.routeOf).toBeUndefined();
      expect(motionRouteOf(e, { text: 'x', slug: 'x' } as never, { text: 'y', slug: 'y' } as never))
        .toBe('ordinary');
    });
  }

  it('they are the first two entries, and the only pair set by the birth', () => {
    expect(CATALOGUE.map((e) => e.id).slice(0, 2)).toEqual(['title', 'link']);
    const s = openDoc();
    // every other setting is born unset; these two arrive with a value
    expect(s.settingState('title').value).toEqual({ text: 'Hollow Oak Club Charter' });
    expect(s.settingState('link').value).toEqual({ slug: 'hollow-oak' });
    expect(s.settingState('bar').value).toBeNull();
  });

  it("📍's value is a slug, and the shape is the whole of what is checked", () => {
    expect(validateValue('slug', { slug: 'hollow-oak' })).toBeNull();
    expect(validateValue('slug', { slug: 'Hollow-Oak' })).toMatch(/not a valid slug/);
    expect(validateValue('slug', { slug: 'trailing-' })).toMatch(/not a valid slug/);
    // and nothing here knows whether it is *free* — that is promise 2a's gap,
    // and it could not be closed at this layer: the module has no store
    expect(validateValue('slug', { slug: 'somebody-elses-document' })).toBeNull();
  });
});

describe('promise 1 — before 🍾 there is no motion, only the founder setting', () => {
  it('the founder sets both freely, and it is not an amendment', () => {
    const s = openDoc();
    s.setSetting(1, 'title', { text: 'The Orchard Charter' });
    s.setSetting(1, 'link', { slug: 'the-orchard' });
    expect(s.titleOf).toBe('The Orchard Charter');
    expect(s.slug).toBe('the-orchard');
    // §9.6a: before judging opens there are no past decisions to re-rate, so
    // nothing is amended. `setting-set` folds a `pen` motion only post-birth
    // — which these are — but nobody is owed anything, there being no member
    // but the founder to owe it to
    const bo = s.invite(2, 'bo@example.org');
    s.arrive(2, bo);
    s.setSetting(3, 'title', { text: 'The Orchard' });
    expect(s.memberRecords().get(bo)!.okOwed.has('title')).toBe(true);
  });

  it('a member cannot move them: no motion before the start, and no question ever', () => {
    const s = openDoc();
    const bo = s.invite(1, 'bo@example.org');
    s.arrive(1, bo);
    expect(() => s.openMotion(2, bo, { kind: 'set', setting: 'title', value: { text: 'Mine' } }))
      .toThrow(/only set/);
    // undelegable, so there is no blind question for anybody to answer —
    // not before the start and not after it
    expect(() => s.answer(2, bo, 'title', { text: 'Mine' })).toThrow(/not collecting/);
    expect(() => s.answer(2, bo, 'link', { slug: 'mine' })).toThrow(/not collecting/);
  });

  it('delegating them is a hand-over: the value stands, only the holder moves', () => {
    const s = openDoc();
    // the hand-over branch opens with proposing (`session.ts:1115`)
    s.confirmStartingText(1, 'The clubhouse shall be kept open.');
    s.delegate(2, 'title');
    const st = s.settingState('title');
    expect(st.holder).toBe('members');
    expect(st.powers).toEqual({ unilateral: false, assent: false });
    // a *delegation* would null the value and open a question; a hand-over
    // does neither, there being no question to open
    expect(st.value).toEqual({ text: 'Hollow Oak Club Charter' });
    expect(st.collecting).toBe(false);
    expect(() => s.setSetting(3, 'title', { text: 'Mine' })).toThrow(/reclaim it first/);
  });
});

describe('promise 1 — live, the ordinary route', () => {
  it('a member moves the title by an ordinary motion, staked at 1', () => {
    const { s, bo } = buildConstituted();
    const m = s.openMotion(3, bo, { kind: 'set', setting: 'title', value: { text: 'The Orchard' } });
    const rec = s.motionRecords().get(m)!;
    expect(rec.route).toBe('ordinary');
    expect(rec.stake).toBe(1);
    // an ordinary motion is judged as a race, never answered
    expect(() => s.answerMotion(4, bo, m, 'accept')).toThrow(/judged as a race/);
  });

  it('and 📍 the same way — already the case in motions.test.ts, pinned here for the pair', () => {
    const { s, cy } = buildConstituted();
    const m = s.openMotion(3, cy, { kind: 'set', setting: 'link', value: { slug: 'the-orchard' } });
    expect(s.motionRecords().get(m)!.route).toBe('ordinary');
  });

  it('a motion proposing what already stands is refused', () => {
    const { s, bo } = buildConstituted();
    expect(() => s.openMotion(3, bo, { kind: 'set', setting: 'title',
      value: { text: 'Hollow Oak Club Charter' } })).toThrow(/already stands/);
  });

  it("**the qualification**: a carried motion waits on the founder's 🛡️, which 🍾 never took", () => {
    const { s, bo } = buildConstituted();
    const m = s.openMotion(3, bo, { kind: 'set', setting: 'title', value: { text: 'The Orchard' } });
    s.adjudicateOrdinaryMotion(4, m, 'carried');
    // **not** applied: `reservedTarget` reads `powers.assent`, and the start
    // lays down only the Text's pair (promise 3). So the room's ordinary
    // route on 🪶/📍 is, by default, a request the founder may refuse
    expect(s.motionRecords().get(m)!.status).toBe('awaiting-crown');
    expect(s.titleOf).toBe('Hollow Oak Club Charter');
    const q = [...s.crownQuestionRecords().values()].find((x) => x.motion === m)!;
    s.answerCrownQuestion(5, q.id, 'accept');
    expect(s.titleOf).toBe('The Orchard');
    expect(s.settingState('title').settledBy).toBe('crown');
  });

  it('with the shield laid down, a carried motion lands on its own', () => {
    const { s, bo } = buildConstituted();
    s.relinquish(3, 'title', 'assent');
    const m = s.openMotion(3, bo, { kind: 'set', setting: 'title', value: { text: 'The Orchard' } });
    s.adjudicateOrdinaryMotion(4, m, 'carried');
    expect(s.motionRecords().get(m)!.status).toBe('carried');
    expect(s.titleOf).toBe('The Orchard');
    expect(s.settingState('title').settledBy).toBe('motion');
  });

  it('a held motion changes nothing', () => {
    const { s, bo } = buildConstituted();
    const m = s.openMotion(3, bo, { kind: 'set', setting: 'link', value: { slug: 'the-orchard' } });
    s.adjudicateOrdinaryMotion(4, m, 'held');
    expect(s.slug).toBe('hollow-oak');
    expect(s.slugs).toEqual(['hollow-oak']); // a motion that did not carry adds no address
  });
});

describe('promise 2 — every link it has ever had (§9.7a)', () => {
  it('the birth slug is the first entry, and the pen adds each one after it', () => {
    // `founding.test.ts` *keeps every link it has ever had* covers the
    // pre-start pen; this pins the shape the store indexes off
    const s = openDoc();
    expect(s.slugs).toEqual(['hollow-oak']);
    s.setSetting(1, 'link', { slug: 'hollow-oak-charter' });
    s.setSetting(2, 'link', { slug: 'the-orchard' });
    expect(s.slug).toBe('the-orchard');
    expect(s.slugs).toEqual(['hollow-oak', 'hollow-oak-charter', 'the-orchard']);
  });

  it('history never loses an address, and never repeats one', () => {
    const s = openDoc();
    s.setSetting(1, 'link', { slug: 'the-orchard' });
    s.setSetting(2, 'link', { slug: 'hollow-oak' }); // back to where it started
    expect(s.slug).toBe('hollow-oak');
    expect(s.slugs).toEqual(['hollow-oak', 'the-orchard']);
  });

  it('the carried-motion route pushes too — not only the pen (`applyPayloadSet`)', () => {
    const { s, bo } = buildConstituted();
    s.relinquish(3, 'link', 'assent');
    const m = s.openMotion(3, bo, { kind: 'set', setting: 'link', value: { slug: 'the-orchard' } });
    s.adjudicateOrdinaryMotion(4, m, 'carried');
    expect(s.slug).toBe('the-orchard');
    expect(s.slugs).toEqual(['hollow-oak', 'the-orchard']);
  });

  it('and so does the 👑 route, where the founder assents to a carried motion', () => {
    const { s, bo } = buildConstituted();
    const m = s.openMotion(3, bo, { kind: 'set', setting: 'link', value: { slug: 'the-orchard' } });
    s.adjudicateOrdinaryMotion(4, m, 'carried');
    const q = [...s.crownQuestionRecords().values()].find((x) => x.motion === m)!;
    s.answerCrownQuestion(5, q.id, 'accept');
    expect(s.slugs).toEqual(['hollow-oak', 'the-orchard']);
  });

  it('a replay reconstructs the whole history, which is what the store re-indexes', () => {
    const s = openDoc();
    s.setSetting(1, 'link', { slug: 'hollow-oak-charter' });
    s.setSetting(2, 'link', { slug: 'the-orchard' });
    const again = ConstitutionSession.replay([...s.logEntries()]);
    expect(again.slugs).toEqual(['hollow-oak', 'hollow-oak-charter', 'the-orchard']);
  });
});

describe('promise 3 — what 🍾 lays down, and what it leaves alone', () => {
  it('**the start does not lay 🪶/📍 down** — only the Text (X9)', () => {
    const { s } = buildConstituted();
    // the pin: a future change to the `constituted` fold that swept these two
    // into the Text's lay-down would break here, which is the point of the
    // lock. It asserts the code, and the report asks Ed whether the code is
    // what the room means
    expect(s.settingState('startingText').powers).toEqual({ unilateral: false, assent: false });
    expect(s.settingState('title').powers).toEqual({ unilateral: true, assent: true });
    expect(s.settingState('link').powers).toEqual({ unilateral: true, assent: true });
    expect(s.settingState('title').holder).toBe('convenor');
  });

  it('so the founder *can* re-title alone after Begin — and it is folded as an amendment', () => {
    const { s } = buildConstituted();
    s.setSetting(3, 'title', { text: 'The Orchard' }, 'the club moved orchards');
    expect(s.titleOf).toBe('The Orchard');
    expect(s.settingState('title').settledBy).toBe('crown');
    expect(s.settingState('title').previousValue).toEqual({ text: 'Hollow Oak Club Charter' });
    expect(s.settingState('title').setWhy).toBe('the club moved orchards');
    // §9.7 rule 5 / Q530: it joins the motions rather than getting a list of
    // its own, so the clause carries its own history whoever changed it
    const pen = [...s.motionRecords().values()].filter((m) => m.route === 'pen');
    expect(pen).toHaveLength(1);
    expect(pen[0]!.status).toBe('carried');
    expect(pen[0]!.payload).toEqual({ kind: 'set', setting: 'title', value: { text: 'The Orchard' } });
  });

  it('the founder may lay the pen down on them, and then the room is the only route', () => {
    const { s, bo } = buildConstituted();
    s.relinquish(3, 'title', 'unilateral');
    expect(() => s.setSetting(4, 'title', { text: 'Mine' })).toThrow(/propose like a member/);
    // and with both gone the setting is the membership's outright
    s.relinquish(4, 'title', 'assent');
    expect(s.settingState('title').holder).toBe('members');
    const m = s.openMotion(5, bo, { kind: 'set', setting: 'title', value: { text: 'The Orchard' } });
    s.adjudicateOrdinaryMotion(6, m, 'carried');
    expect(s.titleOf).toBe('The Orchard');
  });
});

describe('promise 4 — a change is news, and owed an acknowledgement (SURFACE §2 E7)', () => {
  it('every post-birth set is a *change*, so the ordinary-first-set exception never applies', () => {
    const { s, bo, cy } = buildConstituted();
    s.setSetting(3, 'title', { text: 'The Orchard' });
    expect(s.memberRecords().get(bo)!.okOwed.has('title')).toBe(true);
    expect(s.memberRecords().get(cy)!.okOwed.has('title')).toBe(true);
    // the founder had their say (`oweOks` skips them)
    expect(s.memberRecords().get('ada')!.okOwed.has('title')).toBe(false);
  });

  it('a member who was not here when it was set is owed nothing for it', () => {
    // 🪪 at ✒️ so the invitation is the founder's own act rather than a
    // motion — the arrival is what this is about, not the price of it
    const { s } = buildConstituted({ admission: { price: 'pen' } });
    s.setSetting(3, 'link', { slug: 'the-orchard' });
    const dee = s.invite(4, 'dee@example.org');
    s.arrive(4, dee);
    // *were you here when it was set?* — the one test (CLAUDE.md, Q842)
    expect(s.memberRecords().get(dee)!.okOwed.has('link')).toBe(false);
  });
});

describe('after the close — frozen with the record', () => {
  it('neither the pen nor a motion can move them once the clock has closed', () => {
    const { s, bo } = buildConstituted();
    s.tick(CLOSES_AT);
    expect(s.closed).toBe(true);
    expect(() => s.setSetting(CLOSES_AT + 1, 'title', { text: 'The Orchard' })).toThrow(/closed/);
    expect(() => s.setSetting(CLOSES_AT + 1, 'link', { slug: 'the-orchard' })).toThrow(/closed/);
    expect(() => s.openMotion(CLOSES_AT + 1, bo, { kind: 'set', setting: 'title',
      value: { text: 'The Orchard' } })).toThrow(/closed/);
    expect(() => s.delegate(CLOSES_AT + 1, 'title')).toThrow(/closed/);
  });

  it('and the title and link the record carries are the ones that stood at the close', () => {
    const { s } = buildConstituted();
    s.setSetting(3, 'title', { text: 'The Orchard' });
    s.setSetting(3, 'link', { slug: 'the-orchard' });
    s.tick(CLOSES_AT);
    expect(s.titleOf).toBe('The Orchard');
    expect(s.slug).toBe('the-orchard');
    // and every address it ever wore is still on the record, which is what
    // keeps a link in a year-old email landing on the closed page
    expect(s.slugs).toEqual(['hollow-oak', 'the-orchard']);
  });
});
