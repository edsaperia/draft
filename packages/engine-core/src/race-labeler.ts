/**
 * The race-labeler — advisory naming and typing of disputes (Q49 interim,
 * ahead of the full P3 LLM layer). The engine knows a dispute's LOCATION
 * (span/footprint); this helper gives it a NATURE: a short name
 * ("treasurer oversight") and a type (copy-edit | substantive |
 * structural), so UI labels stop failing on heading-less documents.
 *
 * Like the dedup-gate, this is an ADVISORY helper OUTSIDE the Session
 * state machine: labels never enter the event log, never gate a command,
 * and replay stays bit-identical. Oracle labels are stored here, keyed by
 * race id (races are derived state, so there is nothing durable to hang
 * them on inside the fold — and advisory metadata must not be). When no
 * oracle is configured, the capability is absent, the call fails, or the
 * race's membership has changed since the label was made, the served
 * label is the deterministic fallback: nearest markdown heading plus an
 * excerpt of the contested ground. The fallback carries `type: null` —
 * it can locate a dispute but cannot honestly classify one.
 *
 * The TYPE exists to inform routing later (a copy-edit race should not
 * burn diagonal attention slots, SPEC §4.1) and the record. Nothing
 * routes on it yet: when that lands, the router consults `labelFor` by
 * race id — the label is available here, deliberately unwired (Q49).
 */

import type {
  OracleCandidate,
  RaceDescription,
  RaceType,
  SemanticOracle,
} from './oracle.js';
import { RACE_TYPES } from './oracle.js';
import type { Span } from './text/types.js';

/** A servable label: what the queue/card/record shows for a race. */
export interface RaceLabel {
  name: string;
  /** null when only the deterministic fallback spoke — it has no type opinion. */
  type: RaceType | null;
  source: 'oracle' | 'fallback';
}

/** The slice of a RaceView the labeler needs (structural, for testability). */
export interface LabelableRace {
  id: string;
  members: readonly string[];
  contested: readonly Span[];
}

export interface RaceLabelerOptions {
  /** Oracle names longer than this are truncated. Default 80. */
  nameMaxChars?: number;
  /** Fallback ground-text excerpts are truncated to this. Default 60. */
  excerptMaxChars?: number;
}

export class RaceLabeler {
  private readonly nameMaxChars: number;
  private readonly excerptMaxChars: number;
  /** Advisory store: race id → oracle label + the membership it described. */
  private readonly store = new Map<string, { membersKey: string; label: RaceLabel }>();

  constructor(
    private readonly oracle?: SemanticOracle,
    options: RaceLabelerOptions = {},
  ) {
    this.nameMaxChars = options.nameMaxChars ?? 80;
    this.excerptMaxChars = options.excerptMaxChars ?? 60;
  }

  /**
   * The label to serve for a race, synchronously: the stored oracle label
   * while the race's membership is unchanged, else the deterministic
   * fallback. Never throws, always answers.
   */
  labelFor(race: LabelableRace, documentText: string): RaceLabel {
    const stored = this.store.get(race.id);
    if (stored) {
      if (stored.membersKey === membersKey(race.members)) return stored.label;
      // Membership changed: the old name may describe a different dispute.
      this.store.delete(race.id);
    }
    return fallbackRaceLabel(documentText, race.contested, this.excerptMaxChars);
  }

  /**
   * Consult the oracle (if configured and capable) and store its label
   * for the race. Degrades to `labelFor` on every failure path — no
   * oracle, capability absent, throw, null, or malformed answer — so a
   * failed refresh never removes an existing label. Advisory only.
   */
  async refresh(
    race: LabelableRace,
    documentText: string,
    candidates: OracleCandidate[],
  ): Promise<RaceLabel> {
    const describe = this.oracle?.describeRace?.bind(this.oracle);
    if (describe !== undefined) {
      try {
        const description = await describe(
          contestedText(documentText, race.contested),
          candidates,
          { documentText, contested: [...race.contested] },
        );
        const label = this.sanitize(description);
        if (label) {
          this.store.set(race.id, { membersKey: membersKey(race.members), label });
          return label;
        }
      } catch {
        // Advisory only: an oracle failure never costs a race its label.
      }
    }
    return this.labelFor(race, documentText);
  }

  /** Accept only a well-formed description; anything else is no opinion. */
  private sanitize(description: RaceDescription | null): RaceLabel | null {
    if (description === null) return null;
    const name = truncate(collapseWhitespace(description.name ?? ''), this.nameMaxChars);
    if (name === '') return null;
    if (!(RACE_TYPES as readonly string[]).includes(description.type)) return null;
    return { name, type: description.type, source: 'oracle' };
  }
}

// ---------------------------------------------------------------------------
// Deterministic fallback (pure)

/**
 * The deterministic label: nearest markdown heading above the first
 * contested span, plus an excerpt of the contested ground text. On a
 * heading-less document the excerpt stands alone; an insertion into a
 * heading-less document degrades to its line position. No type opinion.
 */
export function fallbackRaceLabel(
  documentText: string,
  contested: readonly Span[],
  excerptMaxChars = 60,
): RaceLabel {
  const heading = nearestHeading(documentText, contested);
  const ground = contestedText(documentText, contested);
  const quote = excerptOf(ground, excerptMaxChars);
  const parts: string[] = [];
  if (heading !== null) parts.push(heading);
  if (quote !== '') parts.push(`“${quote}”`);
  if (parts.length === 0) {
    const start = contested[0]?.start ?? 0;
    parts.push(`line ${start + 1}`); // heading-less insertion: position is all we have
  }
  return { name: parts.join(' — '), type: null, source: 'fallback' };
}

/**
 * The text of a markdown heading (`#`–`######`) on or above the first
 * contested span's start line, nearest first; null if none.
 */
export function nearestHeading(
  documentText: string,
  contested: readonly Span[],
): string | null {
  const first = contested[0];
  if (!first) return null;
  const lines = documentText.split('\n');
  for (let i = Math.min(first.start, lines.length - 1); i >= 0; i--) {
    const match = /^#{1,6}\s+(.+?)\s*#*\s*$/.exec(lines[i] ?? '');
    if (match) return match[1]!;
  }
  return null;
}

/** The incumbent text of the contested spans; gaps render as `…`. */
export function contestedText(
  documentText: string,
  contested: readonly Span[],
): string {
  const lines = documentText.split('\n');
  return contested
    .map((s) => lines.slice(s.start, s.end).join('\n'))
    .filter((part) => part !== '')
    .join('\n…\n');
}

/** First non-empty line, whitespace collapsed, truncated with an ellipsis. */
export function excerptOf(text: string, maxChars = 60): string {
  const firstLine = text.split('\n').find((l) => l.trim() !== '') ?? '';
  const collapsed = collapseWhitespace(firstLine);
  if (collapsed.length <= maxChars) return collapsed;
  return `${collapsed.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`;
}

// ---------------------------------------------------------------------------

function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`;
}

function membersKey(members: readonly string[]): string {
  return [...members].sort().join(',');
}
