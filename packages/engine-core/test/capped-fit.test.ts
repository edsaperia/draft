/**
 * **The cap mark** (SPEC §4.2, R-051; Q945, Ed 2026-08-27). A ranking fit that
 * ran out of its 200-iteration cap with the gradient still moving produces a
 * `probBeats` that looks exactly like a healthy one — and until this, the
 * document changed on it in silence. Ed took (a): the adoption lands on the
 * probability the fit produced, and the receipt says so.
 *
 * The three things this file holds. An ordinary adoption carries **no
 * `cappedFit` key at all** — absent, not `undefined`, which is the whole of the
 * compatibility claim: every log already on disk replays byte for byte. A
 * capped one carries it with its two numbers. And an adoption that went through
 * the convenor's park replays it from `c.awaiting`, so the shielded
 * adoption — the one that took a human decision and is therefore the likeliest
 * to be read afterwards — is not the one receipt that lies by omission.
 *
 * Reaching a capped fit honestly is the awkward part: `fitRaceMembers` calls
 * `fitDavidson(ids, comps)` with no options, so there is no seam to lower
 * `maxIterations` through — and adding one would be a test-only branch in
 * production code. So the module is mocked to **delegate to the real
 * `fitDavidson`** and rewrite only its report: every number the room decides on
 * stays the one the real optimiser produced, and only the fit's account of how
 * it stopped is forced.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Fit } from '../src/ranking/types.js';
import { Session, makeConstitution } from '../src/session.js';
import { ParticipantApi } from '../src/participant-api.js';
import { roster } from './helpers.js';

/**
 * `vi.hoisted`, because `vi.mock` is lifted above the imports and its factory
 * runs while they load — a plain `const` up here would still be in its
 * temporal dead zone by then.
 *
 * `forceCap` is off by default, so every test in this file that does not ask
 * for a capped fit runs on the real report. Set it and the very next fit says
 * it ran out of iterations; the numbers it ran out *on* are the real ones.
 * `CAP` is `maxIterations`' default in `davidson.ts`, and `GRAD_MAX` sits
 * comfortably above its 1e-9 tolerance.
 */
const M = vi.hoisted(() => ({ forceCap: false, CAP: 200, GRAD_MAX: 3.5e-4 }));
const { CAP, GRAD_MAX } = M;

vi.mock('../src/ranking/davidson.js', async (importOriginal) => {
  const real = await importOriginal<typeof import('../src/ranking/davidson.js')>();
  return {
    ...real,
    fitDavidson: (...args: Parameters<typeof real.fitDavidson>): Fit => {
      const fit = real.fitDavidson(...args);
      if (!M.forceCap) return fit;
      return { ...fit, stop: 'max-iterations', iterations: M.CAP, gradMax: M.GRAD_MAX,
        converged: false };
    },
  };
});

const HOUR = 3600_000;

const DOC = [
  '# Charter',
  'Membership is open to anyone.',
  'Decisions are made by consensus.',
].join('\n');

function openSession(overrides: Record<string, unknown> = {}, size = 5) {
  return Session.open({
    text: DOC,
    roster: roster(size),
    constitution: makeConstitution({
      windowStartMs: 0,
      windowEndMs: 10 * HOUR,
      rngSeed: 'capped-seed',
      tokenDripMinutes: 60,
      cooldownMs: 0,
      ...overrides,
    }),
  }, 0);
}

const rewrite = (base: number, line: number, text: string) =>
  ({ baseVersion: base, hunks: [{ start: line, end: line + 1, lines: [text] }] });

/** Submit one proposal and give the room's single judgment for it. */
function proposeAndJudge(s: Session) {
  const { id, raceId } = s.submitCandidate(50, {
    author: 'p2',
    patch: rewrite(s.currentVersion(), 2, 'Decisions are made by a show of hands.'),
    rationale: 'hands',
  });
  const race = s.races().find((r) => r.id === raceId)!;
  s.judge(60, 'p3', id, race.incumbentId, 'a');
  return id;
}

const adoptions = (s: Session) =>
  s.log.map((e) => e.event).filter((e) => e.type === 'adopted');

afterEach(() => { M.forceCap = false; });

describe('the cap mark on an adoption (SPEC §4.2, R-051)', () => {
  it('is absent — not undefined — on an adoption whose fit converged', () => {
    const s = openSession();
    proposeAndJudge(s);
    const [adopted] = adoptions(s);
    expect(adopted).toBeDefined();
    // the key is not there at all: `toHaveProperty` would pass on an
    // `undefined` value, and an `undefined` value is what would move every
    // existing log's bytes
    expect(Object.keys(adopted!)).not.toContain('cappedFit');
  });

  it('carries the cap and the gradient where the fit ran out of iterations', () => {
    const s = openSession();
    M.forceCap = true;
    proposeAndJudge(s);
    const [adopted] = adoptions(s);
    expect(adopted).toMatchObject({
      type: 'adopted',
      cappedFit: { iterations: CAP, gradMax: GRAD_MAX },
    });
    // and the decision stands: the document changed on the probability the
    // fit produced, which is the whole of Ed's answer (a)
    expect(s.document()).toContain('a show of hands');
  });

  it('marks a setting race too — the same fit decided it', () => {
    const s = openSession();
    s.setStanding(10, 'bar', { pct: 80 });
    M.forceCap = true;
    const { id, raceId } = s.submitCandidate(50, {
      author: 'p2', setting: { settingId: 'bar', value: { pct: 70 } }, rationale: 'lower',
    });
    const race = s.races().find((r) => r.id === raceId)!;
    s.judge(60, 'p3', id, race.incumbentId, 'a');
    const [adopted] = adoptions(s);
    // a setting race carries no patch and bumps no version, and still says so
    expect(adopted).toMatchObject({ cappedFit: { iterations: CAP, gradMax: GRAD_MAX } });
  });

  it('replays a capped adoption bit for bit', () => {
    const s = openSession();
    M.forceCap = true;
    proposeAndJudge(s);
    const r = Session.replay(s.log);
    expect(r.rollingHash()).toBe(s.rollingHash());
    expect(r.document()).toBe(s.document());
  });
});

describe('the cap mark through the 🛡️ park (R-056 + R-051)', () => {
  it('is recorded at the park and replayed by assent accept', () => {
    const s = openSession({ textAssent: true });
    M.forceCap = true;
    const id = proposeAndJudge(s);
    expect(s.getCandidate(id).state).toBe('awaiting-assent');
    const parked = s.log.map((e) => e.event)
      .find((e) => e.type === 'candidate-awaiting-assent');
    expect(parked).toMatchObject({ cappedFit: { iterations: CAP, gradMax: GRAD_MAX } });
    // the fit the convenor's answer arrives on is irrelevant: the mark, like
    // `p` and `threshold`, is the one recorded at the park
    M.forceCap = false;
    s.assent(90, id, 'accept');
    const [adopted] = adoptions(s);
    expect(adopted).toMatchObject({ cappedFit: { iterations: CAP, gradMax: GRAD_MAX } });
  });

  it('a park on a converged fit stays absent all the way through the accept', () => {
    const s = openSession({ textAssent: true });
    const id = proposeAndJudge(s);
    const parked = s.log.map((e) => e.event)
      .find((e) => e.type === 'candidate-awaiting-assent')!;
    expect(Object.keys(parked)).not.toContain('cappedFit');
    s.assent(90, id, 'accept');
    expect(Object.keys(adoptions(s)[0]!)).not.toContain('cappedFit');
  });
});

describe('the cap mark out through the participant API', () => {
  it('reaches `outcomes()` on the adopted entry, and only where it was set', () => {
    const plain = openSession();
    proposeAndJudge(plain);
    const [ordinary] = new ParticipantApi(plain, 'p1').outcomes()
      .filter((o) => o.outcome === 'adopted');
    expect(Object.keys(ordinary!)).not.toContain('cappedFit');

    const s = openSession();
    M.forceCap = true;
    proposeAndJudge(s);
    const [capped] = new ParticipantApi(s, 'p1').outcomes()
      .filter((o) => o.outcome === 'adopted');
    expect(capped).toMatchObject({ cappedFit: { iterations: CAP, gradMax: GRAD_MAX } });
  });
});
