/**
 * **The demo document's host half** (design/DEMO.md Stage 1; Q1535): the one
 * instance a server holds, which builds `/d/demo` from the preset at boot and
 * reports what it did on `/healthz`. Stage 2's Reset builds the next
 * generation through `rebuild`.
 *
 * **A real document is never shadowed** (Stage 1 criterion 4): if a persisted
 * document already wears the address `demo`, the demo stays off, says so in
 * `/healthz`, and serves nothing of its own. The slug check at the birth
 * refuses the address to everybody else once the demo holds it, since an
 * ephemeral document's slug routes like any other's.
 *
 * Everything here is memory: a restart forgets the generation and builds a
 * fresh one at a new id, which is the intended behaviour (DEMO.md §5).
 */
import { readFileSync } from 'node:fs';
import { buildDemo, DEMO_SLUG } from './demo-build.js';
import type { DemoBuild, DemoHost, DemoSeat } from './demo-build.js';
import { randomBytes } from 'node:crypto';
import { visitorName } from './demo-names.js';
import { parsePreset, presetPath } from './demo-preset.js';
import type { PresetError } from './demo-preset.js';
import { lastTOf } from './history-pen.js';
import type { LoadedDoc } from './store.js';

/** A visitor's seat lapses this long after its last action (D8; Q1535). */
export const VISITOR_LAPSE_MS = 30 * 60_000;

/**
 * **The grants a visitor's seat arrives with already accepted** (D7; Q1535):
 * 💡 proposing, ⚖️ judging and 🏛️ the constitutional voice — the page's own
 * acknowledgement keys (`ACK_KEYS` in session-view.html), so the page adds
 * them to what it remembers and draws the wallets full. On the demo document,
 * for a visitor's seat, and nowhere else.
 */
export const VISITOR_PRE_ACKED = ['canpropose', 'canjudge', 'grant-voice'] as const;

export interface DemoJoin { member: string; name: string; rejoined: boolean }

export type DemoState = 'off' | 'built' | 'slug-held' | 'failed';

export interface DemoStatus {
  state: DemoState;
  /** Counts up from 1 at every build this process makes. */
  generation: number;
  builtAt: number | null;
}

export class Demo {
  private state_: DemoState = 'off';
  private generation_ = 0;
  private builtAt_: number | null = null;
  private current: DemoBuild | null = null;
  /** Why the last build or parse failed, for the log and the panel. */
  lastErrors: PresetError[] = [];

  /**
   * **The visitors of this generation** (Stage 3): each seat the join made,
   * and the instant of its last action — the join, then every command. Memory
   * only, like everything demo-shaped; a reset starts it empty, since the new
   * generation's id makes every old cookie a stranger's.
   */
  private readonly visitors = new Map<string, number>();

  constructor(private readonly host: DemoHost & {
    designDir: string;
    enabled: boolean;
    /** The write path's clock for a document (`WritePath.tOf`); absent, the
     *  later of now and the log's last instant. */
    tOf?: (doc: LoadedDoc, nowMs: number) => number;
    /** How long a visitor's seat outlives its last action (D8); tests shorten it. */
    visitorLapseMs?: number;
  }) {}

  private tOf(doc: LoadedDoc, nowMs: number): number {
    return this.host.tOf ? this.host.tOf(doc, nowMs) : Math.max(nowMs, lastTOf(doc.cs));
  }

  /** Is this member a visitor's seat of the current generation? */
  isVisitor(member: string): boolean {
    return this.visitors.has(member);
  }

  /** How many visitors sit in the current generation. */
  visitorCount(): number {
    return this.visitors.size;
  }

  /** A visitor acted: their seat's 30 minutes start again. Anybody else: nothing. */
  touch(member: string, nowMs: number): void {
    if (this.visitors.has(member)) this.visitors.set(member, nowMs);
  }

  /**
   * **One tap, one seat** (Stage 3; D2): the host acts on the Founder's
   * standing ✒️ on ✉️ — the only stagehand act after the build — inviting a
   * made-up address that can never receive mail, arriving it at once and
   * naming it. `seated` is the member this browser's cookie already names in
   * this generation, if it is still a member: that seat is answered and no
   * second one is made (one seat per device, Q1535).
   */
  async join(nowMs: number, seated: string | null): Promise<DemoJoin> {
    const doc = this.doc();
    if (doc === null) throw new Error('the demo document is not built');
    const cs = doc.cs;
    if (seated !== null) {
      const rec = cs.memberRecords().get(seated);
      if (rec && !rec.removed) {
        this.touch(seated, nowMs);
        return { member: seated, name: rec.name ?? '', rejoined: true };
      }
      if (seated === cs.convenorRecord().id) {
        return { member: seated, name: cs.convenorRecord().name ?? '', rejoined: true };
      }
    }
    const names = new Set<string>();
    for (const m of cs.memberRecords().values()) if (m.name) names.add(m.name);
    const conv = cs.convenorRecord().name;
    if (conv) names.add(conv);
    const name = visitorName(names);
    const t = this.tOf(doc, nowMs);
    const email = `visitor.${randomBytes(6).toString('hex')}@demo.invalid`;
    const member = cs.invite(t, email);
    cs.arrive(t, member);
    cs.setIdentity(t, member, { name, picture: null });
    this.visitors.set(member, nowMs);
    await this.host.commit(doc, nowMs);
    return { member, name, rejoined: false };
  }

  /**
   * **A visitor's seat lapses 30 minutes after its last action** (D8;
   * Q1535): on the minute tick the member resigns — the ordinary leaving
   * road, so they stop counting in every quorum at once — and their cookie
   * then reads the stranger's door, where a rescan joins anew. The room's
   * news of each departure (SURFACE E31) is acknowledged for everybody in the
   * same breath: a room of phones leaving one by one would otherwise stack a
   * 🥾 card per visitor on every seat, the Founder's on the big screen
   * included. Bot seats and the Founder's never lapse — they are not visitors.
   */
  async lapseVisitors(nowMs: number): Promise<string[]> {
    const doc = this.doc();
    if (doc === null || this.visitors.size === 0) return [];
    const cs = doc.cs;
    const lapseMs = this.host.visitorLapseMs ?? VISITOR_LAPSE_MS;
    const gone: string[] = [];
    for (const [member, last] of [...this.visitors]) {
      if (nowMs - last < lapseMs) continue;
      this.visitors.delete(member);
      const rec = cs.memberRecords().get(member);
      if (!rec || rec.removed) continue;
      const t = this.tOf(doc, nowMs);
      try {
        cs.resign(t, member);
      } catch (e) {
        console.error(`[demo] a visitor's seat (${member}) did not lapse: ${(e as Error).message}`);
        continue;
      }
      for (const m of cs.memberRecords().values()) {
        if (m.departuresOwed.has(member)) {
          try { cs.ackDeparture(t, m.id, member); } catch { /* not owed after all */ }
        }
      }
      gone.push(member);
    }
    if (gone.length > 0) await this.host.commit(doc, nowMs);
    return gone;
  }

  private readonly beforeRebuild: Array<(old: LoadedDoc) => void> = [];

  /** Run `fn` with the outgoing document before every rebuild retires it. */
  onRebuild(fn: (old: LoadedDoc) => void): void {
    this.beforeRebuild.push(fn);
  }

  /** The document of the current generation, or null. */
  doc(): LoadedDoc | null {
    return this.current?.doc ?? null;
  }

  seats(): readonly DemoSeat[] {
    return this.current?.seats ?? [];
  }

  status(): DemoStatus {
    return { state: this.state_, generation: this.generation_, builtAt: this.builtAt_ };
  }

  /** At boot, after the store has loaded: build the first generation. */
  async boot(nowMs: number = Date.now()): Promise<void> {
    if (!this.host.enabled) return;
    const holder = this.host.store.bySlug(DEMO_SLUG);
    if (holder !== null && holder.ephemeral !== true) {
      this.state_ = 'slug-held';
      console.error(`[demo] a persisted document (${holder.id}) holds the address ` +
        `'${DEMO_SLUG}' — the demo document is off`);
      return;
    }
    const r = await this.rebuild(nowMs);
    if (!r.ok) {
      console.error(`[demo] the preset did not build — the demo document is off:\n` +
        r.errors.map((e) => `  ${e.rule} line ${e.line}: ${e.message}`).join('\n'));
    }
  }

  /**
   * **A new generation from the preset, read afresh** (Q1535). The parse
   * comes first and a file that does not parse keeps the old generation
   * serving; only then is the old one retired and the new one built.
   */
  async rebuild(nowMs: number = Date.now()): Promise<{ ok: true } | { ok: false; errors: PresetError[] }> {
    if (this.state_ === 'slug-held') {
      return { ok: false, errors: [{ line: 0, rule: 'slug', message: `a real document holds '${DEMO_SLUG}'` }] };
    }
    let src: string;
    try {
      src = readFileSync(presetPath(this.host.designDir), 'utf8');
    } catch (e) {
      return this.fail([{ line: 0, rule: 'file', message: (e as Error).message }]);
    }
    const { preset, errors } = parsePreset(src);
    if (preset === null) return this.fail(errors);
    const old = this.current;
    // whatever runs against the old generation stops before it goes (the
    // bots, Stage 4): a reset is the end of their room
    if (old !== null) for (const fn of this.beforeRebuild) fn(old.doc);
    if (old !== null) this.host.store.retire(old.doc.id);
    // every visitor went with the generation: their cookies name the old id
    this.visitors.clear();
    try {
      this.current = await buildDemo(this.host, preset, { nowMs });
    } catch (e) {
      this.current = null;
      return this.fail([{ line: 0, rule: 'build', message: (e as Error).message }], true);
    }
    for (const s of this.current.skipped) console.error(`[demo] build skipped: ${s}`);
    this.state_ = 'built';
    this.generation_ += 1;
    this.builtAt_ = nowMs;
    this.lastErrors = [];
    return { ok: true };
  }

  private fail(errors: PresetError[], lost = false): { ok: false; errors: PresetError[] } {
    this.lastErrors = errors;
    if (this.current === null || lost) this.state_ = 'failed';
    return { ok: false, errors };
  }
}
