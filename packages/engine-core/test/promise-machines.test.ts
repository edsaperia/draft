/**
 * 🤖 **AI Proposals** — promise coverage, the engine half (series 77, entry 90).
 *
 * The constitution half is `packages/constitution/test/promise-machines.test.ts`
 * and carries the audit table; read it first. This file holds the three things
 * that can only be said engine-side, all of them about SPEC §10's sentence:
 * *the coherence auditor — a standing account with a fixed budget (4 tokens,
 * no drip) that reads the whole document and enters patches against drift,
 * labeled machine-authored, competing by the same arithmetic as anyone.*
 *
 * **There is no auditor.** `machineAuthored` and `Participant.machine` are
 * declared and plumbed; nothing in `packages/` ever sets either. So everything
 * below is either a lock on the plumbing being neutral, or a finding about a
 * promise with no machinery — never a test of a running actor.
 *
 * **This file fixes nothing.**
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Session, makeConstitution } from '../src/session.js';
import { roster } from './helpers.js';

const HOUR = 3600_000;

const DOC = [
  '# Charter',
  'Membership is open to anyone.',
  'Decisions are made by consensus.',
  'Meetings happen when someone calls one.',
].join('\n');

function rewrite(base: number, line: number, text: string) {
  return { baseVersion: base, hunks: [{ start: line, end: line + 1, lines: [text] }] };
}

/**
 * One fixed walk — two rivals, one independent, five judgments carrying the
 * first to adoption, then a tick — run with that first candidate flagged
 * machine-authored or not. Everything else, the rng seed included, is
 * identical, so any difference in the readouts is the flag's and nothing
 * else's. A roster of twelve holds the floor at 4, so the race survives long
 * enough to be a race before it adopts.
 */
function walk(machineAuthored: boolean): Session {
  const s = Session.open({
    text: DOC,
    roster: roster(12),
    constitution: makeConstitution({
      windowStartMs: 0,
      windowEndMs: 10 * HOUR,
      tokenDripMinutes: 60,
      cooldownMs: 0,
      rngSeed: 'promise-machines',
    }),
  }, 0);
  const a = s.submitCandidate(1000, {
    author: 'p1',
    patch: rewrite(0, 1, 'Membership is open to anyone who asks.'),
    rationale: 'drift: the roster line and this one disagree',
    ...(machineAuthored ? { machineAuthored: true } : {}),
  });
  const b = s.submitCandidate(2000, {
    author: 'p2',
    patch: rewrite(0, 1, 'Membership is open to anyone the club invites.'),
    rationale: 'the other reading',
  });
  s.submitCandidate(3000, {
    author: 'p3',
    patch: rewrite(0, 3, 'Meetings happen monthly.'),
    rationale: 'a cadence',
  });
  for (const [i, p] of ['p4', 'p5', 'p6', 'p7', 'p8'].entries()) {
    if (s.getCandidate(a.id).state !== 'live') break;
    s.judge(4000 + i * 100, p, a.id, b.id, 'a');
  }
  s.tick(7000);
  return s;
}

const ROOM = Array.from({ length: 12 }, (_, i) => `p${i + 1}`);

/** Every readout a participant or a host can see, as JSON, flag stripped. */
function readouts(s: Session) {
  return {
    document: s.document(),
    version: s.currentVersion(),
    races: s.races(),
    candidates: s.allCandidates().map((c) => {
      const { machineAuthored: _flag, ...rest } = c;
      return rest;
    }),
    judgments: s.judgments(),
    backlog: s.backlog(7000),
    bounty: s.bountyBoard(),
    floor: s.adoptionFloor(),
    threshold: s.adoptionThreshold(7000),
    balances: ROOM.map((p) => s.balance(p, 7000)),
    feeds: ['p1', 'p4', 'p9'].map((p) => s.feed(p, 5, 7000)),
    final: s.finalRender(),
  };
}

describe('§10: a machine-authored patch competes by the same arithmetic as anyone', () => {
  it('the same walk with and without the flag reads identically, everywhere', () => {
    const plainSession = walk(false);
    // the walk really does carry a machine-authored patch to adoption — an
    // identical pair of *nothing happening* would prove nothing
    expect(plainSession.currentVersion()).toBe(1);
    const plain = readouts(plainSession);
    const flagged = readouts(walk(true));
    expect(JSON.stringify(flagged)).toBe(JSON.stringify(plain));
  });

  it('the flag survives the fold and changes nothing about the candidate', () => {
    const s = walk(true);
    const c = s.allCandidates().find((x) => x.author === 'p1')!;
    expect(c.machineAuthored).toBe(true);
    expect(s.allCandidates().find((x) => x.author === 'p2')!.machineAuthored).toBeUndefined();
    // …and it paid the same stake out of the same wallet as anybody's patch,
    // which is promise 3's real shape today: a machine proposal would spend
    // ⏱️'s ✏️s from its author's ledger, not 🤖's budget from anywhere.
    expect(c.stakePaid).toBe(s.allCandidates().find((x) => x.author === 'p2')!.stakePaid);
  });
});

/**
 * **What the two tests above do and do not prove.** They prove that *this*
 * candidate, on *this* walk, is treated like any other — which is promise 5
 * (*competes on the same terms*) and no more. A behavioural test cannot prove
 * the **absence** of a branch: a judge path that read `machineAuthored` under
 * some other condition would pass both of them untouched. So the invariant
 * promise 1 actually needs — *no path by which a machine proposal is counted
 * as a judgment* — is pinned structurally, by reading the source: the flag
 * appears at exactly these sites and nowhere else, so a future auditor build
 * that branches on it in `judge`, the ranking or adoption goes red here and
 * has to say what it did.
 */
describe('§10 promise 1: nothing in the engine branches on machineAuthored', () => {
  const SRC = fileURLToPath(new URL('../src/', import.meta.url));

  /** Every `<file>|<trimmed line>` in engine-core's source that names the flag. */
  function sites(): string[] {
    const out: string[] = [];
    const walkDir = (rel: string): void => {
      for (const e of readdirSync(SRC + rel, { withFileTypes: true })) {
        if (e.isDirectory()) walkDir(rel + e.name + '/');
        else if (e.name.endsWith('.ts')) {
          const lines = readFileSync(SRC + rel + e.name, 'utf8').split(/\r?\n/);
          for (const line of lines) {
            if (line.includes('machineAuthored')) out.push(`${rel}${e.name}|${line.trim()}`);
          }
        }
      }
    };
    walkDir('');
    return out.sort();
  }

  it('TRIPWIRE: the flag is five plumbing sites — declared, carried, copied', () => {
    expect(sites()).toEqual([
      'session.ts|...(event.machineAuthored ? { machineAuthored: true } : {}),',
      'session.ts|...(input.machineAuthored ? { machineAuthored: true } : {}),',
      'session.ts|machineAuthored?: boolean;',
      'types.ts|machineAuthored?: boolean;',
      'types.ts|machineAuthored?: boolean;',
    ]);
  });

  it('the label reaches no participant: it is in the log and in no served card', () => {
    const s = walk(true);
    // §10 says a machine patch is *labeled* machine-authored. Today the label
    // exists only on the engine's own `Candidate`; nothing projects it — not
    // `participant-api`, not the constitution's `view()`, not the server, not
    // the page. A machine patch is indistinguishable from a person's to
    // everybody who is not reading the event log. Filed, not fixed.
    expect(JSON.stringify(s.feed('p4', 5, 7000))).not.toMatch(/machine/i);
    expect(JSON.stringify(s.races())).not.toMatch(/machine/i);
    expect(JSON.stringify(s.finalRender())).not.toMatch(/machine/i);
  });
});

describe('§10: *not a member* — it never judges and counts toward no quorum', () => {
  function seated(machine: boolean): Session {
    const s = Session.open({
      text: DOC,
      roster: roster(6),
      constitution: makeConstitution({
        windowStartMs: 0,
        windowEndMs: 10 * HOUR,
        quorum: { form: 'share', n: 60 },
        rngSeed: 'promise-machines',
      }),
    }, 0);
    s.addParticipant(100, { id: 'auditor', handle: 'Coherence Auditor', ...(machine ? { machine: true } : {}) });
    return s;
  }

  /**
   * **A finding, not a defect anybody can hit today** — nothing seats a
   * machine, so this is vacuous in the same way the rest of 🤖 is. But
   * `Participant.machine` is a field the engine declares and never reads:
   * `eCount()` (session.ts:701) counts every non-removed, non-suspended roster
   * entry, and `adoptionFloor()` rides on it. Seat the auditor as §10 describes
   * — *a standing account* — and it raises the number of people the room needs
   * before anything can adopt, which is exactly what *counts toward no quorum*
   * promises it will not do. Green here would mean the promise is kept.
   */
  it.fails('a machine on the roster raises no quorum — it does', () => {
    expect(seated(true).adoptionFloor()).toBe(seated(false).adoptionFloor() - 1);
  });

  it('the machine flag is inert: a seated machine is a participant like any other', () => {
    // The other half of the same finding, stated the way it is true today —
    // so the pair reads as *declared and never consulted* rather than as one
    // stray failure. Nothing refuses a machine a judgment either.
    const m = seated(true);
    expect(m.adoptionFloor()).toBe(seated(false).adoptionFloor());
    expect(() => m.submitCandidate(1000, {
      author: 'auditor',
      patch: rewrite(0, 1, 'Membership is open to anyone who asks.'),
      rationale: 'drift',
      machineAuthored: true,
    })).not.toThrow();
  });

  it.todo('the auditor is a standing account with 4 tokens and no drip — no account is opened for it');
  it.todo('🤖 disabled refuses a machine-authored submission — nothing reads `enabled`');
  it.todo('something, anywhere, submits a machine-authored candidate — no submitter exists');
});
