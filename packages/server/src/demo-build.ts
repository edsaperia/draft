/**
 * **The demo document, built** (design/DEMO.md Stage 1; Q1535): one
 * generation of `/d/demo` from a parsed preset — the cast invited, arrived and
 * named, the rules set, the text as first published confirmed, 🍾 pressed,
 * the decided changes adopted and the open proposals submitted and judged by
 * their `State:` — all of it written at backdated instants through the
 * history pen, so the document is really three hours old when anybody first
 * opens it.
 *
 * **A stagehand, not a member.** Like the phase ladder this writes history
 * through the module's own methods (`cs.*`, the bridge), which is right for a
 * past that is written rather than lived; the bots (Stage 4) are members and
 * go through the command path instead. What the two share is `sitesToHunks`,
 * so a seeded session swap and a bot's are one code path.
 *
 * **Ephemeral** (D1): the document is created by `createEphemeral` and never
 * reaches the store; `commit` is the host's, so the engine is born, synced
 * and ticked exactly as on any document.
 */
import { randomBytes } from 'node:crypto';
import { attest } from '../../engine-core/src/text/attest.js';
import type { Hunk } from '../../engine-core/src/text/types.js';
import { CATALOGUE } from '../../constitution/src/index.js';
import type { PowerKey, Power, SettingId, SettingValue } from '../../constitution/src/index.js';
import { HELD } from '../../constitution/src/fold.js';
import type { EngineBridge } from '../../constitution/src/engine-bridge.js';
import { asEngineDoc } from './engine-host.js';
import { Pen, lastTOf } from './history-pen.js';
import type { DocStore, LoadedDoc } from './store.js';
import { DEMO_INVARIANTS, locate, undoDecided } from './demo-preset.js';
import type { DemoPreset, PresetEntry, PresetSite } from './demo-preset.js';

/** The demo's address (DEMO.md §0). */
export const DEMO_SLUG = 'demo';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
/** How far back the demo's past reaches. */
const PAST = 3 * HOUR;

/**
 * **The builder's defaults** (§3.1): what a setting the preset does not name
 * starts at. The invariants are not here — they are `DEMO_INVARIANTS`, which
 * the preset may state but never move.
 */
export const DEMO_DEFAULTS: ReadonlyMap<SettingId, SettingValue> = new Map<SettingId, SettingValue>([
  ['quorum', { form: 'count', n: 3 }],
  ['rate', { grant: 3, cap: 3, dripMinutes: 2 }],
  ['lapse', { afterMs: null }],
  ['authorship', { rung: 'public' }],
  ['judgments', { rung: 'never' }],
  ['removal', { price: 'assembly' }],
]);

export interface DemoSeat { id: string; name: string; founder: boolean }

export interface DemoHost {
  store: DocStore;
  /** `WritePath.commit` on a server; the engine is driven inside it. */
  commit: (doc: LoadedDoc, nowMs: number) => Promise<number | null>;
}

export interface DemoBuild {
  doc: LoadedDoc;
  /** The Founder first, then the cast in file order. */
  seats: DemoSeat[];
  /** Every open entry's candidate id, by label — what `verifyBuild` reads. */
  candidates: Map<string, string>;
  built: string[];
  skipped: string[];
}

/** One span as the engine takes it, before the attestation. */
export interface Span { start: number; end: number; lines: string[] }

/**
 * **Spans to an attested hunk set** (§3.3, Stage 4's shared path): sorted
 * into document order, as the engine requires, and each attested against the
 * lines it was written over (`attest`). The caller has already checked the
 * spans stand and do not overlap.
 */
export function hunksOf(spans: readonly Span[], baseLines: readonly string[]): Hunk[] {
  const sorted = [...spans].sort((a, b) => a.start - b.start || a.end - b.end)
    .map((s) => ({ start: s.start, end: s.end, lines: [...s.lines] }));
  return attest(baseLines, sorted);
}

/**
 * **A preset entry's sites to one patch** (§3.3): every site located on the
 * current lines — an `After:` site one past its anchor — and handed to
 * `hunksOf`. Throws, naming the site, where one does not stand exactly once.
 */
export function sitesToHunks(sites: readonly PresetSite[], lines: readonly string[]): Hunk[] {
  const spans: Span[] = sites.map((site) => {
    const at = locate(site, lines);
    if ('error' in at) {
      throw new Error(`a site (file line ${site.line}) is ${at.error} in the current text`);
    }
    return { start: at.start, end: at.end, lines: site.to };
  });
  return hunksOf(spans, lines);
}

/** An address that can never receive mail (`mailer.ts`'s reserved TLDs, Q680). */
function addressOf(name: string, taken: Set<string>): string {
  const base = name.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '') || 'member';
  let addr = `${base}@demo.invalid`;
  for (let n = 2; taken.has(addr); n++) addr = `${base}.${n}@demo.invalid`;
  taken.add(addr);
  return addr;
}

/**
 * Build one generation of the demo document. The slug must be free — a
 * reset retires the old generation first, and the boot refuses where a real
 * document holds the address (Stage 1 criterion 4) before calling this.
 */
export async function buildDemo(host: DemoHost, preset: DemoPreset,
  opts: { nowMs?: number; id?: string } = {}): Promise<DemoBuild> {
  const nowMs = opts.nowMs ?? Date.now();
  const built: string[] = [];
  const skipped: string[] = [];
  if (host.store.slugTaken(DEMO_SLUG)) throw new Error(`the address '${DEMO_SLUG}' is taken`);

  const founder = preset.cast.find((c) => c.founder)!;
  const emails = new Set<string>();
  const t0 = nowMs - PAST;
  const id = opts.id ?? `d-demo-${randomBytes(3).toString('hex')}`;
  const doc = host.store.createEphemeral(id, {
    title: preset.title,
    slug: DEMO_SLUG,
    convenor: { id: 'founder', email: addressOf(founder.name, emails), isMember: true },
  }, t0);
  await host.commit(doc, t0);
  const cs = doc.cs;
  // the drafting past is spread up to a minute short of now, so the first
  // real command after the build is never stamped behind it
  const pen = new Pen(lastTOf(cs), nowMs - MINUTE);

  // -- the room --------------------------------------------------------------
  const seatOf = new Map<string, string>([[founder.name, cs.convenorRecord().id]]);
  cs.setIdentity(pen.next(), cs.convenorRecord().id, { name: founder.name, picture: null });
  for (const c of preset.cast) {
    if (c.founder) continue;
    const member = cs.invite(pen.next(), addressOf(c.name, emails));
    cs.arrive(pen.next(), member);
    cs.setIdentity(pen.next(), member, { name: c.name, picture: null });
    seatOf.set(c.name, member);
  }
  await host.commit(doc, pen.now);
  built.push(`${preset.cast.length - 1} members invited, arrived and named, and the Founder`);

  // -- the rules and the text as first published ----------------------------
  cs.setConvenorMembership(pen.next(), true);
  const firstPublished = undoDecided(preset.text, preset.decided);
  cs.confirmStartingText(pen.next(), firstPublished.join('\n'));
  const values = new Map<SettingId, SettingValue>([...DEMO_DEFAULTS, ...DEMO_INVARIANTS, ...preset.rules]);
  const quorum = values.get('quorum') as { form: 'count' | 'share' } | undefined;
  if (quorum) cs.setQuorumForm(pen.next(), quorum.form);
  for (const entry of CATALOGUE) {
    const v = values.get(entry.id);
    if (v === undefined || entry.retiredAnswer !== undefined) continue;
    cs.setSetting(pen.next(), entry.id, v);
  }
  giveOwedOks(doc, pen);
  // 🍾 with every power laid down but ✉️'s ✒️ — the one the host presses on
  // the Founder's standing behalf when a visitor joins (D2, Stage 3)
  const laidDown: { setting: PowerKey; power: Power }[] = [];
  for (const k of HELD) {
    for (const power of ['unilateral', 'assent'] as const) {
      if (k === 'door:invite' && power === 'unilateral') continue;
      laidDown.push({ setting: k, power });
    }
  }
  cs.begin(pen.next(), laidDown);
  await host.commit(doc, pen.now); // births the bridge, anchored here
  const bridge = asEngineDoc(doc).bridge;
  if (bridge === null) throw new Error('the demo document\'s engine did not start');
  built.push('🍾 pressed, every power laid down but ✉️\'s ✒️');

  const judges = preset.cast.filter((c) => !c.founder).map((c) => seatOf.get(c.name)!);
  const rota = rotaOf(judges);

  // -- the decided changes, one per stride ----------------------------------
  const room = pen.room;
  const decidedStride = Math.max(1, Math.floor((room * 0.3) / Math.max(1, preset.decided.length)));
  for (const e of preset.decided) {
    pen.next(decidedStride);
    try {
      await decide(host, doc, bridge, e, seatOf, rota, pen);
      built.push(`${e.label} adopted`);
    } catch (err) {
      skipped.push(`${e.label}: ${(err as Error).message}`);
    }
  }

  // -- the open proposals, each judged by its state -------------------------
  const candidates = new Map<string, string>();
  const openStride = Math.max(1, Math.floor((pen.room * 0.9) / Math.max(1, preset.open.length)));
  for (const e of preset.open) {
    try {
      const lines = bridge.engine.linesAt(bridge.engine.currentVersion());
      const hunks = sitesToHunks(e.sites, lines);
      const out = bridge.proposeText(pen.next(openStride), seatOf.get(e.proposer)!, {
        baseVersion: bridge.engine.currentVersion(), hunks,
      }, e.reason);
      candidates.set(e.label, out.id);
    } catch (err) {
      skipped.push(`${e.label}: ${(err as Error).message}`);
    }
  }
  await host.commit(doc, pen.now);
  for (const e of preset.open) {
    const cand = candidates.get(e.label);
    if (cand === undefined || e.state === 'fresh') continue;
    const author = seatOf.get(e.proposer)!;
    const pick = (): string => rota.next([author]);
    try {
      // a candidate an earlier judgment carried is in no race: P11 says so
      if (bridge.engine.getCandidate(cand).state !== 'live') continue;
      const race = bridge.engine.raceOf(cand, pen.now);
      const inc = race.incumbentId;
      bridge.judge(pen.next(), pick(), cand, inc, 'a');
      if (e.state === 'contested') {
        // one or two who prefer the current text, and a rival compared — a
        // near-even race, never past the floor (§3.3)
        bridge.judge(pen.next(), pick(), cand, inc, 'b');
        if (e.sites.length > 1 || race.members.length > 2) bridge.judge(pen.next(), pick(), cand, inc, 'b');
        const rival = race.members.find((m) => m !== cand);
        if (rival !== undefined) bridge.judge(pen.next(), pick(), cand, rival, 'a');
      }
    } catch (err) {
      skipped.push(`${e.label}'s judging: ${(err as Error).message}`);
    }
  }
  await host.commit(doc, pen.now);
  built.push(`${candidates.size} open proposals submitted and judged by their state`);

  const seats: DemoSeat[] = [{ id: cs.convenorRecord().id, name: founder.name, founder: true },
    ...preset.cast.filter((c) => !c.founder).map((c) => ({ id: seatOf.get(c.name)!, name: c.name, founder: false }))];
  return { doc, seats, candidates, built, skipped };
}

/**
 * A decided change: its proposal, its losing rival on the same site, and as
 * many judges as the floor needs preferring it to the current text and to the
 * rival; then the stride's tick lands the adoption. Throws if it did not land.
 */
async function decide(host: DemoHost, doc: LoadedDoc, bridge: EngineBridge, e: PresetEntry,
  seatOf: Map<string, string>, rota: Rota, pen: Pen): Promise<void> {
  const engine = bridge.engine;
  const before = engine.currentVersion();
  const lines = engine.linesAt(before);
  const spans = e.sites.map((s) => {
    const at = locate({ ...s, after: false }, lines, 'from');
    if ('error' in at) throw new Error(`its As it was: is ${at.error} in the text`);
    return { start: at.start, end: at.end, lines: s.to };
  });
  const author = seatOf.get(e.proposer)!;
  const win = bridge.proposeText(pen.next(), author,
    { baseVersion: before, hunks: hunksOf(spans, lines) }, e.reason).id;
  let rival: string | null = null;
  if (e.rival !== null) {
    rival = bridge.proposeText(pen.next(), seatOf.get(e.rival.proposer)!, {
      baseVersion: before,
      hunks: hunksOf([{ start: spans[0]!.start, end: spans[0]!.end, lines: e.rival.to }], lines),
    }, e.rival.reason).id;
  }
  const inc = engine.raceOf(win, pen.now).incumbentId;
  const exclude = [author, ...(e.rival ? [seatOf.get(e.rival.proposer)!] : [])];
  const floor = Math.max(3, engine.raceOf(win, pen.now).floor);
  for (let k = 0; k < floor; k++) {
    const who = rota.next(exclude);
    if (engine.currentVersion() !== before) break;
    bridge.judge(pen.next(), who, win, inc, 'a');
    if (rival !== null && engine.getCandidate(rival).state === 'live') {
      bridge.judge(pen.next(), who, win, rival, 'a');
    }
  }
  await host.commit(doc, pen.now);
  if (engine.getCandidate(win).state !== 'adopted') {
    throw new Error(`not adopted (${engine.getCandidate(win).state})`);
  }
  // a losing rival still standing after the adoption is withdrawn by its
  // proposer, as the room's loser would: the record keeps it, the rail does not
  if (rival !== null) {
    const r = engine.getCandidate(rival);
    if (r.state === 'live' || r.state === 'rebase-pending') {
      try { bridge.withdrawText(pen.next(), r.author, rival); } catch { /* already settled */ }
    }
  }
}

/** The acknowledgements the module can settle, given — as the ladder gives them. */
function giveOwedOks(doc: LoadedDoc, pen: Pen): void {
  const cs = doc.cs;
  for (const m of cs.memberRecords().values()) {
    for (const setting of [...m.okOwed]) {
      try { cs.giveOk(pen.next(), m.id, setting); } catch { /* not owed after all */ }
    }
  }
}

interface Rota { next(exclude: readonly string[]): string }

/** The judges in a fixed turn, so an unchanged preset builds the same document. */
function rotaOf(members: readonly string[]): Rota {
  let i = 0;
  return {
    next(exclude) {
      for (let k = 0; k < members.length; k++) {
        const who = members[(i + k) % members.length]!;
        if (!exclude.includes(who)) {
          i = (i + k + 1) % members.length;
          return who;
        }
      }
      throw new Error('nobody left to judge');
    },
  };
}

/**
 * **P11: does the built document say what the file says** (§3.2)? Every
 * decided change adopted and the text after them equal to `@text`; every open
 * entry live with as many hunks as it has sites; every contested entry holding
 * a judgment against it; the cast arrived under their names. Returns the
 * disagreements, each naming the entry's file line.
 */
export function verifyBuild(preset: DemoPreset, b: DemoBuild): { line: number; rule: string; message: string }[] {
  const out: { line: number; rule: string; message: string }[] = [];
  const bad = (line: number, message: string): void => { out.push({ line, rule: 'P11', message }); };
  for (const s of b.skipped) bad(1, `the build skipped: ${s}`);
  const bridge = asEngineDoc(b.doc).bridge;
  if (bridge === null) { bad(1, 'the engine did not start'); return out; }
  const engine = bridge.engine;
  // the text after the decided changes, with the open proposals not yet in it
  const adoptedTexts = engine.allCandidates().filter((c) => c.state === 'adopted' && c.patch);
  if (adoptedTexts.length !== preset.decided.length) {
    bad(1, `${adoptedTexts.length} changes adopted in the build; the file decides ${preset.decided.length}`);
  }
  const now = engine.linesAt(engine.currentVersion());
  if (now.length !== preset.text.length || now.some((l, i) => l.trim() !== preset.text[i]!.trim())) {
    const i = now.findIndex((l, k) => l.trim() !== (preset.text[k] ?? '').trim());
    bad(1, `the built text differs from @text (first at line ${i + 1} of the text)`);
  }
  for (const e of preset.open) {
    const id = b.candidates.get(e.label);
    if (id === undefined) { bad(e.line, `${e.label} was never submitted`); continue; }
    const c = engine.getCandidate(id);
    if (c.state !== 'live') { bad(e.line, `${e.label} is ${c.state}, not live`); continue; }
    const n = c.patch?.hunks.length ?? 0;
    if (n !== e.sites.length) bad(e.line, `${e.label} stands as ${n} hunks; the file gives ${e.sites.length} sites`);
    if (e.state === 'contested') {
      const against = engine.judgments().some((j) =>
        (j.aId === id && j.outcome === 'b') || (j.bId === id && j.outcome === 'a'));
      if (!against) bad(e.line, `${e.label} is contested and nobody judged against it`);
    }
  }
  const names = new Set([...b.doc.cs.memberRecords().values()]
    .filter((m) => m.arrivedAtT !== null && !m.removed).map((m) => m.name));
  for (const c of preset.cast) if (!names.has(c.name)) bad(c.line, `${c.name} did not arrive under that name`);
  return out;
}
