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
import { parsePreset, presetPath } from './demo-preset.js';
import type { PresetError } from './demo-preset.js';
import type { LoadedDoc } from './store.js';

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

  constructor(private readonly host: DemoHost & {
    designDir: string;
    enabled: boolean;
  }) {}

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
