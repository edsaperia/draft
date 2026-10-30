// The Rules' closing line's counts (Q464, issue #230): `closeTally` counts
// the membership at the close and every text proposal by how it ended —
// never a rules motion (it shares the engine's candidate store) and never a
// ✒️ decree (an amendment, not a proposal), and the four outcomes always add
// up to the whole.
import { describe, expect, it } from 'vitest';
import { EngineBridge } from '../src/engine-bridge.js';
import { buildConstituted } from './helpers.js';

describe('closeTally (Q464)', () => {
  it('counts text proposals by outcome, and nothing else', () => {
    const { s, bo, cy } = buildConstituted({ keepText: { unilateral: true } });
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'close-tally' });
    // a ✒️ decree: the document changed, and nobody proposed anything
    bridge.penText(5, 'ada', { baseVersion: bridge.engine.currentVersion(),
      hunks: [{ start: 0, end: 1, lines: ['The clubhouse shall be kept open daily.'] }] }, 'tidy');
    const v = bridge.engine.currentVersion();
    const one = bridge.proposeText(10, bo, { baseVersion: v,
      hunks: [{ start: 0, end: 1, lines: ['The clubhouse shall be open at night.'] }] }, 'nights').id;
    const two = bridge.proposeText(11, cy, { baseVersion: v,
      hunks: [{ start: 0, end: 1, lines: ['The clubhouse shall be open at weekends.'] }] }, 'weekends').id;
    bridge.withdrawText(12, cy, two);
    // a rules motion, running at the close and held there: not a proposal here
    bridge.openSetMotion(13, bo, 'ending', { endsAtMs: 2_000_000 }, 'longer');
    expect(bridge.engine.allCandidates().length).toBe(4);
    bridge.close(1_000_000);

    const t = bridge.closeTally();
    expect(t).toEqual({ members: 3, proposals: 2, passed: 0, failed: 0, withdrawn: 1, open: 1 });
    expect(bridge.engine.getCandidate(one).state).toBe('undecided');
    expect(t.passed + t.failed + t.withdrawn + t.open).toBe(t.proposals);
  });

  it('counts an adoption as passed, and a document with no proposals as none', () => {
    const { s, bo, cy } = buildConstituted();
    const bridge = new EngineBridge(s, { t: 3, rngSeed: 'close-tally-2' });
    const id = bridge.proposeText(10, bo, { baseVersion: bridge.engine.currentVersion(),
      hunks: [{ start: 0, end: 1, lines: ['Open every day.'] }] }, 'daily').id;
    const race = bridge.engine.races().find((r) => r.members.includes(id))!;
    bridge.judge(20, cy, id, race.incumbentId, 'a');
    bridge.close(1_000_000);
    const t = bridge.closeTally();
    expect(t.proposals).toBe(1);
    expect(t.passed + t.failed + t.withdrawn + t.open).toBe(1);
    expect(bridge.engine.getCandidate(id).state).toBe('adopted');
    expect(t.passed).toBe(1);

    const quiet = buildConstituted({ clerk: true });
    const b2 = new EngineBridge(quiet.s, { t: 3, rngSeed: 'close-tally-3' });
    b2.close(1_000_000);
    // a clerk founder is not a member: bo and cy
    expect(b2.closeTally()).toEqual({ members: 2, proposals: 0, passed: 0, failed: 0, withdrawn: 0, open: 0 });
  });
});
