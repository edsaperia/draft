/**
 * **The demo's bots** (`demo-bots`, design/DEMO.md Stages 4–5; Q1535): the
 * conference's own speakers, sitting in their own seats on the demo document,
 * reading it as their member reads it and acting on it as a member's page acts.
 *
 * **One way in, one way to look** (Stage 4 criteria 1–2). Every write is
 * `applyCommand` — the very function behind `POST /cmd` — with the bot's
 * member id as the seat; every read is `view()` and `raceView()` as that
 * member. Nothing here calls the session, the bridge or the store to change
 * anything, and `demo-bots.test.ts` greps this file to keep it so.
 *
 * **Paced, and paused by itself.** Each bot wakes on its own timer (calm
 * 60–120 s, lively 20–45 s, frantic 6–15 s, the first wake staggered across
 * the first interval), tends what it owes — OKs, releases, amendments,
 * departures — then does one weighted thing: judge the card on top of its hand,
 * answer a 🏛️ motion, propose, or now and then withdraw. A run **pauses** —
 * bots idle, ▶️ resumes, nothing is lost — when the panel's heartbeat has been
 * silent for two minutes, after ten minutes of running since the last ▶️, at $3
 * of model spend in the run, and on ⏸️ (Q1535; no daily cap). It **stops** on
 * Reset (a new generation), when the host is paused for a deploy (the first
 * 503), and with the process. A watchdog checks the two clocks every second,
 * so a pause lands within a second of its moment whatever the pace.
 *
 * **What the model is for**: how to judge a text pair, what to propose, how to
 * answer a motion (`demo-model.ts`). A card about a setting — an admission, a
 * rule — is judged without a call, as room-bots judges it: the door welcomed
 * three times in four, any other setting left indifferent.
 */
import { view } from '../../constitution/src/index.js';
import type { MemberView } from '../../constitution/src/index.js';
import { applyCommand } from './apply-command.js';
import type { CommandHost } from './apply-command.js';
import { blocksOf, DEFAULT_DEMO_MODEL, DEMO_MODELS, modelInfo, priceOf, proposalHunks } from './demo-model.js';
import type { DemoJudgeInput, DemoModel, DemoOption, DemoPersona, DemoUsage } from './demo-model.js';
import type { DemoBotSeat, DemoTarget } from './demo-target.js';
import type { LoadedDoc } from './store.js';
import { raceView } from './views.js';

export type DemoPace = 'calm' | 'lively' | 'frantic';
export const PACES: Record<DemoPace, [number, number]> = {
  calm: [60_000, 120_000],
  lively: [20_000, 45_000],
  frantic: [6_000, 15_000],
};
/** Two minutes after the last heartbeat (Q1535). */
export const LAPSE_MS = 120_000;
/** Ten minutes of running since the last ▶️ (Q1535). */
export const RUN_MS = 600_000;
/** $3 of model spend in a run (Q1535). */
export const CAP_USD = 3;
/** At most this many model calls in flight across all bots (DEMO.md Stage 5). */
export const CONCURRENCY = 4;

export type PausedBy = 'hand' | 'heartbeat' | 'run-clock' | 'spend';
export type StoppedBy = 'hand' | 'reset' | 'host-paused' | 'target-gone' | 'closing';

export interface DemoBotsDeps {
  /** What `applyCommand` reads: the store, the pause, the write path, the counters. */
  host: CommandHost;
  target: DemoTarget;
  /** The brain for a model id, or null where it cannot be had (no Claude key). */
  modelFor: (modelId: string) => DemoModel | null;
  /** Whether the bots have a brain on this host — a Claude key, or the dev stub (Stage 5). */
  claudeKey: boolean;
  /** Which brain: `claude`, the dev `stub`, or none. */
  brain?: 'claude' | 'stub' | null;
  now?: () => number;
  /** Test and walk overrides — never read from a request in production. */
  lapseMs?: number;
  runMs?: number;
  capUsd?: number;
  paceMs?: [number, number];
  /** How often the watchdog checks the two clocks. */
  watchMs?: number;
  log?: (line: string) => void;
}

export interface StartOptions {
  count?: number | undefined;
  pace?: DemoPace | undefined;
  model?: string | undefined;
}

interface Bot {
  seat: DemoBotSeat;
  timer: ReturnType<typeof setTimeout> | null;
  busy: boolean;
}

const tally = () => ({ judgments: 0, proposals: 0, swaps: 0, oks: 0, motionAnswers: 0,
  withdrawals: 0, passes: 0, dropped: 0, refused: 0, stale: 0 });

/** Refusals a member meets in the ordinary course of a busy room (room-bots' `ordinary`). */
const ORDINARY = /not in a live race|no such race|already resolved|not live|already stands|insufficient|version|stale|base|motion is not running|not what this proposal replaces|duplicate/i;

export class DemoBots {
  private state: 'idle' | 'running' | 'paused' | 'stopped' = 'idle';
  private pausedBy: PausedBy | null = null;
  private stoppedBy: StoppedBy | null = null;
  private bots: Bot[] = [];
  private model: DemoModel | null = null;
  private modelId = DEFAULT_DEMO_MODEL;
  private pace: DemoPace = 'lively';
  private count = 0;
  private generation = 0;
  private startedAt: number | null = null;
  private runStartedAt: number | null = null;
  private lastBeatAt: number | null = null;
  private runUsd = 0;
  private totalUsd = 0;
  private calls = 0;
  private tokens: DemoUsage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
  private acts = tally();
  private recent: string[] = [];
  private inFlight = 0;
  private waiting: Array<() => void> = [];
  private watchdog: ReturnType<typeof setInterval> | null = null;
  private readonly now: () => number;
  lapseMs: number;
  runMs: number;
  capUsd: number;

  constructor(private deps: DemoBotsDeps) {
    this.now = deps.now ?? Date.now;
    this.lapseMs = deps.lapseMs ?? LAPSE_MS;
    this.runMs = deps.runMs ?? RUN_MS;
    this.capUsd = deps.capUsd ?? CAP_USD;
  }

  /**
   * **Which document the bots act in** — the demo's, wired at boot. A dev
   * route (`routes-demo-bots.ts`, inside `DEV:`) and the tests point it at an
   * ordinary document instead; a run in progress stops first.
   */
  setTarget(target: DemoTarget): void {
    this.stop('target-gone');
    this.deps.target = target;
  }

  /** Shorter clocks for a walk — called only from inside a `DEV:` label or a test. */
  tune(o: { lapseMs?: number | undefined; runMs?: number | undefined; capUsd?: number | undefined;
    paceMs?: [number, number] | undefined }): void {
    if (o.lapseMs !== undefined) this.lapseMs = o.lapseMs;
    if (o.runMs !== undefined) this.runMs = o.runMs;
    if (o.capUsd !== undefined) this.capUsd = o.capUsd;
    if (o.paceMs !== undefined) this.deps.paceMs = o.paceMs;
  }

  /* -- the panel's four verbs and the heartbeat ------------------------- */

  /** ▶️ from idle or stopped: seat the first `count` bots and run. */
  start(o: StartOptions = {}): { ok: true } | { ok: false; error: string } {
    const doc = this.deps.target.doc();
    if (doc === null) return { ok: false, error: 'there is no demo document to run bots in' };
    const modelId = o.model ?? this.modelId;
    const info = modelInfo(modelId);
    if (info === null) return { ok: false, error: `unknown model '${modelId}'` };
    const model = this.deps.modelFor(modelId);
    if (model === null) return { ok: false, error: 'no Claude key on this host — the bots cannot start' };
    const seats = this.deps.target.botSeats();
    const count = Math.max(1, Math.min(seats.length, Math.floor(o.count ?? 8)));
    if (seats.length === 0) return { ok: false, error: 'the demo document has no bot seats' };
    this.halt();
    this.model = model;
    this.modelId = modelId;
    this.pace = o.pace && o.pace in PACES ? o.pace : 'lively';
    this.count = count;
    this.generation = this.deps.target.generation();
    this.bots = seats.slice(0, count).map((seat) => ({ seat, timer: null, busy: false }));
    this.acts = tally();
    this.totalUsd = 0;
    this.calls = 0;
    this.tokens = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
    this.startedAt = this.now();
    this.say('▶️', `${count} bots, ${this.pace}, ${info.label}`);
    this.run();
    return { ok: true };
  }

  /** ▶️ on a paused run: a fresh run clock and a fresh run total (Q1535). */
  resume(): { ok: true } | { ok: false; error: string } {
    if (this.state !== 'paused') return { ok: false, error: 'the bots are not paused' };
    if (this.deps.target.doc() === null || this.deps.target.generation() !== this.generation) {
      this.stop('target-gone');
      return { ok: false, error: 'the demo document has been reset — start the bots again' };
    }
    this.say('▶️', 'resumed');
    this.run();
    return { ok: true };
  }

  /** ⏸️, and the three pauses the bots take by themselves. */
  pause(by: PausedBy): void {
    if (this.state !== 'running') return;
    this.state = 'paused';
    this.pausedBy = by;
    this.clearTimers();
    this.say('⏸️', `paused (${by})`);
  }

  /** Reset, the host's pause, the hand, the process. */
  stop(by: StoppedBy): void {
    if (this.state === 'idle' || this.state === 'stopped') return;
    this.halt();
    this.state = 'stopped';
    this.stoppedBy = by;
    this.say('⏹️', `stopped (${by})`);
  }

  /** The panel's heartbeat, every 30 s while bots run (`demo-heartbeat`). */
  beat(): void {
    this.lastBeatAt = this.now();
  }

  /** The model for the next ▶️ from idle — never mid-run (Stage 5 criterion 3). */
  choose(o: StartOptions): void {
    if (o.model !== undefined && modelInfo(o.model) !== null) this.modelId = o.model;
    if (o.pace !== undefined && o.pace in PACES) this.pace = o.pace;
    if (o.count !== undefined) this.count = o.count;
  }

  stats() {
    const now = this.now();
    return {
      state: this.state,
      running: this.state === 'running',
      pausedBy: this.pausedBy,
      stoppedBy: this.stoppedBy,
      count: this.count,
      // how many of the run's bots are sitting out because Ed holds their seat
      held: this.bots.filter((b) => this.isHeld(b)).length,
      seats: this.deps.target.botSeats().length,
      pace: this.pace,
      paces: Object.keys(PACES),
      model: this.modelId,
      models: DEMO_MODELS.map((x) => ({ id: x.id, label: x.label })),
      claudeKey: this.deps.claudeKey,
      brain: this.deps.brain ?? null,
      generation: this.generation,
      startedAt: this.startedAt,
      runStartedAt: this.runStartedAt,
      runElapsedMs: this.runStartedAt === null || this.state !== 'running' ? null : now - this.runStartedAt,
      runMs: this.runMs,
      lastBeatAt: this.lastBeatAt,
      lapseMs: this.lapseMs,
      acts: { ...this.acts },
      calls: this.calls,
      tokens: { ...this.tokens },
      runUsd: round(this.runUsd),
      totalUsd: round(this.totalUsd),
      capUsd: this.capUsd,
      recent: [...this.recent],
    };
  }

  /* -- the run ----------------------------------------------------------- */

  private run(): void {
    this.state = 'running';
    this.pausedBy = null;
    this.stoppedBy = null;
    this.runStartedAt = this.now();
    this.lastBeatAt = this.now();
    this.runUsd = 0;
    const [lo, hi] = this.paceRange();
    // the first wake staggered across the first interval, so they do not arrive together
    for (const bot of this.bots) this.schedule(bot, Math.min(lo, 1_000) + Math.random() * hi);
    this.watchdog ??= setInterval(() => this.watch(), this.deps.watchMs ?? 1_000);
    this.watchdog.unref?.();
  }

  private paceRange(): [number, number] {
    return this.deps.paceMs ?? PACES[this.pace];
  }

  /** The two clocks, checked on every wake and by the watchdog. */
  private watch(): boolean {
    if (this.state !== 'running') return false;
    const now = this.now();
    if (this.lastBeatAt !== null && now - this.lastBeatAt >= this.lapseMs) { this.pause('heartbeat'); return false; }
    if (this.runStartedAt !== null && now - this.runStartedAt >= this.runMs) { this.pause('run-clock'); return false; }
    if (this.runUsd >= this.capUsd) { this.pause('spend'); return false; }
    const doc = this.deps.target.doc();
    if (doc === null || this.deps.target.generation() !== this.generation) { this.stop('target-gone'); return false; }
    return true;
  }

  private schedule(bot: Bot, delayMs: number): void {
    if (bot.timer !== null) clearTimeout(bot.timer);
    bot.timer = setTimeout(() => { bot.timer = null; void this.wake(bot); }, Math.max(0, delayMs));
    bot.timer.unref?.();
  }

  private async wake(bot: Bot): Promise<void> {
    if (!this.watch() || bot.busy) return;
    // **never in Ed's seat**: while the key-holder sits in this bot's seat
    // the bot sits out, asked afresh at every wake, so it acts again the
    // moment he switches away
    if (this.isHeld(bot)) {
      const [lo, hi] = this.paceRange();
      this.schedule(bot, lo + Math.random() * (hi - lo));
      return;
    }
    bot.busy = true;
    try {
      const doc = this.deps.target.doc()!;
      await this.tend(bot, doc);
      if (this.state === 'running') await this.act(bot, doc);
    } catch (e) {
      this.say(bot.seat.name, `✗ ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      bot.busy = false;
    }
    if (this.state === 'running') {
      const [lo, hi] = this.paceRange();
      this.schedule(bot, lo + Math.random() * (hi - lo));
    }
  }

  /** Is this bot's seat the one Ed holds right now? */
  private isHeld(bot: Bot): boolean {
    return this.deps.target.heldSeat?.() === bot.seat.id;
  }

  private halt(): void {
    this.clearTimers();
    if (this.watchdog !== null) { clearInterval(this.watchdog); this.watchdog = null; }
    for (const w of this.waiting.splice(0)) w();
  }

  private clearTimers(): void {
    for (const bot of this.bots) {
      if (bot.timer !== null) { clearTimeout(bot.timer); bot.timer = null; }
    }
  }

  /* -- reading, as the member ------------------------------------------- */

  /** What the bot's own page would be served: the blind view and the race view. */
  private read(doc: LoadedDoc, memberId: string): { m: MemberView; rv: ReturnType<typeof raceView> } {
    return { m: view(doc.cs, memberId), rv: raceView(doc, memberId, this.now()) };
  }

  /* -- writing, as the member: `applyCommand` and nothing else ----------- */

  /** One command as the bot's member. True on 200; a refusal is counted, never thrown. */
  private async send(bot: Bot, doc: LoadedDoc, cmd: string, args: Record<string, unknown>): Promise<boolean> {
    // a reset between the read and the write: the old generation is not ours
    if (this.deps.target.doc() !== doc || this.state !== 'running') return false;
    // Ed sat down in this seat between the read and the write
    if (this.isHeld(bot)) return false;
    try {
      const out = await applyCommand(this.deps.host, doc,
        { memberId: bot.seat.id, applicantId: null, isFounder: false },
        cmd, args, this.now(), { path: `/api/d/${doc.cs.slug}/cmd (demo bot)`, logRefusals: false });
      if (out.status === 503) { this.stop('host-paused'); return false; }
      if (out.status !== 200) { this.acts.refused += 1; this.say(bot.seat.name, `✗ ${cmd}: ${String(out.body.error)}`); return false; }
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (ORDINARY.test(msg)) this.acts.stale += 1;
      else { this.acts.refused += 1; this.say(bot.seat.name, `✗ ${cmd} refused: ${msg}`); }
      return false;
    }
  }

  /** The model call, one of at most `CONCURRENCY` in flight, priced into the run. */
  private async call<T>(f: (m: DemoModel) => Promise<{ value: T; usage: DemoUsage }>): Promise<T | null> {
    const model = this.model;
    if (model === null) return null;
    while (this.inFlight >= CONCURRENCY) await new Promise<void>((r) => this.waiting.push(r));
    if (this.state !== 'running') return null;
    this.inFlight += 1;
    try {
      const { value, usage } = await f(model);
      const usd = priceOf(model.info, usage);
      this.calls += 1;
      this.runUsd += usd;
      this.totalUsd += usd;
      this.tokens.input += usage.input;
      this.tokens.output += usage.output;
      this.tokens.cacheRead += usage.cacheRead;
      this.tokens.cacheWrite += usage.cacheWrite;
      if (this.runUsd >= this.capUsd) this.pause('spend');
      return value;
    } finally {
      this.inFlight -= 1;
      this.waiting.shift()?.();
    }
  }

  /* -- what a member does when they open the page (room-bots' `tend`) ---- */

  private async tend(bot: Bot, doc: LoadedDoc): Promise<void> {
    const { m } = this.read(doc, bot.seat.id);
    for (const s of m.owedOks ?? []) {
      if (await this.send(bot, doc, 'give-ok', { setting: s })) this.acts.oks += 1;
    }
    for (const b of m.owedReleases ?? []) {
      if (await this.send(bot, doc, 'ack-release', { batch: b.id })) this.acts.oks += 1;
    }
    for (const a of m.owedAmendments ?? []) {
      if (await this.send(bot, doc, 'ack-amendment', { candidate: a.candidate })) this.acts.oks += 1;
    }
    for (const d of m.owedDepartures ?? []) {
      if (await this.send(bot, doc, 'ack-departure', { member: d })) this.acts.oks += 1;
    }
    for (const h of m.owedHeld ?? []) {
      if (await this.send(bot, doc, 'ack-held', { motion: h })) this.acts.oks += 1;
    }
  }

  /* -- the act: one thing, weighted (room-bots' `act`) -------------------- */

  private async act(bot: Bot, doc: LoadedDoc): Promise<void> {
    const { m, rv } = this.read(doc, bot.seat.id);
    const cards = (rv.raceCards ?? []) as Card[];
    const openMotions = (m.motions ?? []).filter((x) => x.status === 'running' && !x.mine &&
      x.myAnswer === null && x.route === 'constitutional');
    const canPropose = m.gates.proposing && (rv.wallet ?? 0) > 0;
    const mine = (rv.mine ?? []) as Array<{ id: string; state: string }>;
    const options: Array<[string, number]> = [];
    if (cards.length && m.gates.judging) options.push(['judge', 0.55]);
    if (openMotions.length) options.push(['motion', 0.2]);
    if (canPropose) options.push(['propose', cards.length ? 0.3 : 0.7]);
    if (mine.some((c) => c.state === 'live')) options.push(['withdraw', 0.03]);
    if (!options.length) { this.acts.passes += 1; return; }
    const choice = weighted(options);
    const persona = this.personaOf(bot, m, rv.text);
    if (choice === 'judge') {
      const card = cards[0]!;
      const outcome = isSettingCard(card) ? settingVerdict(card)
        : await this.call((md) => md.judge(persona, judgeInput(card, m)));
      if (outcome === null) return;
      if (await this.send(bot, doc, 'judge-race', { a: card.a.id, b: card.b.id, outcome })) {
        this.acts.judgments += 1;
        this.say(bot.seat.name, `judged: ${outcome === 'tie' ? 'indifferent' : outcome.toUpperCase()}`);
      }
    } else if (choice === 'motion') {
      const mo = openMotions[Math.floor(Math.random() * openMotions.length)]!;
      const answer = await this.call((md) => md.answerMotion(persona,
        { summary: JSON.stringify(mo.payload), why: mo.why }));
      if (answer === null) return;
      if (await this.send(bot, doc, 'answer-motion', { motion: mo.id, answer })) this.acts.motionAnswers += 1;
    } else if (choice === 'propose') {
      await this.propose(bot, doc, persona, m, rv);
    } else if (choice === 'withdraw') {
      const live = mine.filter((c) => c.state === 'live');
      const c = live[Math.floor(Math.random() * live.length)]!;
      if (await this.send(bot, doc, 'withdraw-text', { candidate: c.id })) this.acts.withdrawals += 1;
    }
  }

  private async propose(bot: Bot, doc: LoadedDoc, persona: DemoPersona, m: MemberView,
    rv: ReturnType<typeof raceView>): Promise<void> {
    const lines = rv.text.split('\n');
    const version = rv.textVersion;
    const live = ((rv.clauses ?? []) as Array<{ candidates?: Array<{ hunks?: Array<{ start: number; end: number; lines: string[] }> }> }>)
      .flatMap((c) => (c.candidates ?? []).flatMap((cand) => cand.hunks ?? []))
      .map((h) => ({ start: h.start, end: h.end, lines: h.lines }));
    const proposal = await this.call((md) => md.propose(persona,
      { lines, blocks: blocksOf(lines, bot.seat.name), live, wallet: rv.wallet ?? 0 }));
    if (proposal === null || proposal === undefined) { this.acts.passes += 1; return; }
    const built = proposalHunks(proposal, lines);
    if ('dropped' in built) {
      this.acts.dropped += 1;
      this.say(bot.seat.name, `· dropped a proposal: ${built.dropped}`);
      return;
    }
    // every proposal named (Q1535): the demo's 👤 is *public*, which names it
    // with no flag; under an elective rung a bot signs, and under any other
    // it cannot and does not ask
    const rung = (m.settings.find((s) => s.setting === 'authorship')?.value as { rung?: string } | null)?.rung ?? '';
    const signed = /Elective$/.test(rung);
    if (await this.send(bot, doc, 'propose-text', { baseVersion: version, hunks: built.hunks,
      why: proposal.why, ...(signed ? { signed: true } : {}) })) {
      this.acts.proposals += 1;
      if (built.swap) this.acts.swaps += 1;
      this.say(bot.seat.name, built.swap ? 'proposed a swap of two sessions'
        : `proposed a change at ${built.hunks.length} place${built.hunks.length > 1 ? 's' : ''}`);
    }
  }

  private personaOf(bot: Bot, m: MemberView, text: string): DemoPersona {
    void m;
    const lines = text.split('\n');
    return { name: bot.seat.name, persona: bot.seat.persona, title: lines[0]?.replace(/^#+\s*/, '') || 'this document',
      own: blocksOf(lines, bot.seat.name).filter((b) => b.own && b.level >= 2).map((b) => b.heading) };
  }

  private say(who: string, what: string): void {
    const line = `${new Date(this.now()).toISOString().slice(11, 19)} ${who}: ${what}`;
    this.recent.push(line);
    if (this.recent.length > 30) this.recent.shift();
    this.deps.log?.(line);
  }
}

/* -- the served card, as the page reads it ------------------------------- */

interface CardOption {
  id: string;
  incumbent?: boolean;
  changes: Array<{ before: string; after: string }>;
  setting?: { settingId: string; value: unknown };
  rationale: string;
  author?: string;
}
interface Card { kind: 'edge' | 'diagonal'; subtype?: string; a: CardOption; b: CardOption }

const isSettingCard = (c: Card): boolean => c.a.setting !== undefined || c.b.setting !== undefined;

/** A card about the door is welcomed three times in four; any other setting is left alone. */
function settingVerdict(c: Card): 'a' | 'b' | 'tie' {
  const id = (c.a.setting ?? c.b.setting)?.settingId ?? '';
  if (!/^(admit|invite):/.test(id)) return 'tie';
  const newcomer = c.a.incumbent ? 'b' : 'a';
  return Math.random() < 0.75 ? newcomer : newcomer === 'a' ? 'b' : 'a';
}

/**
 * **The card as the model is shown it** — the served `CardView` and the public
 * register, and nothing else: the wording, the reason, and a proposer's name
 * only where the card itself names one (`authorVisible`, §3.5a).
 */
export function judgeInput(c: Card, m: Pick<MemberView, 'members'>): DemoJudgeInput {
  const nameOf = (id: string | undefined): string | undefined => {
    if (id === undefined) return undefined;
    return m.members.find((x) => x.id === id)?.name ?? undefined;
  };
  const opt = (o: CardOption): DemoOption => ({
    changes: o.changes, rationale: o.rationale, current: o.incumbent === true,
    ...(nameOf(o.author) ? { proposer: nameOf(o.author)! } : {}),
  });
  const subtype = c.kind === 'diagonal' ? 'diagonal' : c.subtype === 'rival' ? 'rival' : 'keep';
  return { subtype, a: opt(c.a), b: opt(c.b) };
}

function weighted(options: Array<[string, number]>): string {
  const total = options.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [k, w] of options) { r -= w; if (r <= 0) return k; }
  return options[options.length - 1]![0];
}

const round = (usd: number): number => Math.round(usd * 10_000) / 10_000;
