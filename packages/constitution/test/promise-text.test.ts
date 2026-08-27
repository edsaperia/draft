/**
 * Promise-coverage — 📄 the Text, and the route a text change actually takes
 * (backlog entry 91, series 77, batch L; audit of 2026-08-27). **Fixes
 * nothing**: it enumerates 📄's promises, finds each one's enforcement, locks
 * what holds and names what does not.
 *
 * 📄 is not a value promise. `TextValue` is `{ text }` and `validateValue`'s
 * `'text'` case takes any string, so *what* the text may say is unconstrained
 * by design (§9.0b: a confirmed-empty text is legal). The whole promise is
 * about the **route**: who may write the document, when, and by what act.
 *
 * ---------------------------------------------------------------------------
 * THE STATES × THE EPOCHS. 📄 carries a crown pair like any held-able setting
 * (Q440) but **no managed value** — `view.ts`'s `MANAGED` excludes it and
 * pushes its row by hand with `value: null`. The value proper is `cs.text` /
 * `textConfirmedFlag`, and post-🍾 the live text is the *engine's* document,
 * which the constitution is never told about (`engine-bridge.ts` `proposeText`).
 *
 *   state                     | before 🍾            | live                  | closed
 *   --------------------------|----------------------|-----------------------|--------
 *   pre-confirm               | founder writes; the  | unreachable — begin() | —
 *   (powers both founder's,   | write channel is the | refuses while the text|
 *    `everSet` false, so      | stash, then `confirm-| is unconfirmed        |
 *    neither power may go)    | starting-text`       | (`waitingOn`, why:    |
 *                             |                      | 'text-unconfirmed')   |
 *   confirmed, founder-held   | re-confirmation is   | unreachable: the fold | —
 *                             | legal right up to 🍾 | at `constituted` lays |
 *                             | (Q819/Q822); either  | both powers down      |
 *                             | power may now be laid|                       |
 *                             | down, pending 🍾     |                       |
 *   confirmed, laid down      | reachable only as    | **the default.** No   | text is
 *   (the post-🍾 default)     | *pending* release    | founder hand on 📄 at | the
 *                             |                      | all; text changes only| record
 *                             |                      | by an adopted proposal|
 *   text-shield reserved      | unreachable (no      | adoptions open a 👑   | pending
 *   (Q440, a `reserve` motion)| motions before the   | question; the founder | 👑s fail
 *                             | start, §9.6a)        | accepts/rejects — not | closed
 *                             |                      | a pen (see below)     |
 *
 * ---------------------------------------------------------------------------
 * EVERY WRITE PATH TO THE TEXT, AND WHAT REFUSES IT. The grep is over the
 * command whitelist (`packages/server/src/commands.ts`, 25 keys) plus every
 * `ConstitutionSession` method that touches `startingText`:
 *
 *   route                                   | pre-🍾   | live                | closed
 *   ----------------------------------------|----------|---------------------|--------
 *   `confirm-starting-text` (founder only)  | THE door | throws *after the   | throws
 *     → `confirmStartingText`               |          | start the text      | *the
 *                                           |          | changes by proposing| document
 *                                           |          | in the document     | has
 *                                           |          | itself*             | closed*
 *   `set-setting startingText`              | throws   | throws (same)       | throws
 *     → `setSetting`, guard before every    | *the text is confirmed once,   | (requireOpen
 *       other check                         | then changed by drafting       |  first)
 *                                           |  (Q440)*                       |
 *   `open-motion {kind:'set',               | throws   | throws *'starting-  | throws
 *      setting:'startingText'}`             | *nothing | Text' is not moved  |
 *                                           | is       | this way*           |
 *                                           | amended* |                     |
 *   `propose-text` / `judge-race` / adoption| no bridge| **THE door** — the  | engine
 *     → `EngineBridge.proposeText`          | before 🍾| engine races it     | refuses
 *   `open-motion {kind:'reserve', …}`       | throws   | carries → the shield| —
 *     → the Q440 crown pair                 |          | (assent), see below |
 *   the fold `starting-text-confirmed`      | the only event that ever writes `cs.text`
 *
 * No other command reaches the text. `answer-crown-question` answers the 👑
 * over an adoption the engine has *already applied*; it rewrites nothing.
 *
 * ---------------------------------------------------------------------------
 * THE THREE PROMISES, AND THE VERDICT ON EACH.
 *
 * 1. *Before 🍾 the founder's text is theirs to write and confirm; after 🍾 it
 *    is locked and changes only by an adopted proposal.* **HOLDS**, in all
 *    three epochs, at the fold. Locked at `:the founder's own door` below;
 *    the pre-start half is `text-powers.test.ts:17` and `:24`.
 *
 * 2. *A heading edit is the same route* (entry 74). **HOLDS at the surface,
 *    and — this audit's own reading — there is now a fold-side lock too.**
 *    `blocksOf` is a *page* symbol, so the *keying* of a heading (`# ` at the
 *    head of a line → one block keyed `L<i>`) is enforced only in
 *    `design/session-view.html:7413`. But what that keying buys is a claim
 *    about the fold — that a heading line is an ordinary hunk with no special
 *    path — and that half **is** reachable from here, through the bridge. It
 *    is locked at `:a heading line is an ordinary hunk` below, which is the
 *    first fold-side assertion the heading route has had.
 *
 * 3. *The founder has no back door once 🍾 is pressed.* **HOLDS.** The
 *    `constituted` fold lays both Text powers down (`session.ts:496`,
 *    cited from `text-powers.test.ts:45`), and the only road back is a
 *    constitutional `reserve` motion that lands without the founder's assent.
 *    A reserved **shield** makes an adoption wait on a 👑 (Q440) — it is
 *    assent over the drafting mechanism, never a pen: the founder may refuse
 *    an adoption, and cannot originate a word. Locked at `:the shield is
 *    assent, not a pen`.
 *
 * ONE FINDING, filed rather than fixed (the series' rule): a `reserve` motion
 * for the **unilateral** power on 📄 is accepted by `openMotion`, races as a
 * constitutional motion, carries, and grants a pen that nothing anywhere can
 * spend — `setSetting`'s `startingText` guard precedes its powers check, so
 * the reserved pen is inert while still lighting 👑 and reading the Text
 * `holder: 'convenor'`. Locked *as it stands* at `:a reserved pen on the Text
 * is inert`, because the promise it bears on (no back door) is kept by the
 * refusal; what is wrong is the coherence, not the safety.
 */
import { describe, expect, it } from 'vitest';
import { ConstitutionSession } from '../src/session.js';
import { EngineBridge } from '../src/engine-bridge.js';
import { view } from '../src/view.js';
import { CATALOGUE } from '../src/catalogue.js';
import { buildConstituted, reserveTextShield } from './helpers.js';

const openDoc = () => ConstitutionSession.open({
  title: 'Hollow Oak Club Charter', slug: 'hollow-oak',
  convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
}, 0);

/** A patch over whole lines, the shape `proposeText` takes (bridge.test.ts). */
const patch = (baseVersion: number, start: number, end: number, lines: string[]) =>
  ({ baseVersion, hunks: [{ start, end, lines }] });

describe('📄 is a route promise, not a value promise', () => {
  it('the catalogue entry is ordinary, undelegable, no judge gate — and carries no value', () => {
    const e = CATALOGUE.find((x) => x.id === 'startingText')!;
    expect(e.kind).toBe('ordinary');
    expect(e.delegable).toBe(false);
    expect(e.judgeGate).toBe(false);
    expect(e.deps).toEqual([]);
    expect(e.consent).toBeUndefined();   // nothing to collect: it is never delegated
    expect(e.routeOf).toBeUndefined();   // and it has no motion route at all (X1)
    // the value lives outside the settings map: the row serves powers only
    const s = openDoc();
    expect(s.settingState('startingText').value).toBeNull();
    s.confirmStartingText(1, 'The clubhouse shall be kept open.');
    expect(s.settingState('startingText').value).toBeNull(); // still — Q440
    expect(s.text).toBe('The clubhouse shall be kept open.');
    expect(view(s, 'ada').settings.find((x) => x.setting === 'startingText')!.value).toBeNull();
  });

  it('any string is a legal text, the empty one included (§9.0b)', () => {
    const s = openDoc();
    s.confirmStartingText(1, '');
    expect(s.textConfirmed).toBe(true);
    expect(s.text).toBe('');
    // and CRLF is normalised at the fold, so the engine is seeded with \n lines
    s.confirmStartingText(2, '# Rules\r\nOpen always.\r');
    expect(s.text).toBe('# Rules\nOpen always.\n');
  });
});

describe('promise 1 — the founder’s own door: written before 🍾, locked after', () => {
  it('before the start the founder may confirm, and confirm again, right up to the cork', () => {
    const s = openDoc();
    expect(s.textConfirmed).toBe(false);
    s.confirmStartingText(1, 'Draft one.');
    s.confirmStartingText(2, 'Draft two.');
    s.confirmStartingText(3, 'Draft three.');
    expect(s.text).toBe('Draft three.');
    // Q819/Q822: re-confirmation is the write channel after the OK, and 🍾
    // flushes the column one last time — so the *decision* locks at the OK
    // and the *column* stays live until the press. The module's own half of
    // that is precisely that repeated confirmation never throws.
  });

  it('an unconfirmed text is what 🍾 waits on, and names', () => {
    const s = openDoc();
    expect(s.readiness().holds.find((h) => h.setting === 'startingText')!.why)
      .toBe('text-unconfirmed');
    expect(() => s.begin(1)).toThrow(/startingText/);
  });

  it('after the start every founder route to the text is refused, by its own sentence', () => {
    const { s, bo } = buildConstituted();
    const was = s.text;
    expect(() => s.confirmStartingText(3, 'rewritten by the founder'))
      .toThrow(/after the start the text changes by proposing in the document itself/);
    expect(() => s.setSetting(3, 'startingText', { text: 'rewritten by the founder' }))
      .toThrow(/the text is confirmed once, then changed by drafting \(Q440\)/);
    expect(() => s.openMotion(3, bo, { kind: 'set', setting: 'startingText',
      value: { text: 'moved by the room' } }))
      .toThrow(/'startingText' is not moved this way/);
    expect(s.text).toBe(was);
    // cited, not repeated: the pre-start `setSetting` refusal is
    // text-powers.test.ts:21, and the post-start `openMotion` one is :54.
  });

  it('and once closed, the two commands refuse before they look at anything else', () => {
    const { s } = buildConstituted();
    s.close(3);
    expect(s.closed).toBe(true);
    expect(() => s.confirmStartingText(4, 'a postscript'))
      .toThrow(/the document has closed — the text is over/);
    expect(() => s.setSetting(4, 'startingText', { text: 'a postscript' }))
      .toThrow(/the document has closed — setting is over/);
    expect(s.text).toBe('The clubhouse shall be kept open.');
  });

  it('no other act on a live document moves cs.text an inch', () => {
    const { s, bo, cy } = buildConstituted();
    const was = s.text!;
    // a battery over every remaining post-start route the module exposes
    s.setSetting(3, 'title', { text: 'A New Name' });
    s.setIdentity(3, bo, { name: 'Bo' });
    s.relinquish(3, 'title', 'unilateral');
    s.seen(3, cy);
    const m = s.openMotion(3, bo, { kind: 'reserve', setting: 'startingText', power: 'assent' });
    s.answerMotion(3, 'ada', m, 'accept');
    s.answerMotion(3, cy, m, 'accept');
    s.tick(4);
    expect(s.text).toBe(was);
    // the one event type that ever writes it
    expect([...s.logEntries()].filter((e) => e.event.type === 'starting-text-confirmed'))
      .toHaveLength(1);
  });
});

describe('promise 2 — the drafting route is the only door, and a heading rides it', () => {
  it('an adopted proposal changes the served text, and the constitution is not told', () => {
    const { s, bo, cy } = buildConstituted();
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'promise-text-door' });
    const v0 = bridge.engine.currentVersion();
    const logBefore = s.logEntries().length;
    const { id, raceId } = bridge.proposeText(10, bo,
      patch(v0, 0, 1, ['The clubhouse shall be kept open every day.']), 'nights too');
    bridge.judge(20, cy, id, bridge.engine.races().find((r) => r.id === raceId)!.incumbentId, 'a');
    expect(bridge.engine.document()).toBe('The clubhouse shall be kept open every day.');
    // the served text moved; `cs.text` — the *starting* text — did not, and
    // the constitution's log did not grow by one entry
    expect(s.text).toBe('The clubhouse shall be kept open.');
    expect(s.logEntries().length).toBe(logBefore);
  });

  it('a heading line is an ordinary hunk — the fold half of entry 74', () => {
    const { s, bo, cy } = buildConstituted();
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'promise-text-heading' });
    // first put a heading in the document, by the only route there is
    const v0 = bridge.engine.currentVersion();
    const a = bridge.proposeText(10, bo,
      patch(v0, 0, 1, ['# House Rules', 'The clubhouse shall be kept open.']), 'a heading');
    bridge.judge(20, cy, a.id, bridge.engine.races().find((r) => r.id === a.raceId)!.incumbentId, 'a');
    expect(bridge.engine.document()).toBe('# House Rules\nThe clubhouse shall be kept open.');
    // now edit the heading *alone*: line 0, the `# `-prefixed one. It races
    // exactly as a paragraph does — no setting id, one contested span, a
    // stake off the proposer's own wallet, and adoption rewrites that line.
    // Past the 5-minute adoption cooldown (§4.2), which is the only reason
    // the second round needs a clock rather than the next tick.
    const t2 = 350_000;
    const v1 = bridge.engine.currentVersion();
    const before = bridge.engine.balance(cy, t2);
    const b = bridge.proposeText(t2, cy, patch(v1, 0, 1, ['# Club Rules']), 'renamed');
    const race = bridge.engine.races().find((r) => r.id === b.raceId)!;
    expect(race.settingId).toBeUndefined();          // a text race, not a motion
    expect(race.contested).toEqual([{ start: 0, end: 1 }]); // one hunk, one line
    expect(bridge.engine.balance(cy, t2)).toBe(before - 1);
    bridge.judge(t2 + 10, bo, b.id, race.incumbentId, 'a');
    expect(bridge.engine.document()).toBe('# Club Rules\nThe clubhouse shall be kept open.');
    expect(bridge.engine.getCandidate(b.id).state).toBe('adopted');
  });

  it('a heading proposal and a paragraph proposal on the same lines share one race', () => {
    const { s, bo, cy } = buildConstituted();
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'promise-text-heading-rival' });
    const v0 = bridge.engine.currentVersion();
    // one turns line 0 into a heading, the other rewords it as prose — the
    // footprint is what finds the race, and a `# ` prefix is not a footprint
    const a = bridge.proposeText(10, bo, patch(v0, 0, 1, ['# House Rules']), '');
    const b = bridge.proposeText(11, cy, patch(v0, 0, 1, ['The clubhouse is open.']), '');
    expect(a.raceId).toBe(b.raceId);
  });
});

describe('promise 3 — no back door once 🍾 is pressed', () => {
  it('the start leaves the founder holding nothing on the Text', () => {
    const { s } = buildConstituted();
    expect(s.settingState('startingText').powers).toEqual({ unilateral: false, assent: false });
    expect(s.settingState('startingText').holder).toBe('members');
    expect(s.textAdoptionNeedsAssent()).toBe(false);
    // cited: `text-powers.test.ts:45` walks the same lay-down and the reserve
    // motion that is the road back.
  });

  it('the shield is assent, not a pen: it can refuse an adoption, never originate one', () => {
    const { s, bo, cy } = buildConstituted();
    reserveTextShield(s, bo, ['ada', cy], 3);
    expect(s.settingState('startingText').powers).toEqual({ unilateral: false, assent: true });
    // with the shield up, the founder still has no route to write a word
    expect(() => s.confirmStartingText(4, 'the founder’s own wording'))
      .toThrow(/after the start/);
    expect(() => s.setSetting(4, 'startingText', { text: 'the founder’s own wording' }))
      .toThrow(/changed by drafting/);
    // what the shield does do: an adoption waits, and the founder answers it
    const bridge = new EngineBridge(s, { t: 5, rngSeed: 'promise-text-shield' });
    const v0 = bridge.engine.currentVersion();
    const { id, raceId } = bridge.proposeText(10, bo,
      patch(v0, 0, 1, ['The clubhouse shall be kept open every day.']), '');
    bridge.judge(20, cy, id, bridge.engine.races().find((r) => r.id === raceId)!.incumbentId, 'a');
    const q = [...s.crownQuestionRecords().values()].find((x) => x.text?.candidateId === id)!;
    expect(q.status).toBe('pending');
    expect(q.motion).toBeNull();
    expect(view(s, 'ada').crownTasks.map((c) => c.id)).toContain(q.id);
    s.answerCrownQuestion(21, q.id, 'reject');
    expect(s.crownQuestionRecords().get(q.id)!.status).toBe('rejected');
    // a rejection keeps what stood — it does not put the founder's words in
    expect(s.text).toBe('The clubhouse shall be kept open.');
    // cited: accept/reject, the sleeping crown's auto-pass and replay are
    // `text-powers.test.ts:76`, `:106` and `:118`.
  });

  it('FINDING — a reserved pen on the Text is inert: it carries, and spends nowhere', () => {
    const { s, bo, cy } = buildConstituted();
    // `openMotion`'s reserve branch has no `startingText` case, so the pen is
    // reservable; it is `admission` alone that is refused there.
    const m = s.openMotion(3, bo, { kind: 'reserve', setting: 'startingText', power: 'unilateral' });
    expect(s.motionRecords().get(m)!.route).toBe('constitutional');
    s.answerMotion(3, 'ada', m, 'accept');
    s.answerMotion(3, cy, m, 'accept');
    expect(s.motionRecords().get(m)!.status).toBe('carried');
    // it lands. The Text now reads founder-held and the document is crowned…
    expect(s.settingState('startingText').powers).toEqual({ unilateral: true, assent: false });
    expect(s.settingState('startingText').holder).toBe('convenor');
    expect(s.crowned()).toBe(true);
    // …and the pen spends nowhere: `setSetting`'s `startingText` guard runs
    // before its powers check, so the promise holds and the power is a fiction.
    expect(() => s.setSetting(4, 'startingText', { text: 'by the pen' }))
      .toThrow(/changed by drafting/);
    expect(() => s.confirmStartingText(4, 'by the pen')).toThrow(/after the start/);
    expect(s.text).toBe('The clubhouse shall be kept open.');
    // nor does it reach the adoption path — that reads the shield alone
    expect(s.textAdoptionNeedsAssent()).toBe(false);
  });
});
