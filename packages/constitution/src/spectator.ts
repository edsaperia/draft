/**
 * The spectator's half of the constitution (Q1466, Ed 2026-09-19: *of course
 * motions on settings should appear in the feed*): a strictly-public
 * projection of **what was proposed about the rules, and what passed** —
 * engine-core's `SpectatorApi` does the same for the text, and a spectator
 * surface reads these two and nothing else.
 *
 * What it carries: a motion to change a **setting** from the moment it is
 * put — what stood, what it would put there, and the mover's reason, which is
 * *public like the amendment itself* (`MotionRecord.why`) — that it passed,
 * and how long that took; and the Founder's own ✒️ change to a rule after the
 * document began, which the record calls an amendment and names by office.
 * **A motion that ends without carrying is taken back off it** (issue #87):
 * a vote against, a withdrawal, the close's keep.
 *
 * What it never carries:
 *  - **who moved it** — a motion's authorship is sealed (`by` never leaves);
 *  - **any answer, count or direction** on a motion still open (SPEC §3.5);
 *  - **anything about a person**: a motion to invite, remove or admit somebody
 *    is about a member or a stranger and not about a rule, and an invitee's
 *    address is nobody's to print — those motions make no entry here;
 *  - the founding: what the Founder chose and what the blind founding resolved
 *    before the document began were never proposals to anybody.
 *
 * **What stood is read off the fold itself**, stepped through the log one
 * event at a time, and not reconstructed beside it: whether a carried motion
 * applies at once or waits on the Founder's 🛡️ is `reservedTarget`'s
 * decision over live fold state, and a second opinion about that would
 * eventually disagree with the first. The replay is over a scratch `People`,
 * since nothing here reads an identity.
 */
import { CATALOGUE } from './catalogue.js';
import type { SettingId } from './catalogue.js';
import { FoldState, apply } from './fold.js';
import { spellWords } from './meaning.js';
import { InMemoryPeople } from './people.js';
import type { LogEntry, MotionId } from './types.js';
import { eqValue } from './values.js';
import type { SettingValue } from './values.js';

export interface SettingFeedEntry {
  t: number;
  /** `proposed` a motion was put · `adopted` it passed and stands · `decreed` the Founder's ✒️ set it. */
  kind: 'proposed' | 'adopted' | 'decreed';
  /** Null on `decreed`, which was never a motion. */
  motionId: MotionId | null;
  setting: SettingId;
  glyph: string;
  /** Which way it was put: to the membership's vote, or to everybody's agreement. */
  route: 'ordinary' | 'constitutional' | 'pen';
  /** The value that stood when the entry happened; null where none had been set. */
  from: SettingValue | null;
  to: SettingValue;
  rationale: string;
  /** `adopted` only: from the moment it was put to the moment it stood. */
  tookMs?: number;
  /**
   * 💤's spell in words, the module's own (`spellWords` — *7 days*, *90
   * minutes*), for the one value whose wording is the module's and not the
   * page's. Present only on a 💤 entry, and only beside a value that is a spell.
   */
  fromSpell?: string;
  toSpell?: string;
}

const GLYPH = new Map(CATALOGUE.map((e) => [e.id as string, e.glyph]));
const RULE = new Set(CATALOGUE.filter((e) => e.kind !== 'personal').map((e) => e.id as string));

const spellOf = (v: SettingValue | null): string | undefined => {
  const ms = (v as { afterMs?: number | null } | null)?.afterMs;
  return typeof ms === 'number' ? spellWords(ms) : undefined;
};

/** Every settings motion put and every one that passed, oldest first. */
export function settingFeed(log: readonly LogEntry[]): SettingFeedEntry[] {
  const made: SettingFeedEntry[] = [];
  const out = { push: (e: SettingFeedEntry): void => {
    if (e.setting === 'lapse') {
      const f = spellOf(e.from), t = spellOf(e.to);
      if (f !== undefined) e.fromSpell = f;
      if (t !== undefined) e.toSpell = t;
    }
    made.push(e);
  } };
  const s = new FoldState(new InMemoryPeople());
  const standing = (id: SettingId): SettingValue | null => s.settings.get(id)?.value ?? null;
  for (const entry of log) {
    const ev = entry.event;
    // the motion this event may have settled, and what stood before it did
    let watched: MotionId | null = null;
    if (ev.type === 'motion-carried' || ev.type === 'motion-adjudicated') watched = ev.motion;
    if (ev.type === 'crown-question-answered' || ev.type === 'crown-question-auto-passed') {
      watched = s.crownQuestions.get(ev.question)?.motion ?? null;
    }
    const rec = watched === null ? undefined : s.motions.get(watched);
    const was = rec && rec.payload.kind === 'set' ? standing(rec.payload.setting) : null;
    const statusWas = rec?.status;
    const begun = s.constitutedT !== null;
    const stoodForSet = ev.type === 'setting-set' ? standing(ev.setting) : null;

    apply(s, ev, entry.seq);

    if (ev.type === 'motion-opened' && ev.payload.kind === 'set' && ev.route !== 'pen' &&
        RULE.has(ev.payload.setting)) {
      const m = s.motions.get(ev.motion)!;
      out.push({ t: ev.t, kind: 'proposed', motionId: ev.motion, setting: ev.payload.setting,
        glyph: GLYPH.get(ev.payload.setting) ?? '', route: ev.route,
        // read before the fold could have moved it: opening a motion never sets a value
        from: standing(ev.payload.setting), to: ev.payload.value, rationale: m.why ?? '' });
    } else if (rec && rec.payload.kind === 'set' && statusWas !== 'carried' &&
        rec.status === 'carried' && rec.moot === null && RULE.has(rec.payload.setting)) {
      out.push({ t: ev.t, kind: 'adopted', motionId: rec.id, setting: rec.payload.setting,
        glyph: GLYPH.get(rec.payload.setting) ?? '',
        route: rec.route === 'pen' ? 'pen' : rec.route,
        from: was, to: rec.payload.value, rationale: rec.why ?? '', tookMs: ev.t - rec.openedAtT });
    // **the Founder's ✒️ after the start is `crown`, never `convenor`** (issue
    // #68 finding 2): `setSetting` stamps `by: postStart ? 'crown' : 'convenor'`
    // and is the only emitter, so the old test could never be true and no ✒️
    // change to a rule ever made an entry. `begun` is implied by `crown` and
    // kept as the statement of what this branch is about.
    // **…and a ✒️ that restates what stands changes no rule** (issue #87 F3):
    // `setSetting` emits unconditionally, and both sides of *as it stood / as
    // it stands* would print the same sentence — the fold's own test
    // (Q1348, R-105: a pen that restates what stands shifts no ground)
    } else if (ev.type === 'setting-set' && ev.by === 'crown' && begun && RULE.has(ev.setting) &&
        (stoodForSet === null || !eqValue(stoodForSet, ev.value))) {
      out.push({ t: ev.t, kind: 'decreed', motionId: null, setting: ev.setting,
        glyph: GLYPH.get(ev.setting) ?? '', route: 'pen',
        from: stoodForSet, to: ev.value, rationale: ev.why ?? '' });
    }
    // **a motion that ends without carrying leaves the feed** (issue #87 F1;
    // spectator-api.ts's splice at `candidate-withdrawn`, for the rules): a
    // vote against (Q1473, R-138), the mover's withdrawal and the close's
    // keep. A carried motion never reaches these events; a motion that never
    // made an entry — a person's, the pen's — finds nothing to take away.
    if (ev.type === 'motion-held' || ev.type === 'motion-withdrawn' ||
        ev.type === 'motion-kept-at-close') {
      const at = made.findIndex((e) => e.kind === 'proposed' && e.motionId === ev.motion);
      if (at >= 0) made.splice(at, 1);
    }
  }
  return made;
}
