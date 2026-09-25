/**
 * Setting races (SPEC §9.6 v0.53, Q390): an ordinary motion is the race
 * machinery whole — the standing value is the incumbent, rival values join
 * the same race, entries stake and refund like text proposals, and a
 * standing-value change mid-race is a ground shift (§4.4). The engine
 * records the verdict and never applies the value: the host applies it via
 * setStanding once any §9.7 assent is given.
 */
import { describe, expect, it } from 'vitest';
import { Session, makeConstitution } from '../src/session.js';
import { ParticipantApi } from '../src/participant-api.js';
import { TEXT, roster } from './helpers.js';

const HOUR = 3600_000;

function openWithSettings(overrides: Record<string, unknown> = {}): Session {
  return Session.open(
    {
      text: TEXT,
      roster: roster(5),
      constitution: makeConstitution({
        windowStartMs: 0,
        windowEndMs: 10 * HOUR,
        tokenDripMinutes: 60,
        cooldownMs: 0,
        rngSeed: 'setting-races',
        ...overrides,
      }),
      settings: {
        ending: { endsAtMs: 10 * HOUR },
        rate: { grant: 4, cap: 8, dripMinutes: 240 },
      },
    },
    0,
  );
}

describe('submission guards (Q390: equality is decidable, so dedup collapses to it)', () => {
  it('rejects unknown settings, the standing value, and an identical live value', () => {
    const s = openWithSettings();
    expect(() =>
      s.submitCandidate(1000, {
        author: 'p1',
        setting: { settingId: 'nope', value: 1 },
        rationale: 'r',
      }),
    ).toThrow(/unknown setting/);
    expect(() =>
      s.submitCandidate(1000, {
        author: 'p1',
        setting: { settingId: 'ending', value: { endsAtMs: 10 * HOUR } },
        rationale: 'r',
      }),
    ).toThrow(/already stands/);
    s.submitCandidate(1000, {
      author: 'p1',
      setting: { settingId: 'ending', value: { endsAtMs: 20 * HOUR } },
      rationale: 'later',
    });
    expect(() =>
      s.submitCandidate(2000, {
        author: 'p2',
        setting: { settingId: 'ending', value: { endsAtMs: 20 * HOUR } },
        rationale: 'me too',
      }),
    ).toThrow(/co-sign/);
    expect(() =>
      s.submitCandidate(2000, { author: 'p2', rationale: 'r' }),
    ).toThrow(/exactly one/);
  });
});

describe('a motion carries when it is on top, and the verdict is not the application', () => {
  it('adopts on top of the field with the floor met, refunds the stake, and leaves text and standing untouched', () => {
    const s = openWithSettings();
    const { id, raceId } = s.submitCandidate(1000, {
      author: 'p1',
      setting: { settingId: 'ending', value: { endsAtMs: 20 * HOUR } },
      rationale: 'a week is not enough',
    });
    const race = s.races().find((r) => r.id === raceId)!;
    expect(race.settingId).toBe('ending');
    expect(race.contested).toEqual([]);
    // The author's derived preference is a mover (§3.3/§8.2), so one more
    // voice meets F = ceil(5/3) = 2, and two voices for put the value on top
    // of the field.
    const events = s.judge(2000, 'p2', id, race.incumbentId, 'a');
    expect(events.some((e) => e.type === 'adopted')).toBe(true);
    expect(s.getCandidate(id).state).toBe('adopted');
    // The verdict is recorded; nothing is applied by the engine (Q390).
    expect(s.document()).toBe(TEXT);
    expect(s.currentVersion()).toBe(0);
    expect(s.standing('ending')).toEqual({ endsAtMs: 10 * HOUR });
    // The stake back, and exactly it, like any adoption (§7, Q1454).
    expect(s.balance('p1', 2000)).toBe(4);
  });

  it('withdrawal hands the stake back whole (§3.3a)', () => {
    const s = openWithSettings();
    const { id } = s.submitCandidate(1000, {
      author: 'p1',
      setting: { settingId: 'rate', value: { grant: 6, cap: 8, dripMinutes: 240 } },
      rationale: 'more to start',
    });
    expect(s.balance('p1', 1000)).toBe(3);
    s.withdraw(2000, id);
    expect(s.balance('p1', 2000)).toBe(4);
  });
});

describe('rival values and the ground shift (Q390 + §4.4)', () => {
  it('rival values join one race; a standing-set locks old judgments and re-opens pairs', () => {
    // A count quorum of 4 holds the floor above the movers so nothing
    // adopts mid-walk (§4.2 riding on a motion race).
    const s = openWithSettings({ quorum: { form: 'count', n: 4 } });
    const { id: a, raceId } = s.submitCandidate(1000, {
      author: 'p1',
      setting: { settingId: 'ending', value: { endsAtMs: 20 * HOUR } },
      rationale: 'two weeks',
    });
    const { id: b, raceId: raceIdB } = s.submitCandidate(2000, {
      author: 'p2',
      setting: { settingId: 'ending', value: { endsAtMs: 15 * HOUR } },
      rationale: 'a middle way',
    });
    expect(raceIdB).toBe(raceId); // propose-C over values: one race
    const before = s.races().find((r) => r.id === raceId)!;
    expect(before.members).toEqual([a, b]);
    s.judge(3000, 'p3', a, before.incumbentId, 'a');
    expect(s.races().find((r) => r.id === raceId)!.comparisons).toBe(1);
    expect(s.races().find((r) => r.id === raceId)!.distinctMovers).toBe(3);

    // A carried amendment changes what stands (the host relays it): the
    // race's ground shifts — same race, fresh questions.
    s.setStanding(4000, 'ending', { endsAtMs: 12 * HOUR });
    const after = s.races().find((r) => r.id === raceId)!;
    expect(after.incumbentId).not.toBe(before.incumbentId);
    expect(after.comparisons).toBe(0); // measured evidence restarted
    const locked = s
      .judgments()
      .find((j) => j.participantId === 'p3' && j.kind === 'edge');
    expect(locked?.locked).toBe(true);
    // The pair is a fresh question for everyone, p3 included (§4.4).
    expect(() => s.judge(5000, 'p3', a, after.incumbentId, 'b')).not.toThrow();
  });
});

describe('the close (Q390: reported for the host, never applied)', () => {
  it('finalRender lists clearing setting leaders in appliedSettings', () => {
    // No mid-session adoption: **the cooldown is the brake** (Q1362, R-116),
    // the ramp having held this back until v0.128 (high early, low at the
    // close). One motion carries at t = 500 and starts the cooldown clock; the
    // motion under test is ready and still waiting when the clock runs out,
    // and the close's own batch runs regardless of the cooldown (§4.6).
    const s = openWithSettings({ cooldownMs: 24 * HOUR });
    const first = s.submitCandidate(400, {
      author: 'p1',
      setting: { settingId: 'ending', value: { endsAtMs: 20 * HOUR } },
      rationale: 'later',
    });
    s.judge(500, 'p2', first.id,
      s.races().find((r) => r.id === first.raceId)!.incumbentId, 'a');
    expect(s.allCandidates().find((c) => c.id === first.id)!.state).toBe('adopted');
    const { id, raceId } = s.submitCandidate(1000, {
      author: 'p1',
      setting: { settingId: 'rate', value: { grant: 6, cap: 8, dripMinutes: 240 } },
      rationale: 'more to start',
    });
    const inc = s.races().find((r) => r.id === raceId)!.incumbentId;
    s.judge(2000, 'p2', id, inc, 'a');
    s.judge(3000, 'p3', id, inc, 'a');
    expect(s.allCandidates().find((c) => c.id === id)!.state).toBe('live');
    s.close(10 * HOUR);
    const render = s.finalRender();
    expect(render.text).toBe(TEXT);
    expect(render.applied).toEqual([]);
    expect(render.appliedSettings).toEqual([{ settingId: 'rate', candidateId: id }]);
  });
});

describe('the blind card renders values (participant-api, Q390)', () => {
  it('serves the pair with setting payloads on both options', () => {
    const s = openWithSettings({ quorum: { form: 'count', n: 4 } });
    const api = new ParticipantApi(s, 'p3');
    const submitter = new ParticipantApi(s, 'p1');
    submitter.submit(1000, {
      setting: { settingId: 'ending', value: { endsAtMs: 20 * HOUR } },
      rationale: 'two weeks',
    });
    const cards = api.nextCards(3, 2000);
    expect(cards.length).toBeGreaterThan(0);
    const card = cards[0]!;
    const options = [card.a, card.b];
    const incumbent = options.find((o) => o.id.startsWith('inc:'))!;
    const challenger = options.find((o) => !o.id.startsWith('inc:'))!;
    expect(incumbent.setting).toEqual({ settingId: 'ending', value: { endsAtMs: 10 * HOUR } });
    expect(challenger.setting).toEqual({ settingId: 'ending', value: { endsAtMs: 20 * HOUR } });
    expect(challenger.changes).toEqual([]);
    // Judging through the api works end to end.
    api.judge(3000, card, 'a');
    expect(api.myJudgments().length).toBe(1);
  });
});

describe('replay (SPEC §11)', () => {
  it('reproduces a mixed text-and-setting session bit-identically', () => {
    const s = openWithSettings();
    s.submitCandidate(1000, {
      author: 'p1',
      setting: { settingId: 'ending', value: { endsAtMs: 20 * HOUR } },
      rationale: 'later',
    });
    s.submitCandidate(2000, {
      author: 'p2',
      patch: {
        baseVersion: 0,
        hunks: [{ start: 0, end: 1, lines: ['The club meets on Wednesdays.'] }],
      },
      rationale: 'wednesdays',
    });
    s.setStanding(3000, 'ending', { endsAtMs: 12 * HOUR });
    const r = Session.replay(s.log.slice());
    expect(r.rollingHash()).toBe(s.rollingHash());
    expect(r.standing('ending')).toEqual({ endsAtMs: 12 * HOUR });
    expect(r.races().length).toBe(s.races().length);
  });
});

/**
 * **One rule everywhere** (Q1538, Q1539 ruling 4 → why: R-142, R-143): rival
 * values on one setting are a race like any other, so the leader waits on its
 * rival value, and a near-copy of a losing value does not lift it.
 */
describe('rival values wait on each other, and the Smith set reads them (v0.142)', () => {
  it('a value at its floor waits until it is measured against the rival value', () => {
    const s = openWithSettings();
    const five = s.submitCandidate(1000, { author: 'p1', rationale: 'five',
      setting: { settingId: 'rate', value: { grant: 5, cap: 8, dripMinutes: 240 } } }).id;
    const six = s.submitCandidate(1100, { author: 'p2', rationale: 'six',
      setting: { settingId: 'rate', value: { grant: 6, cap: 8, dripMinutes: 240 } } }).id;
    const race = s.races().find((r) => r.members.includes(five))!;
    s.judge(2000, 'p3', five, race.incumbentId, 'a');
    expect(s.getCandidate(five).state).toBe('live');
    expect(s.races().find((r) => r.members.includes(five))!.measureShort).toHaveLength(1);
    s.judge(2100, 'p3', five, six, 'a');
    s.judge(2200, 'p4', five, six, 'a');
    expect(s.getCandidate(five).state).toBe('adopted');
  });

  it('a near-copy of a value the room refused does not lift it over what stands', () => {
    // the clone field on a setting: 2 prefer X>Y>standing, 3 standing>X>Y
    const s = openWithSettings({ cooldownMs: HOUR });
    const z = s.submitCandidate(100, { author: 'p1', rationale: 'z',
      setting: { settingId: 'ending', value: { endsAtMs: 9 * HOUR } } }).id;
    s.judge(200, 'p2', z, s.races().find((r) => r.members.includes(z))!.incumbentId, 'a');
    expect(s.getCandidate(z).state).toBe('adopted');
    const X = s.submitCandidate(1000, { author: 'p1', rationale: 'x',
      setting: { settingId: 'rate', value: { grant: 6, cap: 8, dripMinutes: 240 } } }).id;
    const Y = s.submitCandidate(1010, { author: 'p2', rationale: 'y',
      setting: { settingId: 'rate', value: { grant: 6, cap: 9, dripMinutes: 240 } } }).id;
    const c = s.races().find((r) => r.members.includes(X))!.incumbentId;
    const prefs = ['XYc', 'XYc', 'cXY', 'cXY', 'cXY'];
    let t = 1100;
    prefs.forEach((p, m) => {
      const rank = p.split('');
      const id = { X, Y, c } as Record<string, string>;
      for (const [a, b] of [['X', 'Y'], ['X', 'c'], ['Y', 'c']] as const) {
        s.judge((t += 1), `p${m + 1}`, id[a]!, id[b]!, rank.indexOf(a) < rank.indexOf(b) ? 'a' : 'b');
      }
    });
    const r = s.races(t).find((x) => x.members.includes(X))!;
    expect(r.smith).toEqual([c]);
    expect(r.leaderOnTop).toBe(false);
    s.tick(200 + HOUR + 1);
    expect(s.getCandidate(X).state).toBe('retired');
    expect(s.getCandidate(Y).state).toBe('retired');
  });
});
