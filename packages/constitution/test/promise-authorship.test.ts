/**
 * 👤 **Anonymous Proposals** — promise coverage (backlog 83, series 77, batch L).
 *
 * A founded document is sixteen settings at one value each, and every value is
 * a promise to the room (entry 77). 👤's are promises about *people*: whether a
 * name is ever attached to a proposal, and when. SPEC §3.5a states the ladder;
 * this file is the fold half of the audit, and it locks **only what holds**.
 * A promise the code does not keep is a backlog entry, never a red test.
 *
 * ## The table
 *
 * Five rungs × three epochs. The reader column collapses to two — *the
 * proposer* and *everybody else* — because the fold holds exactly one
 * `authorshipVisibility` and every read goes through `optionView`; there is no
 * per-reader branch anywhere, so *another member*, *the founder as a member*
 * and *the founder as a clerk* are one cell (§3.5a gives the convenor no
 * exception, and a clerk is out of E so the feed refuses them entirely). The
 * stranger is a sixth reader with no row at all: `strangerView` serves no
 * candidates at any rung.
 *
 * The holder-state column collapses too. Founder-held-and-set, delegated-and-
 * collecting and delegated-and-settled differ only in *who* chose the rung;
 * once a rung stands, one value reaches the engine and the reads are identical.
 * Before Begin the middle state is the only one available, and its content is
 * Y9: nothing is sealed because nothing is proposed.
 *
 * | rung                | before 🍾 | live (fold)              | closed (fold)        |
 * |---------------------|-----------|--------------------------|----------------------|
 * | `anonymous`         | Y9 · n/a  | no author, either read   | no author, ever      |
 * | `anonymousElective` | Y9 · n/a  | no author (rides base)   | no author, ever      |
 * | `sealed`            | Y9 · n/a  | no author, either read   | server unseals ✦     |
 * | `sealedElective`    | Y9 · n/a  | no author (rides base)   | server unseals ✦     |
 * | `public`            | Y9 · n/a  | author id, both reads    | server names ✦       |
 *
 * ✦ The reveal is **the server's, not the engine's**: `closeRecord()` carries
 * no author at any rung, and `raceView`'s `withAuthors` reads the candidate's
 * author off the engine directly, gated on the rung *standing at the close*.
 * The engine-side facts that gate stands on are locked here; the server half
 * is `packages/server/test/server.test.ts`.
 *
 * **Before 🍾 there is no third state to test.** Proposing opens at the start
 * (§9.0b) and the bridge refuses to exist before it, so the pre-start epoch's
 * whole content is that nothing can be sealed — asserted below.
 *
 * **What is not locked here, and why.** `public` promises *visible live*; the
 * engine keeps that half (below), and of the server's three reads only
 * `raceCards` carries the id on — filed, not asserted. The two elective rungs promise a per-proposal
 * choice; the *ride the base* half is kept and locked, the *choose* half is
 * entry 30 (Q770), unbuilt. A rung that loosens mid-session follows rather
 * than honours; that is entry 31, and the case for it is `it.todo` — a test
 * pinning *follow* would lock the wrong rule.
 *
 * `authorshipBase` over the five rungs and the consent order are already
 * locked by `catalogue.test.ts`; this file cites rather than repeats them.
 */
import { describe, expect, it } from 'vitest';
import { ParticipantApi } from '@draft/engine-core';
import { EngineBridge } from '../src/engine-bridge.js';
import { authorshipBase } from '../src/adapter.js';
import { ConstitutionSession } from '../src/session.js';
import { buildConstituted } from './helpers.js';

const RUNGS = ['anonymous', 'anonymousElective', 'sealed', 'sealedElective', 'public'] as const;

const patch = (baseVersion: number, lines: string[]) =>
  ({ baseVersion, hunks: [{ start: 0, end: 1, lines }] });

/**
 * A constituted document standing at `rung`, with bo's text proposal live on
 * it. 👤 is founder-held in the helper (reclaimed and set at t=2), so the
 * founder's own pen re-sets it — the `'pen'` route of §9.6, folded rather than
 * raced, and the only route to a rung the helper does not bake. The rung is
 * set *before* the bridge is built so `toEngineConstitution` folds it at open;
 * the amendment path is exercised separately, below.
 */
function proposedAt(rung: string) {
  const { s, bo, cy } = buildConstituted();
  s.setSetting(3, 'authorship', { rung });
  const bridge = new EngineBridge(s, { t: 3, rngSeed: 'authorship-' + rung });
  const { id, raceId } = bridge.proposeText(10, bo,
    patch(bridge.engine.currentVersion(), ['The clubhouse shall be kept open every day.']),
    'nights too');
  return { s, bo, cy, bridge, id, raceId };
}

/**
 * Every blind read the participant API offers of one live candidate: the
 * browse (`liveCandidates`) and the feed (`nextCards`). Both render through
 * `optionView`, which is the single site the rung is enforced at — so a rung
 * kept in one and broken in the other is not expressible, and asserting over
 * both is what says so.
 */
function optionsSeenBy(bridge: EngineBridge, who: string, id: string) {
  const api = new ParticipantApi(bridge.engine, who);
  const browse = api.liveCandidates().filter((o) => o.id === id);
  const feed = api.nextCards(10, 11).flatMap((c) => [c.a, c.b]).filter((o) => o.id === id);
  expect(browse).toHaveLength(1); // the browse always reaches it; the feed may not
  return [...browse, ...feed];
}

describe('the ladder reaches the engine as its base rung (§3.5a, Q767)', () => {
  it.each(RUNGS)('%s is folded to its base at open, and to nothing else', (rung) => {
    const { bridge } = proposedAt(rung);
    expect(bridge.engine.constitution.authorshipVisibility).toBe(authorshipBase(rung));
    expect(['anonymous', 'sealed', 'public']).toContain(authorshipBase(rung));
  });

  it('a rung the founder re-sets after the start reaches the engine through sync', () => {
    const { s, bridge } = proposedAt('sealed');
    expect(bridge.engine.constitution.authorshipVisibility).toBe('sealed');
    s.setSetting(11, 'authorship', { rung: 'anonymous' });
    bridge.sync(11);
    expect(bridge.engine.constitution.authorshipVisibility).toBe('anonymous');
  });
});

describe('anonymous — “never revealed”', () => {
  it('names nobody to another member, in either read, while the document is live', () => {
    const { bridge, cy, id } = proposedAt('anonymous');
    for (const o of optionsSeenBy(bridge, cy, id)) expect(o.author).toBeUndefined();
  });

  it('does not name the proposer to themselves — being yours is a fact you hold, not a disclosure', () => {
    const { bridge, bo, id } = proposedAt('anonymous');
    for (const o of optionsSeenBy(bridge, bo, id)) expect(o.author).toBeUndefined();
    // and `myCandidates` is how the proposer knows their own: state, never a name
    const mine = new ParticipantApi(bridge.engine, bo).myCandidates();
    expect(mine.map((m) => m.id)).toContain(id);
    expect(JSON.stringify(mine)).not.toMatch(/author/);
  });

  it('is still anonymous at the close: the rung the record reads names nobody', () => {
    const { s, bridge } = proposedAt('anonymous');
    bridge.close(1_000_000);
    expect(s.closed).toBe(true);
    // `withAuthors` reads the rung standing at that moment, through the base
    const standing = (s.settingState('authorship').value as { rung: string }).rung;
    expect(authorshipBase(standing)).toBe('anonymous');
  });
});

describe('anonymousElective — “nobody’s name unless they choose”', () => {
  it('rides anonymous in the fold, so no name reaches a reader by default', () => {
    const { bridge, cy, bo, id } = proposedAt('anonymousElective');
    expect(bridge.engine.constitution.authorshipVisibility).toBe('anonymous');
    for (const who of [cy, bo]) {
      for (const o of optionsSeenBy(bridge, who, id)) expect(o.author).toBeUndefined();
    }
  });

  it('and the record reads it as anonymous too — an unchosen name is no name', () => {
    const { s, bridge } = proposedAt('anonymousElective');
    bridge.close(1_000_000);
    const standing = (s.settingState('authorship').value as { rung: string }).rung;
    expect(authorshipBase(standing)).toBe('anonymous');
  });
  // The *choose* half — a per-proposal sign control — is entry 30 (Q770),
  // unbuilt: no `signed` flag rides a candidate anywhere in `packages/`.
});

describe('sealed — “hidden during the session, revealed at the close”', () => {
  it('names nobody to another member while the session runs', () => {
    const { bridge, cy, id } = proposedAt('sealed');
    for (const o of optionsSeenBy(bridge, cy, id)) expect(o.author).toBeUndefined();
  });

  it('names nobody to the proposer either — the seal is on the name, not on the fact', () => {
    const { bridge, bo, id } = proposedAt('sealed');
    for (const o of optionsSeenBy(bridge, bo, id)) expect(o.author).toBeUndefined();
  });

  it('leaves the reveal to the record: the engine’s own close names nobody', () => {
    const { s, bridge, bo, id } = proposedAt('sealed');
    bridge.close(1_000_000);
    const rec = bridge.closeRecord();
    expect(JSON.stringify(rec)).not.toMatch(/author/);
    // what the server's `withAuthors` will read at that moment
    const standing = (s.settingState('authorship').value as { rung: string }).rung;
    expect(authorshipBase(standing)).toBe('sealed');
    // the name is not gone, it is unprojected: the candidate carries its author
    // on the engine throughout, and the reveal is the server reaching for it
    expect(bridge.engine.getCandidate(id).author).toBe(bo);
  });
});

describe('sealedElective — “names at the close, or earlier by choice”', () => {
  it('rides sealed in the fold, so nobody is named earlier by default', () => {
    const { bridge, cy, bo, id } = proposedAt('sealedElective');
    expect(bridge.engine.constitution.authorshipVisibility).toBe('sealed');
    for (const who of [cy, bo]) {
      for (const o of optionsSeenBy(bridge, who, id)) expect(o.author).toBeUndefined();
    }
  });

  it('and unseals at the close on its base, like sealed', () => {
    const { s, bridge } = proposedAt('sealedElective');
    bridge.close(1_000_000);
    const standing = (s.settingState('authorship').value as { rung: string }).rung;
    expect(authorshipBase(standing)).toBe('sealed');
  });
  // The *earlier by choice* half is entry 30 (Q770), unbuilt.
});

describe('public — “visible live”', () => {
  it('attaches the proposer’s id to every blind read, for another member', () => {
    const { bridge, cy, bo, id } = proposedAt('public');
    const seen = optionsSeenBy(bridge, cy, id);
    for (const o of seen) expect(o.author).toBe(bo);
  });

  it('and to the proposer’s own read', () => {
    const { bridge, bo, id } = proposedAt('public');
    for (const o of optionsSeenBy(bridge, bo, id)) expect(o.author).toBe(bo);
  });

  it('carries an id and not a name — the room resolves it, the engine does not know one', () => {
    const { bridge, cy, bo, id } = proposedAt('public');
    const [o] = optionsSeenBy(bridge, cy, id);
    expect(o!.author).toBe(bo);
    expect(o!.author).toMatch(/^m-\d+$/);            // a member id, not a handle
    expect(JSON.stringify(o)).not.toMatch(/example\.org/);
  });
  // The wire keeps this half in `raceCards` alone (`server.test.ts`); the
  // surface renders no name from a live card at any rung. Filed, not asserted.
});

describe('what every rung keeps, whatever it says', () => {
  it.each(RUNGS)('%s: the rationale is visible — only the name varies (§3.5a)', (rung) => {
    const { bridge, cy, id } = proposedAt(rung);
    for (const o of optionsSeenBy(bridge, cy, id)) expect(o.rationale).toBe('nights too');
  });

  it('nothing is sealed before the start: the bridge refuses to exist (§9.0b)', () => {
    const s = ConstitutionSession.open({ title: 'Night Watch', slug: 'night-watch',
      convenor: { id: 'ada', email: 'ada@example.org', isMember: true } }, 0);
    s.confirmStartingText(1, 'The watch is kept from dusk.');
    expect(s.constitutedAtT).toBeNull();
    expect(() => new EngineBridge(s, { t: 1, rngSeed: 'pre-start' }))
      .toThrow(/the constitution is settled/);
  });

  it('a closing signature is named under anonymous — signing is the opposite act (§3.5a, Q769)', () => {
    const { s, bridge, cy } = proposedAt('anonymous');
    s.setIdentity(4, cy, { name: 'Cy Marlowe' });
    bridge.close(1_000_000);
    s.acknowledgeClose(1_000_001, cy, 'I still think daily.');
    const sigs = bridge.closeRecord().signatures;
    expect(sigs).toHaveLength(1);
    expect(sigs[0]).toMatchObject({ member: cy, name: 'Cy Marlowe' });
  });

  it.each(RUNGS)('%s: the engine’s close record carries no author at all', (rung) => {
    const { bridge } = proposedAt(rung);
    bridge.close(1_000_000);
    expect(JSON.stringify(bridge.closeRecord())).not.toMatch(/author/);
  });
});

describe('a rung that loosens mid-session (entry 31 — honour)', () => {
  it('the amendment reaches the engine, and the engine holds one value for the whole field', () => {
    // Not a promise about disclosure — a fact about the seam, and the reason
    // entry 31 exists. `sync` diffs the standing and amends
    // `authorshipVisibility` wholesale, so there is nowhere for a per-candidate
    // rung to live: one value governs every live candidate at once.
    const { s, bridge, id } = proposedAt('sealed');
    s.setSetting(11, 'authorship', { rung: 'public' });
    bridge.sync(11);
    expect(bridge.engine.constitution.authorshipVisibility).toBe('public');
    expect(bridge.engine.getCandidate(id).state).toBe('live');
  });

  it.todo('a proposal keeps the rung it was made under (entry 31, Ed 2026-08-26) — ' +
    'today it follows: the candidate proposed under `sealed` is named the moment ' +
    '👤 moves to `public`, live, to every reader. A test pinning that would lock ' +
    'the wrong rule, so this stays todo until entry 31 is built.');
});
