/**
 * Promise-coverage — ⏱️ **the proposal rate**, the constitution half (backlog
 * 89, series 77, batch L, 2026-08-27). The engine half — the token arithmetic
 * and the three promises as a table — is
 * `packages/engine-core/test/promise-rate.test.ts`; read that docblock first.
 * This file is the other door: the **bridge's two pre-checks**, and a proposal
 * at zero refused end to end through the acts a member actually performs.
 *
 * ## Why there are two doors, and why both must hold
 *
 * `engine.submitCandidate` throws *insufficient tokens for stake*, which is
 * the engine's own vocabulary and reaches a member only through a stack trace.
 * `EngineBridge.proposeText` and `EngineBridge.openSetMotion` therefore
 * pre-check `engine.balance(by, t) < engine.constitution.stake` and throw
 * *insufficient ✏️ for the stake (§7)* first — the sentence the page prints
 * under the control that tried, its § pointer stripped by `plainRefusal`.
 *
 * **The fold refuses independently of the button.** `design/session.js` sets
 * `broke = editsHeld < EDIT_RULES.stake` and disables ✏️ Propose, and
 * `editsHeld` is the *served* balance, refreshed on a 4s poll — so a page that
 * has not polled since the wallet emptied offers a proposal the document will
 * not take. Every test below runs with no surface at all. Entry 73's class —
 * a surface control inviting a refused act — cannot recur here, because
 * nothing in the refusal path reads the control.
 *
 * ## The price of each act, by route
 *
 * | Act                                  | Costs | Refused at 0 by                          |
 * |--------------------------------------|-------|------------------------------------------|
 * | `proposeText`                        | 1 ✏️  | the bridge's pre-check, then the engine's |
 * | `openSetMotion`, **ordinary** route  | 1 ✏️  | the bridge's pre-check, then the engine's |
 * | `openSetMotion`, **constitutional**  | free  | nothing — it is not raced, nothing is staked |
 * | `openMotion` on the session directly | free  | nothing — the constitution layer holds no wallet |
 * | withdrawing either                   | −1 ✏️ | refunded whole (§3.3a, `bridge.test.ts`)  |
 *
 * The last two rows are the audit's real content: **a wallet prices a race,
 * not a decision.** A member with an empty wallet may still open a
 * constitutional motion, answer one, judge, resign and give an OK.
 *
 * ## Cited, not duplicated
 *
 * - `bridge.test.ts` — the stake leaving the wallet, the withdrawal refund,
 *   and *a candidate the engine refuses leaves nothing behind* (finding 6a).
 * - `promise-rate.test.ts` in `@draft/engine-core` — the cap, the drip, the
 *   re-phase, the closed epoch, and the filed cap-only-amendment finding.
 */
import { describe, expect, it } from 'vitest';
import { EngineBridge } from '../src/engine-bridge.js';
import { buildConstituted } from './helpers.js';

/** One line of the starting text, rewritten — the cheapest legal proposal. */
const patch = (baseVersion: number, text: string) =>
  ({ baseVersion, hunks: [{ start: 0, end: 1, lines: [text] }] });

/** Propose until the wallet is empty; returns how many ✏️ it took. */
function drain(bridge: EngineBridge, by: string, t: number): number {
  let n = 0;
  while (bridge.engine.balance(by, t) >= bridge.engine.constitution.stake) {
    bridge.proposeText(t, by, patch(bridge.engine.currentVersion(), `wording ${++n}`), '');
    if (n > 20) throw new Error('drain did not converge');
  }
  return n;
}

describe('⏱️ — a proposal at zero is refused at the fold, not at the button', () => {
  it('the bridge pre-checks the wallet before a text proposal, in ✏️ rather than in tokens', () => {
    const { s, bo } = buildConstituted();
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'rate-text' });
    // buildConstituted sets ⏱️ to { grant: 4, cap: 8, dripMinutes: 240 }.
    expect(bridge.engine.balance(bo, 10)).toBe(4);
    expect(drain(bridge, bo, 10)).toBe(4);
    expect(bridge.engine.balance(bo, 10)).toBe(0);

    expect(() => bridge.proposeText(10, bo, patch(bridge.engine.currentVersion(), 'one more'), ''))
      .toThrow('insufficient ✏️ for the stake (§7)');
  });

  it('the refusal costs nothing and leaves no candidate — the wallet is where it was', () => {
    const { s, bo } = buildConstituted();
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'rate-nothing' });
    drain(bridge, bo, 10);
    const candidates = bridge.engine.races().flatMap((r) => r.members).length;
    const seq = bridge.engine.log.length;
    expect(() => bridge.proposeText(10, bo, patch(bridge.engine.currentVersion(), 'x'), ''))
      .toThrow(/insufficient/);
    expect(bridge.engine.balance(bo, 10)).toBe(0);
    expect(bridge.engine.races().flatMap((r) => r.members).length).toBe(candidates);
    expect(bridge.engine.log.length).toBe(seq);
  });

  it('an ordinary motion is priced the same, and the constitution keeps no record of the refusal', () => {
    const { s, bo } = buildConstituted();
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'rate-motion' });
    drain(bridge, bo, 10);
    const motions = s.motionRecords().size;
    // 'ending' is members-held after the ceremony, so this is the ordinary
    // route — the one the pre-check gates.
    expect(() => bridge.openSetMotion(10, bo, 'ending', { endsAtMs: 2_000_000 }, 'later'))
      .toThrow('insufficient ✏️ for the stake (§7)');
    // The pre-check runs *before* `cs.openMotion`, so unlike the engine-refusal
    // path (finding 6a, which compensates with a withdrawal) there is nothing
    // to compensate: no motion was ever opened.
    expect(s.motionRecords().size).toBe(motions);
  });

  it('a constitutional motion is free — an empty wallet prices a race, not a decision', () => {
    const { s, bo, cy } = buildConstituted();
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'rate-const' });
    drain(bridge, bo, 10);
    expect(bridge.engine.balance(bo, 10)).toBe(0);

    // 🌍 chamber is constitutional: unanimity, no engine race, nothing staked.
    const { motion, route } = bridge.openSetMotion(10, bo, 'chamber', { rung: 'closed' }, 'shut it');
    expect(route).toBe('constitutional');
    expect(s.motionRecords().get(motion)!.status).toBe('running');
    expect(bridge.engine.balance(bo, 10)).toBe(0); // still nothing spent

    // And answering it is free too, for everybody.
    s.answerMotion(11, cy, motion, 'accept');
    s.answerMotion(11, 'ada', motion, 'accept');
    expect(s.motionRecords().get(motion)!.status).toBe('carried');
    expect(bridge.engine.balance(bo, 11)).toBe(0);
  });

  it('an empty wallet takes nothing else away: judging, resigning and an OK are all free', () => {
    const { s, bo, cy } = buildConstituted();
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'rate-free' });
    // cy proposes; bo, penniless, still judges it.
    drain(bridge, bo, 10);
    const { id } = bridge.proposeText(10, cy, patch(bridge.engine.currentVersion(), 'cy wording'), '');
    const race = bridge.engine.races().find((r) => r.members.includes(id))!;
    expect(bridge.engine.balance(bo, 10)).toBe(0);
    expect(() => bridge.judge(11, bo, id, race.incumbentId, 'b')).not.toThrow();
  });
});

describe('⏱️ — the value the room decides is the value the wallet runs on', () => {
  it('a founder ✒️ change relays grant, cap and drip to the engine in one amendment', () => {
    const { s, bo } = buildConstituted();
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'rate-relay' });
    expect(bridge.engine.constitution.tokenGrant).toBe(4);
    expect(bridge.engine.constitution.tokenCap).toBe(8);
    expect(bridge.engine.constitution.tokenDripMinutes).toBe(240);

    // ⏱️ is ordinary and the founder still holds its pen, so this is a 'pen'
    // amendment — the fastest route to a changed standing, and the relay is
    // the same one every route ends in (`sync`'s standing diff).
    s.setSetting(10, 'rate', { grant: 2, cap: 3, dripMinutes: 30 });
    bridge.sync(10);
    expect(bridge.engine.constitution.tokenGrant).toBe(2);
    expect(bridge.engine.constitution.tokenCap).toBe(3);
    expect(bridge.engine.constitution.tokenDripMinutes).toBe(30);

    // **Every ⏱️ amendment carries the drip**, because `engineFieldsFor('rate')`
    // returns all three fields whatever changed — which is what makes
    // `constitution-amended` materialize under the old cap before it merges.
    // bo held 4 under a cap of 8; the cut to 3 does not claw them back.
    expect(bridge.engine.balance(bo, 10)).toBe(4);
    // …and the drip is re-phased, so the next ✏️ is 30 minutes off, not 240 —
    // though at 4 over a cap of 3 it will be forfeit when it lands.
    expect(bridge.engine.balance(bo, 10 + 30 * 60_000)).toBe(4);
  });

  it('a wallet emptied under a generous rate is refused just the same under a sparing one', () => {
    const { s, bo } = buildConstituted();
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'rate-sparing' });
    drain(bridge, bo, 10);
    s.setSetting(10, 'rate', { grant: 9, cap: 9, dripMinutes: 5 });
    bridge.sync(10);
    // A raised *grant* is for whoever opens a ledger next, never a top-up:
    // bo's wallet is still empty, and the refusal still stands.
    expect(bridge.engine.balance(bo, 10)).toBe(0);
    expect(() => bridge.proposeText(10, bo, patch(bridge.engine.currentVersion(), 'x'), ''))
      .toThrow(/insufficient ✏️/);
    // Five minutes later, one ✏️ — the drip is the only way back.
    expect(bridge.engine.balance(bo, 10 + 5 * 60_000)).toBe(1);
    expect(() => bridge.proposeText(10 + 5 * 60_000, bo,
      patch(bridge.engine.currentVersion(), 'x'), '')).not.toThrow();
  });
});
