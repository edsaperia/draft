/**
 * Promise-coverage — ⏱️ **the proposal rate**, the engine half (backlog 89,
 * series 77, batch L, 2026-08-27). An audit, not a fix: every promise ⏱️ makes
 * a member, found in the arithmetic and locked, or named as a gap and filed.
 *
 * ⏱️ is one decision stating itself in one sentence (CLAUDE.md `proposal-rate`):
 * *Members start with **grant** ✏️ each, up to a maximum of **cap**. They get an
 * additional ✏️ every **dripMinutes** minutes. Successful ✏️s are refunded.*
 * The value is `{ grant, cap, dripMinutes }` — `grant ≥ 0`, `cap ≥ 1`,
 * `cap ≥ grant`, `dripMinutes` a positive number of **real** minutes (Q353).
 * Ordinary, delegable, no judge-gate. The stake is a flat 1 (SPEC §13).
 *
 * ## The three promises, and where each is kept
 *
 * | # | The promise, in the room's words        | Fold                                   | Surface                              | Verdict |
 * |---|-----------------------------------------|----------------------------------------|--------------------------------------|---------|
 * | 1 | Nobody proposes with an empty wallet     | `submitCandidate` `balanceAt < stake`; `spend`; the bridge's two pre-checks | `broke` disables ✏️ Propose; the refusal comes back on the card | **holds** |
 * | 2 | The drip runs on wall-clock real minutes | `dripIntervalMs = dripMinutes × 60_000`; `materialize`; `rephaseDrip` | the tray's clock from the served `walletInfo` | **holds** |
 * | 3 | The cap holds                            | `materialize`'s `min(bal+1, max(bal, cap))` | *up to a maximum of N* on the ⏱️ clause | **holds in the fold**, unstated on the surface for an over-cap balance |
 *
 * ## Value shape × the three epochs
 *
 * | Value                        | Before 🍾                  | Live                                        | Closed |
 * |------------------------------|----------------------------|---------------------------------------------|--------|
 * | generous `{4, 8, 240}`       | no ledger exists at all — the setting is set/delegated/resolved and grants nothing; proposing opens at the start | grant at arrival, drip to the cap, spend at 1 | `assertOpen` throws before the balance is even read — tokens are worthless (§7) |
 * | sparing `{0, 1, 2880}`       | same                       | **the room cannot propose until the first drip lands** — legal, and the clause says so in numbers | same |
 * | no headroom `{4, 4, 240}`    | same                       | every drip tick is forfeit from the start    | same |
 * | drip disabled (non-finite)   | same                       | the grant is the whole wallet, for ever      | same |
 *
 * ## Holder states
 *
 * ⏱️ is ordinary and delegable, so all five holder states are reachable
 * (founder held-set, held-unset, delegated-collecting, ceremony-settled,
 * members-held-by-handover) — and **none of them changes the arithmetic**:
 * the ledger reads `constitutionValue`, which the bridge writes from whatever
 * *stands*, by whichever route it came to stand. Who decided the number is
 * `promise-holder`'s subject (backlog 93); what the number then does is this
 * file's. `toEngineConstitution` defaults 4 / 8 / 240 while ⏱️ is unset, so a
 * held-unset ⏱️ is a wallet like any other rather than no wallet.
 *
 * ## What is locked elsewhere, and cited rather than duplicated
 *
 * - `tokens.test.ts` — the grant, the drip up to the cap, the mid-session
 *   joiner, spend-with-drip, drip lost at cap, refunds vs the cap, *a
 *   perpetual document drips on the same clock (Q353)*, a disabled drip.
 * - `bridge.test.ts` — the stake leaving the wallet on a text proposal and on
 *   an ordinary motion, the withdrawal refund, and *a candidate the engine
 *   refuses leaves nothing behind*.
 * - `promise-rate.test.ts` in `@draft/constitution` — the bridge's two
 *   pre-checks and a proposal at zero refused end to end.
 * - 🤖 machines (backlog 90) shares the budget-as-wallet idea; not duplicated
 *   here — `machineAuthored` buys nothing and spends nothing in this file.
 */
import { describe, expect, it } from 'vitest';
import { Session, makeConstitution } from '../src/session.js';
import { dripIntervalMs, materialize, openLedger } from '../src/tokens.js';
import { roster } from './helpers.js';

const HOUR = 3600_000;
const DOC = ['# Charter', 'The club meets on Tuesdays.', 'Dues are ten pounds.'].join('\n');

function open(rate: { grant?: number; cap?: number; dripMinutes?: number } = {}, size = 5) {
  return Session.open({
    text: DOC,
    roster: roster(size),
    constitution: makeConstitution({
      windowStartMs: 0,
      windowEndMs: 10 * HOUR,
      rngSeed: 'promise-rate',
      cooldownMs: 0,
      adoptionThresholdStart: 0.999,
      adoptionThresholdEnd: 0.999,
      tokenGrant: rate.grant ?? 4,
      tokenCap: rate.cap ?? 8,
      tokenDripMinutes: rate.dripMinutes ?? 60,
    }),
  }, 0);
}

/** Replace one line — the cheapest legal patch. */
const rewrite = (base: number, line: number, text: string) =>
  ({ baseVersion: base, hunks: [{ start: line, end: line + 1, lines: [text] }] });

/** Spend the wallet to nothing by proposing, one distinct wording per ✏️. */
function drain(s: Session, who: string, t: number): void {
  let n = 0;
  while (s.balance(who, t) >= 1) {
    s.submitCandidate(t, { author: who, patch: rewrite(0, 1, `wording ${++n}`), rationale: '' });
    if (n > 20) throw new Error('drain did not converge');
  }
}

describe('⏱️ promise 1 — nobody proposes with an empty wallet', () => {
  it('the engine refuses the submission itself, not merely the button that offers it', () => {
    const s = open();
    expect(s.balance('p1', 0)).toBe(4);
    drain(s, 'p1', 0);
    expect(s.balance('p1', 0)).toBe(0);
    // The strike is in the fold: no surface, no composer, no disabled
    // attribute anywhere near this. (Entry 73's class — a surface control
    // inviting a refused act — cannot recur here, because the refusal does
    // not depend on the control.)
    expect(() => s.submitCandidate(0, {
      author: 'p1', patch: rewrite(0, 1, 'one more'), rationale: '',
    })).toThrow(/insufficient tokens for stake/);
  });

  it('a refused submission leaves nothing behind — no candidate, no race, no event', () => {
    const s = open();
    drain(s, 'p1', 0);
    const before = s.log.length;
    const races = s.races().length;
    expect(() => s.submitCandidate(0, {
      author: 'p1', patch: rewrite(0, 1, 'one more'), rationale: '',
    })).toThrow(/insufficient/);
    expect(s.log.length).toBe(before);
    expect(s.races().length).toBe(races);
  });

  it('a motion is priced the same as a text proposal — one flat ✏️, whichever it is', () => {
    const s = open();
    s.setStanding(0, 'rate', { grant: 4, cap: 8, dripMinutes: 60 });
    s.submitCandidate(0, {
      author: 'p1', setting: { settingId: 'rate', value: { grant: 5, cap: 8, dripMinutes: 60 } },
      rationale: '',
    });
    expect(s.balance('p1', 0)).toBe(3);
  });

  it('grant 0 is a legal ⏱️: nobody may propose until the first drip lands', () => {
    // `{ grant: 0, cap: 1 }` passes `validateValue` and the ⏱️ card's own
    // input bounds (min 0 on the grant). The clause states it in numbers, so
    // this is a document the room chose, not a gap — but it is the one shape
    // where an *arrived, un-lapsed, fully-powered* member cannot act.
    const s = open({ grant: 0, cap: 1, dripMinutes: 60 });
    expect(s.balance('p1', 0)).toBe(0);
    expect(() => s.submitCandidate(0, {
      author: 'p1', patch: rewrite(0, 1, 'anything'), rationale: '',
    })).toThrow(/insufficient tokens for stake/);
    // and one hour later, exactly one ✏️
    expect(s.balance('p1', HOUR)).toBe(1);
    expect(() => s.submitCandidate(HOUR, {
      author: 'p1', patch: rewrite(0, 1, 'anything'), rationale: '',
    })).not.toThrow();
  });

  it('at the close the wallet is not consulted at all — the document being shut comes first', () => {
    const s = open();
    s.tick(11 * HOUR); // past windowEndMs: runClose
    expect(s.closed).toBe(true);
    // A full wallet, and still refused: `assertOpen` runs before `balanceAt`,
    // so the reason a member is told is *the document is closed*, never
    // *you are out of ✏️*. Tokens are worthless at the close (§7).
    expect(() => s.submitCandidate(11 * HOUR, {
      author: 'p1', patch: rewrite(0, 1, 'too late'), rationale: '',
    })).toThrow(/closed/i);
  });
});

describe('⏱️ promise 2 — the drip runs on wall-clock real minutes', () => {
  it('the interval is dripMinutes × 60_000 and does not scale with the window', () => {
    // Q353's whole point: moving the close touches nobody's wallet. Two
    // documents alike but for a window a hundred times longer drip alike.
    const short = makeConstitution({
      windowStartMs: 0, windowEndMs: 10 * HOUR, rngSeed: 'a', tokenDripMinutes: 90,
    });
    const long = makeConstitution({
      windowStartMs: 0, windowEndMs: 1000 * HOUR, rngSeed: 'a', tokenDripMinutes: 90,
    });
    expect(dripIntervalMs(short)).toBe(90 * 60_000);
    expect(dripIntervalMs(long)).toBe(dripIntervalMs(short));
    expect(openLedger(short, 0).nextDripT).toBe(openLedger(long, 0).nextDripT);
  });

  it('the drip is a live promise: the clock must actually run, and it runs on the server tick', () => {
    // Nothing is emitted when a token drips — `materialize` is lazy, folded
    // into every read. So the promise is kept by *reading*, and the read the
    // product makes is the served view's `api.wallet(t)`. Here, directly:
    const s = open({ dripMinutes: 60 });
    drain(s, 'p1', 0);
    expect(s.balance('p1', 0)).toBe(0);
    expect(s.balance('p1', 59 * 60_000)).toBe(0);
    expect(s.balance('p1', HOUR)).toBe(1);
    expect(s.balance('p1', 3 * HOUR)).toBe(3);
  });

  it('an amendment re-phases: accrued ticks stand, the next lands one *new* interval later', () => {
    const s = open({ dripMinutes: 60 });
    drain(s, 'p1', 0);
    expect(s.balance('p1', 2 * HOUR)).toBe(2); // two hourly ticks stood
    // The room halves the wait, at t = 2h.
    s.amend(2 * HOUR, { tokenDripMinutes: 30 });
    expect(s.balance('p1', 2 * HOUR)).toBe(2);          // no retro-credit
    expect(s.balance('p1', 2 * HOUR + 29 * 60_000)).toBe(2); // not yet
    expect(s.balance('p1', 2.5 * HOUR)).toBe(3);        // one new interval on
    expect(s.balance('p1', 3 * HOUR)).toBe(4);
  });

  it('the re-phase runs under the *old* interval and the *old* cap, before the merge', () => {
    // `constitution-amended` materializes first and only then merges — which
    // is what keeps a rate amendment from crediting ticks at a cap the room
    // had not yet agreed to. Ten-minute drip, cap 4; at t = 2h the room makes
    // it hourly and raises the cap to 8. Under the old cap those twelve ticks
    // were worth 0 (the wallet was already full at 4), and they stay worth 0.
    const s = open({ grant: 4, cap: 4, dripMinutes: 10 });
    expect(s.balance('p1', 0)).toBe(4);
    s.amend(2 * HOUR, { tokenCap: 8, tokenDripMinutes: 60 });
    expect(s.balance('p1', 2 * HOUR)).toBe(4);
    expect(s.balance('p1', 3 * HOUR)).toBe(5);
  });

  it('every ⏱️ amendment carries the drip, which is what makes the re-phase run', () => {
    // `engineFieldsFor('rate')` returns all three fields whatever changed, so
    // `changes.tokenDripMinutes !== undefined` is true for every amendment
    // that comes through ⏱️'s own route. A host that amends `tokenCap` alone
    // skips the materialize — see the filed finding; unreachable from ⏱️.
    const s = open({ grant: 4, cap: 4, dripMinutes: 10 });
    s.amend(2 * HOUR, { tokenCap: 8 }); // cap alone: no materialize, no re-phase
    // The twelve ticks that fell while the wallet was full are now credited
    // at the *new* cap — 4 → 8 — because nobody read the balance in between.
    expect(s.balance('p1', 2 * HOUR)).toBe(8);
  });

  it('a non-positive or non-finite interval is no drip at all, and never Infinity ✏️', () => {
    const s = open({ dripMinutes: 0 });
    drain(s, 'p1', 0);
    expect(s.balance('p1', 0)).toBe(0);
    expect(s.balance('p1', 1000 * HOUR)).toBe(0);
    expect(s.ledgerInfo('p1', 0).nextDripT).toBe(Infinity);
    expect(s.ledgerInfo('p1', 0).dripIntervalMs).toBe(Infinity);
  });
});

describe('⏱️ promise 3 — the cap holds', () => {
  it('the grant is capped at open, so `cap ≥ grant` is belt as well as braces', () => {
    const c = makeConstitution({
      windowStartMs: 0, windowEndMs: HOUR, rngSeed: 'a',
      tokenGrant: 9, tokenCap: 3, tokenDripMinutes: 60,
    });
    // `validateValue` refuses `cap < grant` at ⏱️'s own door; the engine
    // takes `min(grant, cap)` anyway, so no host can mint over the cap.
    expect(openLedger(c, 0).balance).toBe(3);
  });

  it('drip stops at the cap, and what was forfeit stays forfeit', () => {
    const s = open({ grant: 4, cap: 6, dripMinutes: 60 });
    expect(s.balance('p1', 2 * HOUR)).toBe(6);
    expect(s.balance('p1', 9 * HOUR)).toBe(6); // three ticks forfeit
    drain(s, 'p1', 9 * HOUR);
    expect(s.balance('p1', 10 * HOUR)).toBe(1); // one tick, not four
  });

  it('a cap cut does not claw back ✏️ already earned — it stops the drip', () => {
    // Promise 3's edge, in numbers. `materialize`'s per-tick ceiling is
    // `max(balance, cap)`, so a balance already above a newly-lowered cap is
    // **not** clamped down. Deliberate and consistent with *refunds are never
    // forfeited to the cap*: the cap prices accrual, not possession.
    const s = open({ grant: 4, cap: 8, dripMinutes: 60 });
    expect(s.balance('p1', 4 * HOUR)).toBe(8);
    s.amend(4 * HOUR, { tokenGrant: 1, tokenCap: 2, tokenDripMinutes: 60 });
    expect(s.balance('p1', 4 * HOUR)).toBe(8);  // kept whole
    expect(s.balance('p1', 9 * HOUR)).toBe(8);  // and dripping no more
    // Spending down under the new cap, the new cap then binds.
    drain(s, 'p1', 9 * HOUR);
    expect(s.balance('p1', 20 * HOUR)).toBe(2);
  });

  it('the same rule, from the other side: a refund may stand a wallet above its cap', () => {
    // Cited from `tokens.test.ts` *refunds are never forfeited to the cap*
    // and asserted here on the ledger the engine actually keeps, so ⏱️'s
    // audit does not rest on a helper-level test alone.
    const s = open({ grant: 1, cap: 1, dripMinutes: 60 });
    const l = openLedger(s.constitution, 0);
    l.balance = 4; // as a full refund at 1.5× the stake could leave it
    materialize(l, s.constitution, 5 * HOUR);
    expect(l.balance).toBe(4);
  });
});
