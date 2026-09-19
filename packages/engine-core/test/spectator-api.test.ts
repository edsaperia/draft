/**
 * The spectator API (backlog 42, Q1466): a strictly-public projection. What
 * this file holds is the two halves of that sentence — the feed says what
 * was proposed and what passed, with the place each change bites; and it
 * says nothing else, whatever the log holds.
 */
import { describe, expect, it } from 'vitest';
import { Session, makeConstitution } from '../src/session.js';
import { SpectatorApi } from '../src/spectator-api.js';
import { splitLines } from '../src/text/diff.js';
import { applyPatch } from '../src/text/patch.js';
import { roster } from './helpers.js';

const HOUR = 3600_000;

const DOC = [
  '# Charter',
  'Membership is open to anyone.',
  '',
  '## Decisions',
  'Decisions are made by consensus.',
  'Meetings happen when someone calls one.',
].join('\n');

function open(overrides: Record<string, unknown> = {}): Session {
  return Session.open({
    text: DOC,
    roster: roster(5),
    constitution: makeConstitution({
      windowStartMs: 0, windowEndMs: 1000 * HOUR, rngSeed: 'feed-seed',
      tokenDripMinutes: 60, cooldownMs: 0, ...overrides,
    }),
  }, 0);
}

const rewrite = (base: number, line: number, text: string) =>
  ({ baseVersion: base, hunks: [{ start: line, end: line + 1, lines: [text] }] });
const insert = (base: number, at: number, text: string) =>
  ({ baseVersion: base, hunks: [{ start: at, end: at, lines: [text] }] });

/** p2 seconds `id` against the current text — the author and one other is the floor — and the batch runs. */
function carry(s: Session, id: string, t: number): void {
  const race = s.races(t).find((r) => r.members.includes(id))!;
  s.judge(t, 'p2', id, race.incumbentId, 'a');
  s.tick(t + 1);
}

describe('the spectator feed (Q1466)', () => {
  it('a proposal is an entry: the clause as it stood, the wording put, and where', () => {
    const s = open();
    const { id } = s.submitCandidate(100, {
      author: 'p1', patch: rewrite(0, 4, 'Decisions are made by a vote.'), rationale: 'consensus stalls',
    });
    const feed = new SpectatorApi(s).feed();
    expect(feed).toHaveLength(1);
    expect(feed[0]).toMatchObject({
      t: 100, kind: 'proposed', candidateId: id, rationale: 'consensus stalls',
      changes: [{
        heading: 'Decisions', above: null, below: 'Meetings happen when someone calls one.',
        before: ['Decisions are made by consensus.'],
        after: ['Decisions are made by a vote.'],
      }],
    });
  });

  it('an insertion carries the line it follows, and a blank line is never that line', () => {
    const s = open();
    s.submitCandidate(100, { author: 'p1', patch: insert(0, 6, 'Minutes are kept.'), rationale: 'r' });
    s.submitCandidate(101, { author: 'p2', patch: insert(0, 3, 'Members pay no dues.'), rationale: 'r' });
    const [end, mid] = new SpectatorApi(s).feed();
    expect(end!.changes[0]).toEqual({
      heading: 'Decisions', above: 'Meetings happen when someone calls one.', below: null,
      before: [], after: ['Minutes are kept.'],
    });
    // line 3 is the second heading; above it stand a blank and the first clause
    // … and below it the next section's heading, which is nobody's context
    expect(mid!.changes[0]).toMatchObject({ heading: 'Charter', above: 'Membership is open to anyone.', below: null });
  });

  it('an adoption is a second entry, read against the text it changed', () => {
    const s = open();
    // a proposal written on version 0 …
    const { id: late } = s.submitCandidate(100, {
      author: 'p1', patch: rewrite(0, 5, 'Meetings happen monthly.'), rationale: 'a rhythm',
    });
    // … and an insertion above it that passes first, moving its line
    const { id: first } = s.submitCandidate(101, {
      author: 'p4', patch: insert(0, 2, 'Members pay no dues.'), rationale: 'plainly',
    });
    carry(s, first, 200);
    carry(s, late, 300);
    const feed = new SpectatorApi(s).feed();
    expect(feed.map((e) => [e.kind, e.candidateId])).toEqual([
      ['proposed', late], ['proposed', first], ['adopted', first], ['adopted', late],
    ]);
    // the proposal's entry still says what its author saw
    expect(feed[0]!.changes[0]!.before).toEqual(['Meetings happen when someone calls one.']);
    // and the adoption's says what the membership changed, a line further down
    expect(feed[3]!.changes[0]).toMatchObject({
      heading: 'Decisions',
      before: ['Meetings happen when someone calls one.'],
      after: ['Meetings happen monthly.'],
    });
    // **a passed entry carries its decision's numbers and nothing else does**:
    // the author and the seconder voted, both preferred it, nobody ran out of
    // time, and it took from its proposal to the judgment that carried it (the
    // batch runs at once on a cooldown of nothing)
    expect(feed[2]!.outcome).toEqual({ voted: 2, approvals: 2, floor: 2, abstained: 0, tookMs: 200 - 101 });
    expect(feed[3]!.outcome).toMatchObject({ voted: 2, tookMs: 300 - 100 });
    expect(feed[0]!.outcome).toBeUndefined();
    expect(feed[1]!.outcome).toBeUndefined();
    // every adoption entry, applied to the version before it, is the version after
    for (const e of s.log) {
      if (e.event.type !== 'adopted') continue;
      const c = s.getCandidate(e.event.candidateId);
      const v = e.event.newVersion;
      expect(applyPatch(splitLines(s.documentAt(v - 1)), c.patch!.hunks))
        .toEqual(splitLines(s.documentAt(v)));
    }
  });

  // **a withdrawn proposal leaves the feed** (issue #68 finding 3): it stood
  // on a projector for ever as a live-looking *New proposal*, there being no
  // branch for the withdrawal at all
  it('a withdrawn proposal leaves the feed, and its neighbours stay', () => {
    const s = open();
    const { id } = s.submitCandidate(100, {
      author: 'p1', patch: rewrite(0, 4, 'Decisions are made by a vote.'), rationale: 'consensus stalls',
    });
    s.submitCandidate(101, { author: 'p2', patch: rewrite(0, 1, 'Membership is by invitation.'), rationale: 'r' });
    expect(new SpectatorApi(s).feed()).toHaveLength(2);
    s.withdraw(102, id);
    const feed = new SpectatorApi(s).feed();
    expect(feed).toHaveLength(1);
    expect(feed[0]).toMatchObject({ kind: 'proposed', rationale: 'r' });
    expect(JSON.stringify(feed)).not.toContain('consensus stalls');
  });

  it('names an author only where `authorVisible` does', () => {
    const s = open({ authorshipVisibility: 'anonymous' });
    s.submitCandidate(100, { author: 'p1', patch: rewrite(0, 1, 'Membership is by invitation.'), rationale: 'r' });
    s.submitCandidate(101, {
      author: 'p2', patch: rewrite(0, 4, 'Decisions are made by a vote.'), rationale: 'r', signed: true,
    });
    const feed = new SpectatorApi(s).feed();
    expect(feed.map((e) => e.author)).toEqual([null, 'p2']);
  });

  it('the Founder’s amendment is an entry, and names nobody', () => {
    const s = open({ authorshipVisibility: 'public' });
    s.decreeText(100, { author: 'the-clerk', patch: rewrite(0, 1, 'Membership is closed.'), rationale: 'for now' });
    const feed = new SpectatorApi(s).feed();
    expect(feed).toHaveLength(1);
    expect(feed[0]).toMatchObject({ kind: 'decreed', author: null, rationale: 'for now' });
  });

  it('says nothing about direction: no judgment, count, probability or floor reaches an entry', () => {
    const s = open({ quorum: { form: 'count', n: 3 } });
    const { id } = s.submitCandidate(100, {
      author: 'p1', patch: rewrite(0, 4, 'Decisions are made by a vote.'), rationale: 'r',
    });
    const before = JSON.stringify(new SpectatorApi(s).feed());
    const race = s.races(200).find((r) => r.members.includes(id))!;
    s.judge(200, 'p2', id, race.incumbentId, 'a');
    s.judge(201, 'p3', id, race.incumbentId, 'b');
    // two judgments later the feed is byte for byte what it was
    expect(JSON.stringify(new SpectatorApi(s).feed())).toBe(before);
    const keys = new Set<string>();
    for (const e of new SpectatorApi(s).feed()) for (const k of Object.keys(e)) keys.add(k);
    expect([...keys].sort()).toEqual(['author', 'candidateId', 'changes', 'kind', 'rationale', 't']);
  });

  it('a setting motion makes no entry', () => {
    const s = Session.open({
      text: DOC, roster: roster(5),
      constitution: makeConstitution({ windowStartMs: 0, windowEndMs: 1000 * HOUR, rngSeed: 'x', cooldownMs: 0 }),
      settings: { rate: { dripMinutes: 60 } },
    }, 0);
    s.submitCandidate(100, { author: 'p1', setting: { settingId: 'rate', value: { dripMinutes: 30 } }, rationale: 'faster' });
    expect(new SpectatorApi(s).feed()).toEqual([]);
  });
});
