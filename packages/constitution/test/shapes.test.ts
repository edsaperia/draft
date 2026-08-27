/**
 * **The founder chooses a shape before the birth** (entry 166). A shape's
 * values are folded at `open` as the convenor's own pre-start sets — given,
 * never defaulted — so what this locks is the whole of that claim: every
 * shaped setting stays convenor-held with both powers and its question shut,
 * nothing is owed, `view()` says which clauses are still the shape's, and
 * the mark leaves as clauses are touched and at 🍾. `open` without a shape
 * emits exactly one event, as it always did.
 */
import { describe, expect, it } from 'vitest';
import { ConstitutionSession } from '../src/session.js';
import { SHAPED, SHAPES, UNSHAPED, shapeOf } from '../src/shapes.js';
import { CATALOGUE, entryOf, validateFor } from '../src/catalogue.js';
import { view } from '../src/view.js';
import type { SettingId } from '../src/catalogue.js';
import type { ShapeName } from '../src/shapes.js';

const open = (shape?: ShapeName) => ConstitutionSession.open({
  title: 'Hollow Oak Club Charter', slug: 'hollow-oak',
  convenor: { id: 'ada', email: 'ada@example.org', isMember: true },
  ...(shape === undefined ? {} : { shape }),
}, 0);

const shapedOf = (s: ConstitutionSession) =>
  Object.fromEntries(view(s, 'ada').settings.map((x) => [x.setting, x.shaped])) as
    Record<SettingId, boolean>;

describe('the shape table', () => {
  it('every row sets every shaped id, a valid value, and nothing unavoidable', () => {
    for (const row of SHAPES) {
      for (const id of SHAPED) expect(row.sets[id], `${row.name} sets ${id}`).toBeDefined();
      for (const [id, v] of Object.entries(row.sets)) {
        expect(validateFor(entryOf(id as SettingId), v), `${row.name}.${id}`).toBeNull();
        expect(UNSHAPED, `${row.name} names ${id}`).not.toContain(id);
        expect([...SHAPED, 'ending'], `${row.name} names ${id}`).toContain(id);
      }
      for (const h of row.hides) expect(Object.keys(row.sets)).toContain(h);
      expect(row.say.length).toBeLessThanOrEqual(200);
      // a perpetual row fixes 🪜; a row with a unit leaves ⏰ for the card
      if (row.unit === null) {
        expect(row.sets.ending).toEqual({ endsAtMs: null });
        expect(row.sets.pace).toEqual({ shape: 'fixed' });
      } else expect(row.sets.ending).toBeUndefined();
    }
    expect(() => shapeOf('nonsense')).toThrow();
  });
});

describe('a shape is folded as the founder’s own sets', () => {
  it('leaves every shaped setting convenor-held, both powers, shut, and owed to nobody', () => {
    const s = open('meeting');
    for (const id of SHAPED) {
      const st = s.settingState(id);
      expect(st.settledBy, id).toBe('convenor');
      expect(st.holder, id).toBe('convenor');
      expect(st.powers, id).toEqual({ unilateral: true, assent: true });
      expect(st.collecting, id).toBe(false);
      expect(st.value, id).toEqual(shapeOf('meeting').sets[id]);
    }
    expect(s.memberRecords().get('ada')!.okOwed.size).toBe(0);
    expect(s.shape).toBe('meeting');
    const v = view(s, 'ada');
    expect(v.shape).toBe('meeting');
    for (const id of SHAPED) expect(shapedOf(s)[id], id).toBe(true);
    // ⏰ is not shaped by a meeting; the unavoidables are never
    expect(shapedOf(s).ending).toBe(false);
    expect(shapedOf(s).admission).toBe(false);
    // the quorum's form follows the value (foldSet), so 👥's card asks in it
    expect(s.quorumForm).toBe('share');
    // and the whole of it is in the log: one created, then one set per entry
    expect(s.logEntries().length).toBe(1 + Object.keys(shapeOf('meeting').sets).length);
    expect(ConstitutionSession.replay([...s.logEntries()]).shape).toBe('meeting');
  });

  it('a touched clause stops being the shape’s; the rest stay', () => {
    const s = open('conference');
    s.setSetting(1, 'quorum', { form: 'share', n: 40 });
    const sh = shapedOf(s);
    expect(sh.quorum).toBe(false);
    for (const id of SHAPED.filter((x) => x !== 'quorum')) expect(sh[id], id).toBe(true);
  });

  it('after the unavoidables and 🍾, nothing is the shape’s', () => {
    const s = open('meeting');
    s.setSetting(1, 'ending', { endsAtMs: 3_600_000 });
    s.setSetting(1, 'admission', { price: 'assembly' });
    s.setSetting(1, 'applications', { apply: false });
    s.confirmStartingText(1, '');
    s.begin(2);
    expect(s.constitutedAtT).toBe(2);
    for (const id of SHAPED) expect(shapedOf(s)[id], id).toBe(false);
    expect(s.shape).toBe('meeting');
  });

  it('open with no shape emits exactly one event, as before', () => {
    const s = open();
    expect(s.logEntries().length).toBe(1);
    expect(s.shape).toBe(null);
    expect('shape' in s.logEntries()[0]!.event).toBe(false);
    for (const id of SHAPED) expect(shapedOf(s)[id], id).toBe(false);
    expect(view(s, 'ada').shape).toBe(null);
  });

  it('ongoing sets ⏰ never and 🪜 fixed, and a ramp under never is refused', () => {
    const s = open('ongoing');
    expect(s.settingState('ending').value).toEqual({ endsAtMs: null });
    expect(s.settingState('pace').value).toEqual({ shape: 'fixed' });
    expect(() => s.setSetting(1, 'pace', { shape: 'ramp', startPct: 60 })).toThrow(/perpetual/);
  });

  it('the fold reads the catalogue order, ⏰ first', () => {
    const s = open('ongoing');
    const sets = s.logEntries().slice(1).map((e) => (e.event as { setting: string }).setting);
    expect(sets[0]).toBe('ending');
    const order = CATALOGUE.map((e) => e.id).filter((id) => sets.includes(id));
    expect(sets).toEqual(order);
  });
});
