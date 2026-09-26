/**
 * **`design/card-state.js` against what today's builders derive** (Q1541
 * stage 1; design/redesign/BUILD.md stage 1's first acceptance criterion).
 *
 * `card-state.js` is the one reader of each fact a card states. Two of those
 * facts had readers before it, and a disagreement between the new reader and
 * the old derivation is a finding — never a pass — so the old derivations are
 * transcribed here verbatim as they stood at main 41e678c4:
 *
 *  · **who chose a rule** — the page's `provOf` (session-view.html), the
 *    `settledBy` word with `crown` told apart by the last carried route —
 *    read over the module at **every rung of the phase ladder** (a document
 *    born, founding, ready, live, closing, closed), for every setting;
 *  · **the era** — `phaseOf` against the ladder's own `phaseOf`, rung by rung;
 *  · **how a record ended and what heads it** — session.js's
 *    `sealedCardHtml` (the incumbent in the ranking at its own 50%, the head
 *    the winner or the text that stood, the field the rest best first, the
 *    passed boxes green) — read over **every sealed record of the Hollow Oak
 *    fixture**, the charter the probes and the audit walk.
 *
 * The page files are browser scripts; they are evaluated here in a vm with a
 * bare window, the way `design/tools/clock-check.mjs` evaluates session.js.
 */
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import type { AddressInfo } from 'node:net';
import { afterAll, describe, expect, it } from 'vitest';
import { CATALOGUE } from '../../constitution/src/catalogue.js';
import type { ConstitutionSession } from '../../constitution/src/index.js';
import { createDraftServer } from '../src/server.js';
import type { DraftServer } from '../src/server.js';
import { FilePersistence } from '../src/persistence.js';
import { RUNGS, phaseOf as ladderPhaseOf } from '../src/dev-ladder.js';

const DESIGN = join(import.meta.dirname, '..', '..', '..', 'design');

type Win = Record<string, any>;
/** copy.js, cards.js, card-state.js (and the fixture, where asked) in a vm */
function page(extra: string[] = []): Win {
  const win: Win = { addEventListener() {}, matchMedia: () => ({ matches: false }),
    localStorage: { getItem: () => null, setItem() {} }, location: { search: '' } };
  const ctx: Win = { window: win, console, Math, Date, JSON, Set, Map, Array, Object, String, Number, RegExp,
    document: { getElementById: () => null, querySelector: () => null, addEventListener() {},
      documentElement: { style: {} }, createElement: () => ({ style: {} }) },
    setTimeout, clearTimeout, requestAnimationFrame: (f: () => void) => setTimeout(f, 0),
    getComputedStyle: () => ({}), navigator: {}, performance };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of ['copy.js', 'cards.js', 'card-state.js', ...extra]) {
    vm.runInContext(readFileSync(join(DESIGN, f), 'utf8'), ctx, { filename: f });
  }
  return win;
}

/* ---- today's derivations, transcribed (main 41e678c4) -------------------- */

/** session-view.html's `lastCarriedRoute`, over the module's own ids */
const lastCarriedRoute = (cs: ConstitutionSession, id: string): string | null => {
  let best: { at: number; route: string } | null = null;
  for (const m of cs.motionRecords().values()) {
    const p = m.payload as { kind?: string; setting?: string } | undefined;
    if (m.status !== 'carried' || !p || p.kind !== 'set' || p.setting !== id) continue;
    const at = (m as { at?: number }).at ?? m.settledAtT ?? 0;
    if (!best || at >= best.at) best = { at, route: m.route };
  }
  return best ? best.route : null;
};
/** session-view.html's `provOf` */
const todayProvOf = (w: Win, cs: ConstitutionSession, id: string): string => {
  const st = cs.settingState(id as never) as { settledBy?: string | null } | null;
  const by = st && st.settledBy;
  const pen = !by || by === 'convenor' || (by === 'crown' && lastCarriedRoute(cs, id) === 'pen');
  return pen ? w.COPY.page.motionRec.provPen : w.COPY.page.motionRec.provMembers;
};
/** the ladder's rung, as the page's era: the founding runs from the save to 🍾 */
const ERA: Record<string, string> = {
  constitution: 'founding', ready: 'founding', session: 'live', closing: 'live', closed: 'closed',
};

/* ---- the ladder --------------------------------------------------------- */

const booted: DraftServer[] = [];
afterAll(async () => { for (const d of booted) await d.close(); });

async function boot(): Promise<{ base: string; draft: DraftServer }> {
  const dataDir = mkdtempSync(join(tmpdir(), 'draft-cardstate-'));
  const cfg = {
    port: 0, dataDir, baseUrl: 'http://127.0.0.1', designDir: DESIGN,
    resendApiKey: null as string | null, mailFrom: 'test <t@example.org>', mailOff: false,
    secret: 'test-secret', store: 'file' as const, databaseUrl: null,
    trustProxy: false, buildSha: null, notifyEmail: null,
    engineTuning: { cooldownMs: 0 },
  };
  const draft = await createDraftServer(cfg, new FilePersistence(dataDir));
  await new Promise<void>((r) => draft.server.listen(0, '127.0.0.1', r));
  cfg.baseUrl = `http://127.0.0.1:${(draft.server.address() as AddressInfo).port}`;
  booted.push(draft);
  return { base: cfg.baseUrl, draft };
}
const post = (base: string, path: string, body: unknown) => fetch(base + path, {
  method: 'POST', headers: { 'content-type': 'application/json', origin: base }, body: JSON.stringify(body) });

describe('card-state.js over every rung of the phase ladder', () => {
  it('provenanceOf and phaseOf agree with today\'s provOf and the ladder, rung by rung', async () => {
    const { base, draft } = await boot();
    const w = page();
    const CS = w.CARD_STATE;
    // with no surface registered the readers fall back to a live member's
    // page, the one era that asks nothing of a source
    expect(CS.phaseOf()).toBe('live');
    let slug: string | null = null;
    const nowMs = Date.now();
    let checked = 0;
    for (const rung of RUNGS.slice(1)) {
      const r = await post(base, '/api/dev/ladder', { to: rung, seed: 11, ...(slug ? { slug } : {}) });
      expect(r.status, await r.clone().text()).toBe(200);
      slug = ((await r.json()) as { slug: string }).slug;
      const doc = draft.store.bySlug(slug)!;
      const cs = doc.cs;
      expect(ladderPhaseOf(doc, nowMs)).toBe(rung);
      // the band's source, over the module as the page reads it
      CS.register('band', {
        owns: (id: string) => CATALOGUE.some((e) => e.id === id),
        reader: () => 'founder-member',
        phase: () => (cs.closed ? 'closed' : cs.constitutedAtT === null ? 'founding' : 'live'),
        standing: (id: string) => {
          const st = cs.settingState(id as never) as { settledBy?: string | null } | null;
          return { settledBy: st ? st.settledBy ?? null : null, lastRoute: lastCarriedRoute(cs, id),
            settled: !!(st && st.settledBy != null) };
        },
      });
      expect(CS.phaseOf(), 'the era at ' + rung).toBe(ERA[rung]);
      // the settings the module holds a state for (a person's own name and
      // picture are catalogued, and are nobody's rule)
      const ids = CATALOGUE.map((e) => e.id as string).filter((id) => { try { cs.settingState(id as never); return true; } catch { return false; } });
      expect(ids.length).toBeGreaterThan(10);
      for (const id of ids) {
        const e = { id };
        const p = CS.provenanceOf(e.id);
        expect(p, e.id + ' at ' + rung).not.toBeNull();
        expect(p.label, 'who chose ' + e.id + ' at ' + rung).toBe(todayProvOf(w, cs, e.id));
        expect(p.by).toBe(p.label === w.COPY.page.motionRec.provPen ? 'founder' : 'membership');
        const st = CS.stateOf(e.id);
        expect(st.phase).toBe(ERA[rung]);
        expect(st.standing.label).toBe(p.label);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(10 * (RUNGS.length - 1));
  }, 120_000);
});

/* ---- the fixture's records ---------------------------------------------- */

describe('card-state.js over every sealed record of the Hollow Oak fixture', () => {
  const w = page(['fixture-session.js']);
  const F = w.FIXTURE_SESSION;
  const CS = w.CARD_STATE;
  const textOf = new Map<string, string>(F.DOC.filter((l: Win) => l.key).map((l: Win) => [l.key, l.x]));
  const sealed = (F.SUGGS as Win[]).filter((s) => s.state === 'sealed' && !s.amendment && !s.fold);
  CS.register('charter', {
    owns: (id: string) => F.SUGGS.some((s: Win) => s.id === id),
    record: (id: string) => {
      const s = F.SUGGS.find((g: Win) => g.id === id);
      const field = w.CARDS.fieldOf(s);
      return { field, undecided: !!s.undecided, early: !!s.early, changedSince: !!s.changedSince,
        currentText: textOf.get((s.keys ?? [])[0]) ?? null, replaced: s.replaced, optionA: s.optionA,
        base: s.replaced ?? s.optionA ?? '', when: 'when', counts: 'counts', capped: null };
    },
  });

  it('holds records to check', () => { expect(sealed.length).toBeGreaterThan(5); });

  for (const s of sealed) {
    it(s.id + ': the outcome, the head and the field are sealedCardHtml\'s', () => {
      // sealedCardHtml, transcribed: the incumbent in the ranking at 50%,
      // the head the winner or the text that stood, the rest best first
      const field = w.CARDS.fieldOf(s) as Win[];
      const held = !field.some((c) => c.won);
      const current = textOf.get((s.keys ?? [])[0]) ?? null;
      const incumbent = held ? current : (s.replaced ?? s.optionA ?? null);
      const ranked = field.slice()
        .concat(incumbent ? [{ text: incumbent, p: 0.5, incumbent: true }] : [])
        .sort((x, y) => (y.p ?? -1) - (x.p ?? -1));
      const top = ranked.find((c) => c.won || (c.incumbent && held)) || null;
      const rest = s.changedSince ? ranked : ranked.filter((c) => c !== top);
      const topLoser = held && !s.undecided && !s.early
        ? field.filter((c) => !c.won && c.text != null).sort((x, y) => (y.p ?? -1) - (x.p ?? -1))[0] || null : null;
      const passedBox = (c: Win) => !!(c.won || (c.incumbent && !!topLoser));

      const rec = CS.outcomeOf(s.id);
      expect(rec).not.toBeNull();
      // the outcome: a wording carried or it did not (today's `held`)
      expect(rec.outcome === 'passed', 'passed ⇔ a wording carried').toBe(!held);
      if (s.undecided) expect(rec.outcome).toBe('ranOut');
      expect(rec.green).toBe(rec.outcome === 'passed');
      expect(rec.label.startsWith(w.COPY.shell.outcome[rec.outcome])).toBe(true);
      // the head: today's top of the ranking
      expect(rec.head && rec.head.text).toBe(top ? top.text : undefined);
      expect(rec.head.incumbent).toBe(!!(top && top.incumbent));
      // the field: today's rest, in today's order, green where today's was —
      // the one difference by ruling is a clause changed since, whose head is
      // now the wording the record recorded (answers.md Part 5 (1)), so the
      // top leaves the field there as it does everywhere else
      const want = s.changedSince ? rest.filter((c) => c !== top) : rest;
      expect(rec.field.map((c: Win) => c.text)).toEqual(want.map((c) => c.text));
      expect(rec.field.map((c: Win) => c.passed)).toEqual(want.map(passedBox));
      expect(rec.field.map((c: Win) => c.role)).toEqual(want.map((c) => (c.incumbent ? 'previous' : 'proposed')));
      // every label in Ed's words (answers.md Part 4 .11, .12)
      for (const c of rec.field) {
        expect(c.label).toMatch(/^(Previous text|Proposed( by .+)?( · \d+%)?)$/);
      }
      // the record's notes ride the speaker, head and field alike (Q1543):
      // the fixture's `ranked-note` and `measured-note` records reach the shell
      const noteOf = (c: Win) => (c.incumbent ? null : c.underNote || null);
      expect(rec.head.speaker ? rec.head.speaker.underNote : null).toBe(top ? noteOf(top) : null);
      expect(rec.field.map((c: Win) => (c.speaker ? c.speaker.underNote : null))).toEqual(want.map(noteOf));
    });
  }
});
