/**
 * **A text proposal says what it is replacing** (Q1463 (1); Ed, 2026-09-19 —
 * *every proposal must carry the old wording or it is refused*). SPEC §2.1,
 * §2.4 → why: R-136.
 *
 * What this file holds, in four parts:
 *
 *   1. `attest` / `checkAttestation` as arithmetic — a replacement's `was`, an
 *      insertion's `after`, the top of the document's `null`, the exactness of
 *      the comparison, and blank lines being lines like any other;
 *   2. **the door** — `ParticipantApi.submit` refusing a patch that carries no
 *      attestation and one whose attestation is wrong, and taking one that is
 *      right. That is the hole this ruling closes: the version is current, so
 *      *targets version N* has nothing to fire on;
 *   3. **the engine's own callers are not the door** — `submitCandidate` and
 *      `decreeText` take a bare patch, which is what leaves several hundred
 *      direct-call tests and every replay unmoved;
 *   4. **nothing of it is written down** — the events carry no `was` and no
 *      `after`, whichever door made them, and a log holding an attested
 *      submission replays bit for bit.
 */
import { describe, expect, it } from 'vitest';
import { Session, makeConstitution } from '../src/session.js';
import { ParticipantApi } from '../src/participant-api.js';
import { attest, checkAttestation, isAttested, stripAttestation } from '../src/text/attest.js';
import type { Event } from '../src/types.js';
import { roster } from './helpers.js';

const HOUR = 3600_000;

const LINES = [
  '# Charter',
  'Membership is open to anyone.',
  '',
  'Decisions are made by consensus.',
];
const DOC = LINES.join('\n');

function openSession(size = 5): Session {
  return Session.open({
    text: DOC,
    roster: roster(size),
    constitution: makeConstitution({
      windowStartMs: 0, windowEndMs: 10 * HOUR, rngSeed: 'attest-seed',
      tokenDripMinutes: 60, cooldownMs: 0,
    }),
  }, 0);
}

/* -- 1 · the arithmetic --------------------------------------------------- */

describe('attest fills what a hunk is replacing (SPEC §2.1)', () => {
  it('a replacement carries the exact lines at [start, end)', () => {
    const [h] = attest(LINES, [{ start: 1, end: 2, lines: ['Membership is by invitation.'] }]);
    expect(h!.was).toEqual(['Membership is open to anyone.']);
    expect(h!.after).toBeUndefined();
  });

  it('a multi-line replacement carries one entry per line, blanks included', () => {
    const [h] = attest(LINES, [{ start: 1, end: 4, lines: ['One line instead.'] }]);
    expect(h!.was).toEqual(['Membership is open to anyone.', '', 'Decisions are made by consensus.']);
    expect(h!.was).toHaveLength(3);
  });

  it('a pure insertion carries the line it follows, and null at the top', () => {
    const [mid] = attest(LINES, [{ start: 2, end: 2, lines: ['New.'] }]);
    expect(mid!.after).toBe('Membership is open to anyone.');
    expect(mid!.was).toBeUndefined();
    const [top] = attest(LINES, [{ start: 0, end: 0, lines: ['New.'] }]);
    expect(top!.after).toBeNull();
  });

  it('an insertion at the very end follows the last line', () => {
    const [h] = attest(LINES, [{ start: LINES.length, end: LINES.length, lines: ['New.'] }]);
    expect(h!.after).toBe('Decisions are made by consensus.');
  });

  it('what it fills, it accepts', () => {
    const hunks = attest(LINES, [
      { start: 0, end: 1, lines: ['# The Charter'] },
      { start: 2, end: 2, lines: ['A new clause.'] },
    ]);
    expect(isAttested(hunks)).toBe(true);
    expect(() => checkAttestation(LINES, hunks, { required: true })).not.toThrow();
  });
});

describe('checkAttestation is the door (SPEC §2.4)', () => {
  const bare = [{ start: 1, end: 2, lines: ['Membership is by invitation.'] }];

  it('refuses a replacement with no was where it is required', () => {
    expect(() => checkAttestation(LINES, bare, { required: true }))
      .toThrow(/carries no 'was'/);
  });

  it('refuses an insertion with no after where it is required', () => {
    expect(() => checkAttestation(LINES, [{ start: 2, end: 2, lines: ['New.'] }], { required: true }))
      .toThrow(/carries no 'after'/);
  });

  it('lets a bare patch through where it is not required', () => {
    expect(() => checkAttestation(LINES, bare, { required: false })).not.toThrow();
  });

  it('refuses a wrong was, required or not — a wrong answer is not a missing one', () => {
    const wrong = [{ start: 1, end: 2, lines: ['x'], was: ['Decisions are made by consensus.'] }];
    expect(() => checkAttestation(LINES, wrong, { required: true }))
      .toThrow(/the text at lines 2–2 is not what this proposal replaces/);
    expect(() => checkAttestation(LINES, wrong, { required: false }))
      .toThrow(/is not what this proposal replaces/);
  });

  it('refuses a was of the wrong length', () => {
    expect(() => checkAttestation(LINES, [{ start: 1, end: 3, lines: ['x'], was: ['Membership is open to anyone.'] }],
      { required: true })).toThrow(/states 1 line\(s\) replaced where it replaces 2/);
  });

  it('refuses a wrong after, and a null claimed anywhere but the top', () => {
    expect(() => checkAttestation(LINES, [{ start: 2, end: 2, lines: ['x'], after: 'something else' }],
      { required: true })).toThrow(/is not what this proposal was written after/);
    expect(() => checkAttestation(LINES, [{ start: 2, end: 2, lines: ['x'], after: null }],
      { required: true })).toThrow(/is not what this proposal was written after/);
  });

  it('compares exactly — no trimming, no marker normalising', () => {
    const drifted = [{ start: 0, end: 1, lines: ['x'], was: ['#  Charter'] }];
    expect(() => checkAttestation(LINES, drifted, { required: true }))
      .toThrow(/is not what this proposal replaces/);
    const spaced = [{ start: 0, end: 1, lines: ['x'], was: ['# Charter '] }];
    expect(() => checkAttestation(LINES, spaced, { required: true }))
      .toThrow(/is not what this proposal replaces/);
  });

  it('a blank line is a line: attesting to it is right, attesting to nothing is not', () => {
    expect(() => checkAttestation(LINES, [{ start: 2, end: 3, lines: ['Something.'], was: [''] }],
      { required: true })).not.toThrow();
    expect(() => checkAttestation(LINES, [{ start: 2, end: 3, lines: ['Something.'], was: [' '] }],
      { required: true })).toThrow(/is not what this proposal replaces/);
  });

  it('stripAttestation leaves the hunk and nothing else', () => {
    const out = stripAttestation(attest(LINES, [{ start: 1, end: 2, lines: ['x'] }]));
    expect(out).toEqual([{ start: 1, end: 2, lines: ['x'] }]);
    expect(Object.keys(out[0]!)).toEqual(['start', 'end', 'lines']);
  });
});

/* -- 2 · the door a participant speaks through ---------------------------- */

describe('ParticipantApi.submit requires it (SPEC §3.3, R-136)', () => {
  it('refuses a patch that says nothing about what it replaces', () => {
    const api = new ParticipantApi(openSession(), 'p1');
    expect(() => api.submit(1000, {
      patch: { baseVersion: 0, hunks: [{ start: 1, end: 2, lines: ['Membership is by invitation.'] }] },
      rationale: 'tighter',
    })).toThrow(/carries no 'was'/);
  });

  it('takes one that states it correctly', () => {
    const api = new ParticipantApi(openSession(), 'p1');
    const { id } = api.submit(1000, {
      patch: { baseVersion: 0, hunks: attest(LINES, [{ start: 1, end: 2, lines: ['Membership is by invitation.'] }]) },
      rationale: 'tighter',
    });
    expect(id).toBeTruthy();
  });

  it('refuses the stale hunk the version guard cannot see — the whole of this ruling', () => {
    const s = openSession();
    // a line adopted above the drafter, by the pen: the version moves, and a
    // client that re-reads the version but not the lines is the ordinary case
    s.decreeText(500, {
      author: 'p1', rationale: 'notice',
      patch: { baseVersion: 0, hunks: [{ start: 1, end: 1, lines: ['Notice goes up a week before.'] }] },
    });
    const api = new ParticipantApi(s, 'p2');
    // line 1 is the new line now; the draft was written against the old one
    expect(s.currentVersion()).toBe(1);
    expect(() => api.submit(1000, {
      patch: { baseVersion: 1, hunks: [{ start: 1, end: 2,
        lines: ['Membership is by invitation.'], was: ['Membership is open to anyone.'] }] },
      rationale: 'tighter',
    })).toThrow(/is not what this proposal replaces/);
    // and the same draft carried to where its wording now stands is taken
    expect(() => api.submit(1000, {
      patch: { baseVersion: 1, hunks: [{ start: 2, end: 3,
        lines: ['Membership is by invitation.'], was: ['Membership is open to anyone.'] }] },
      rationale: 'tighter',
    })).not.toThrow();
  });

  it('a setting motion attests to nothing — there is no text to replace', () => {
    const s = openSession();
    s.setStanding(500, 'ending', { endsAtMs: 10 * HOUR });
    expect(() => new ParticipantApi(s, 'p1').submit(1000, {
      setting: { settingId: 'ending', value: { endsAtMs: 20 * HOUR } }, rationale: 'longer',
    })).not.toThrow();
  });
});

/* -- 3 · the engine's own callers are not the door ------------------------ */

describe('the engine takes a bare patch (R-136)', () => {
  it('submitCandidate does not demand one', () => {
    const s = openSession();
    expect(() => s.submitCandidate(1000, { author: 'p1', rationale: 'tighter',
      patch: { baseVersion: 0, hunks: [{ start: 1, end: 2, lines: ['Membership is by invitation.'] }] } }))
      .not.toThrow();
  });

  it('but checks one it is given', () => {
    const s = openSession();
    expect(() => s.submitCandidate(1000, { author: 'p1', rationale: 'tighter',
      patch: { baseVersion: 0, hunks: [{ start: 1, end: 2, lines: ['x'], was: ['not this'] }] } }))
      .toThrow(/is not what this proposal replaces/);
  });

  it('and so does the pen', () => {
    const s = openSession();
    expect(() => s.decreeText(1000, { author: 'p1', rationale: 'by decree',
      patch: { baseVersion: 0, hunks: [{ start: 1, end: 2, lines: ['x'], was: ['not this'] }] } }))
      .toThrow(/is not what this proposal replaces/);
    expect(() => s.decreeText(1000, { author: 'p1', rationale: 'by decree',
      patch: { baseVersion: 0, hunks: attest(LINES, [{ start: 1, end: 2, lines: ['x'] }]) } }))
      .not.toThrow();
  });
});

/* -- 4 · and none of it is written down ----------------------------------- */

describe('the attestation never reaches the log (R-136)', () => {
  const patchesIn = (log: ReadonlyArray<{ event: Event }>) => log
    .map((e) => e.event as { patch?: { hunks?: unknown[] } })
    .flatMap((ev) => ev.patch?.hunks ?? []);

  it('a submission and a decree both write bare hunks', () => {
    const s = openSession();
    new ParticipantApi(s, 'p1').submit(1000, {
      patch: { baseVersion: 0, hunks: attest(LINES, [{ start: 1, end: 2, lines: ['Membership is by invitation.'] }]) },
      rationale: 'tighter',
    });
    s.decreeText(2000, { author: 'p2', rationale: 'by decree',
      patch: { baseVersion: 0, hunks: attest(LINES, [{ start: 3, end: 3, lines: ['A new clause.'] }]) } });
    const hunks = patchesIn(s.log);
    expect(hunks.length).toBeGreaterThan(1);
    for (const h of hunks) expect(Object.keys(h as object).sort()).toEqual(['end', 'lines', 'start']);
    expect(JSON.stringify(s.log)).not.toMatch(/"was"|"after"/);
  });

  it('and a log holding one replays bit for bit', () => {
    const s = openSession();
    new ParticipantApi(s, 'p1').submit(1000, {
      patch: { baseVersion: 0, hunks: attest(LINES, [{ start: 1, end: 2, lines: ['Membership is by invitation.'] }]) },
      rationale: 'tighter',
    });
    const replayed = Session.replay([...s.log]);
    expect(replayed.log).toEqual(s.log);
    expect(replayed.document()).toBe(s.document());
  });
});
