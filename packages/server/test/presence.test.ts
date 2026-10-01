/**
 * Where each member is reading — the host's table (design/PRESENCE.md §1.2,
 * Q1570). A table in memory and never the log: what it keeps, for how long,
 * what it tells whom, and what it never says.
 */
import { describe, expect, it } from 'vitest';
import { AT_OK, PRESENCE_TTL_MS, dropPlace, facesNamed, notePlace, placeOf, readingOf, tokenOf }
  from '../src/presence.js';

const alive = () => true;

describe('the reading table (PRESENCE.md §1.2)', () => {
  it('keeps the latest place per member and drops it after the TTL', () => {
    const doc = {};
    expect(notePlace(doc, 'm-1', 'L4', 1_000)).toBe(true);
    expect(placeOf(doc, 'm-1', 1_000)).toEqual({ at: 'L4', t: 1_000 });
    notePlace(doc, 'm-1', 'L9', 5_000);
    expect(placeOf(doc, 'm-1', 5_000)!.at).toBe('L9');
    // seven polls later it still stands; one more and it is gone
    expect(placeOf(doc, 'm-1', 5_000 + PRESENCE_TTL_MS)).not.toBeNull();
    expect(placeOf(doc, 'm-1', 5_001 + PRESENCE_TTL_MS)).toBeNull();
    expect(readingOf(doc, 'm-2', 5_001 + PRESENCE_TTL_MS, { named: true, alive })).toEqual([]);
  });

  it('takes only a block key the page would send', () => {
    const doc = {};
    for (const bad of ['', 'L', 'L-1', 'G3', 'L1234567', '<b>', 'L1 ']) {
      expect(notePlace(doc, 'm-1', bad, 1), bad).toBe(false);
    }
    expect(placeOf(doc, 'm-1', 1)).toBeNull();
    expect(AT_OK.test('L0')).toBe(true);
  });

  it('tells a member where every other member is, never themselves', () => {
    const doc = {};
    notePlace(doc, 'm-1', 'L2', 100);
    notePlace(doc, 'm-2', 'L2', 200);
    notePlace(doc, 'm-3', 'L7', 300);
    expect(readingOf(doc, 'm-2', 400, { named: true, alive })).toEqual([
      { id: 'm-1', at: 'L2' }, { id: 'm-3', at: 'L7' }]);
    expect(readingOf(doc, 'm-1', 400, { named: true, alive })).toEqual([
      { id: 'm-2', at: 'L2' }, { id: 'm-3', at: 'L7' }]);
  });

  it('drops a seat that is gone, and a place that was dropped', () => {
    const doc = {};
    notePlace(doc, 'm-1', 'L1', 100);
    notePlace(doc, 'm-2', 'L1', 100);
    expect(readingOf(doc, 'm-9', 100, { named: true, alive: (id) => id !== 'm-2' })).toEqual([{ id: 'm-1', at: 'L1' }]);
    dropPlace(doc, 'm-1');
    expect(readingOf(doc, 'm-9', 100, { named: true, alive })).toEqual([]);
  });

  it('under the anonymous rungs carries a per-boot token and no id (1570.3)', () => {
    const doc = {};
    notePlace(doc, 'm-1', 'L5', 100);
    const rows = readingOf(doc, 'm-2', 100, { named: false, alive });
    expect(rows).toHaveLength(1);
    expect(JSON.stringify(rows)).not.toMatch(/m-1|"id"/);
    const k = (rows[0] as { k: string }).k;
    expect(k).toBe(tokenOf(doc, 'm-1'));
    // the token stays the token across polls, so a mark glides (decision 10)
    notePlace(doc, 'm-1', 'L6', 200);
    expect((readingOf(doc, 'm-2', 200, { named: false, alive })[0] as { k: string }).k).toBe(k);
    // …and is another document's business on another document
    expect(tokenOf({}, 'm-1')).not.toBe(k);
    // random, never derived from the id
    expect(k).not.toContain('m-1');
    expect(k.length).toBeGreaterThanOrEqual(12);
  });

  it('names faces exactly where a proposal may be signed (1570.1)', () => {
    expect(facesNamed('public')).toBe(true);
    expect(facesNamed('anonymousElective')).toBe(true);
    expect(facesNamed('sealedElective')).toBe(true);
    expect(facesNamed('anonymous')).toBe(false);
    expect(facesNamed('sealed')).toBe(false);
    expect(facesNamed(undefined)).toBe(false);
    expect(facesNamed(null)).toBe(false);
  });

  it('is kept per document object, and a document taken away takes its table', () => {
    const a = {}, b = {};
    notePlace(a, 'm-1', 'L1', 100);
    expect(readingOf(b, 'm-2', 100, { named: true, alive })).toEqual([]);
    expect(readingOf(a, 'm-2', 100, { named: true, alive })).toHaveLength(1);
  });
});
