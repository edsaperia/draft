/**
 * **The demo preset, read** (design/DEMO.md §3; Q1535). Ed hand-edits
 * `design/demo/pizzacon-2027.md`; this turns it into a typed `DemoPreset`,
 * or into a list of refusals each naming the file line and the rule (§3.2's
 * P1–P10), so his editor can jump to the line. P11 — does the file build into
 * the document it describes — is `demo-check`'s, since it needs the builder.
 *
 * **The contract was shaped to Ed's file**, not the other way round: HTML
 * comment markers round each section, his own words for the fields
 * (*Replaces*, *With*, *Reason*, *Proposer*, *As it was*, *Adopted*), his
 * notes left where they are. Everything outside a section is prose and
 * skipped; everything inside one must be something the grammar can place,
 * so a mistyped field name is an error rather than a silently dropped line.
 *
 * Pure: no file system here beyond `presetPath`, so the tests hand it
 * strings and the builder and `demo-check` share one reading.
 */
import { join } from 'node:path';
import { CATALOGUE_BY_ID, validateFor } from '../../constitution/src/index.js';
import type { SettingId, SettingValue } from '../../constitution/src/index.js';
import { LIMITS } from './commands.js';

/** Where the preset lives under the design directory (§2.2: read at every reset). */
export const presetPath = (designDir: string): string =>
  join(designDir, 'demo', 'pizzacon-2027.md');

export type PresetState = 'fresh' | 'leaning' | 'contested';

/**
 * One place an entry changes. `from` is what stands there and `to` what the
 * entry puts in its place; an insertion (`after`) has `from` empty and
 * `anchor` the line it goes after, `null` for the top of the document.
 * A decided site reads the other way round in the file — *As it was* then
 * *Adopted* — and is held the same way: `from` as it was, `to` adopted.
 */
export interface PresetSite {
  line: number;
  after: boolean;
  anchor: string | null;
  from: string[];
  to: string[];
}

export interface PresetEntry {
  section: 'proposals' | 'decided' | 'insertions';
  label: string;
  line: number;
  sites: PresetSite[];
  reason: string;
  proposer: string;
  /** null on a decided entry, which has no live state */
  state: PresetState | null;
  /** a decided entry's losing rival, on its one site */
  rival: { to: string[]; reason: string; proposer: string } | null;
}

export interface PresetCastMember {
  line: number;
  name: string;
  persona: string;
  founder: boolean;
}

export interface DemoPreset {
  title: string;
  /** the programme as it stands at reset — the decided changes in it */
  text: string[];
  decided: PresetEntry[];
  /** `@proposals` then `@insertions`, file order within each */
  open: PresetEntry[];
  cast: PresetCastMember[];
  rules: Map<SettingId, SettingValue>;
}

export interface PresetError {
  line: number;
  rule: string;
  message: string;
}

const SECTIONS = ['title', 'text', 'proposals', 'decided', 'insertions', 'cast', 'rules'] as const;
type Section = (typeof SECTIONS)[number];

/**
 * **The demo's invariants** (§3.1): what makes it the demo rather than a
 * setting the file may move. A line may state one at this value — Ed's file
 * says them out loud — and any other value is P10.
 */
export const DEMO_INVARIANTS: ReadonlyMap<SettingId, SettingValue> = new Map<SettingId, SettingValue>([
  ['ending', { endsAtMs: null }],
  ['chamber', { rung: 'public' }],
  ['applications', { apply: false }],
  ['admission', { price: 'pen' }],
]);

/** The most sites one entry may have (P7) — a swap is two, a big move four. */
export const MAX_SITES = 12;

/** A line trimmed of one pair of wrapping backticks — Ed's quoting style. */
function unquote(s: string): string {
  const t = s.trim();
  return t.length >= 2 && t.startsWith('`') && t.endsWith('`') && !t.slice(1, -1).includes('`')
    ? t.slice(1, -1) : t;
}

/** A reason wrapped in one pair of single asterisks, read without them. */
function unitalic(s: string): string {
  const t = s.trim();
  return t.length >= 2 && t.startsWith('*') && !t.startsWith('**') &&
    t.endsWith('*') && !t.endsWith('**') ? t.slice(1, -1).trim() : t;
}

const same = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((x, i) => x.trim() === b[i]!.trim());

/** Every index at which `run` occurs as a contiguous run of `lines`. */
export function findRun(lines: readonly string[], run: readonly string[]): number[] {
  const at: number[] = [];
  if (run.length === 0) return at;
  for (let i = 0; i + run.length <= lines.length; i++) {
    if (same(lines.slice(i, i + run.length), run)) at.push(i);
  }
  return at;
}

/**
 * Where a site stands on `lines`: `[start, end)`, an insertion one past its
 * anchor with `start === end`. Null with the reason when it does not stand
 * exactly once (P4, P5, P6).
 */
export function locate(site: PresetSite, lines: readonly string[], run: 'from' | 'to' = 'from'):
  { start: number; end: number } | { error: 'absent' | 'ambiguous' } {
  if (site.after) {
    if (site.anchor === null) return { start: 0, end: 0 };
    const at = findRun(lines, [site.anchor]);
    if (at.length === 0) return { error: 'absent' };
    if (at.length > 1) return { error: 'ambiguous' };
    return { start: at[0]! + 1, end: at[0]! + 1 };
  }
  const want = run === 'from' ? site.from : site.to;
  const at = findRun(lines, want);
  if (at.length === 0) return { error: 'absent' };
  if (at.length > 1) return { error: 'ambiguous' };
  return { start: at[0]!, end: at[0]! + want.length };
}

type FieldName = 'replaces' | 'after' | 'with' | 'as it was' | 'adopted' | 'reason' | 'proposer' |
  'state' | 'losing rival' | 'rival reason' | 'rival proposer';

const FIELD_RX = /^(place\s+\d+\s+replaces|replaces|after|with|as it was|adopted|reason|proposer|state|losing rival|rival reason|rival proposer):(.*)$/i;
const OPENER_RX = /^\*\*([^*]+)\*\*(?:\s+—\s+.*)?$/;
const CAST_RX = /^\d+\.\s+\*\*([^*]+)\*\*(\s+\(founder\))?\s+—\s+(.+)$/;
const MARKER_RX = /^<!--\s*@([a-z]+)\s*-->$/;

const ALLOWED: Record<'proposals' | 'decided' | 'insertions', ReadonlySet<FieldName>> = {
  proposals: new Set(['replaces', 'after', 'with', 'reason', 'proposer', 'state']),
  insertions: new Set(['replaces', 'after', 'with', 'reason', 'proposer', 'state']),
  decided: new Set(['as it was', 'adopted', 'reason', 'proposer', 'losing rival',
    'rival reason', 'rival proposer']),
};

interface RawField { name: FieldName; line: number; values: string[]; inline: boolean }

/** Parse and validate the whole file. Every refusal is collected, never just the first. */
export function parsePreset(src: string): { preset: DemoPreset | null; errors: PresetError[] } {
  const errors: PresetError[] = [];
  const err = (line: number, rule: string, message: string): void => {
    errors.push({ line, rule, message });
  };
  const all = (src.charCodeAt(0) === 0xfeff ? src.slice(1) : src).split(/\r?\n/);

  // -- P1: the sections -----------------------------------------------------
  const bodies = new Map<Section, { line: number; lines: { n: number; s: string }[] }>();
  let open: { name: Section; line: number } | null = null;
  let body: { n: number; s: string }[] = [];
  all.forEach((raw, i) => {
    const n = i + 1;
    const t = raw.trim();
    if (t.startsWith('<!--') && t.includes('@')) {
      const m = MARKER_RX.exec(t);
      const name = m?.[1];
      if (name === undefined) { err(n, 'P1', `a marker the parser cannot read: ${t}`); return; }
      if (name === 'end') {
        if (open === null) { err(n, 'P1', '@end with no section open'); return; }
        bodies.set(open.name, { line: open.line, lines: body });
        open = null;
        return;
      }
      if (!(SECTIONS as readonly string[]).includes(name)) {
        err(n, 'P1', `unknown section '@${name}' (the seven are ${SECTIONS.map((s) => '@' + s).join(' ')})`);
        return;
      }
      if (open !== null) { err(n, 'P1', `@${name} opens inside @${open.name}, which has no @end`); }
      if (bodies.has(name as Section)) err(n, 'P1', `@${name} appears twice`);
      open = { name: name as Section, line: n };
      body = [];
      return;
    }
    if (open !== null) body.push({ n, s: raw });
  });
  if (open !== null) err((open as { line: number }).line, 'P1', `@${(open as { name: string }).name} is never closed by @end`);
  for (const s of SECTIONS) if (!bodies.has(s)) err(1, 'P1', `the @${s} section is missing`);

  // -- P2: title and text ---------------------------------------------------
  const titleLines = (bodies.get('title')?.lines ?? []).filter((l) => l.s.trim() !== '');
  if (bodies.has('title') && titleLines.length !== 1) {
    err(bodies.get('title')!.line, 'P2', `@title holds ${titleLines.length} lines; it must hold exactly one`);
  }
  const title = titleLines[0]?.s.trim() ?? '';
  const text = (bodies.get('text')?.lines ?? []).filter((l) => l.s.trim() !== '').map((l) => l.s.trim());
  if (bodies.has('text') && text.length === 0) err(bodies.get('text')!.line, 'P2', '@text is empty');

  // -- the cast (P9) — before the entries, which name its members ----------
  const cast: PresetCastMember[] = [];
  for (const { n, s } of bodies.get('cast')?.lines ?? []) {
    const t = s.trim();
    if (t === '' || t.startsWith('>') || t.startsWith('#')) continue;
    const m = CAST_RX.exec(t);
    if (!m) {
      err(n, 'P3', 'a @cast line reads `N. **Name** — how they behave`, with ` (founder)` after the one founder\'s name');
      continue;
    }
    const name = m[1]!.trim();
    const persona = m[3]!.trim();
    if (name.length > LIMITS.name) err(n, 'P9', `the name is over ${LIMITS.name} characters`);
    if (cast.some((c) => c.name === name)) err(n, 'P9', `'${name}' is in the cast twice`);
    if (persona === '') err(n, 'P9', `'${name}' has no persona`);
    cast.push({ line: n, name, persona, founder: m[2] !== undefined });
  }
  if (bodies.has('cast')) {
    const founders = cast.filter((c) => c.founder);
    if (founders.length !== 1) {
      err(bodies.get('cast')!.line, 'P9', `the cast has ${founders.length} founders; it needs exactly one, marked (founder)`);
    }
    if (cast.length - founders.length < 4) {
      err(bodies.get('cast')!.line, 'P9', `the cast has ${cast.length - founders.length} bots; it needs at least 4`);
    }
  }
  const names = new Set(cast.map((c) => c.name));

  // -- the entries (P3, P7, P8) ---------------------------------------------
  const entriesOf = (section: 'proposals' | 'decided' | 'insertions'): PresetEntry[] => {
    const out: PresetEntry[] = [];
    const lines = bodies.get(section)?.lines ?? [];
    let cur: { label: string; line: number; fields: RawField[] } | null = null;
    let lastField: RawField | null = null;
    const flush = (): void => {
      if (cur !== null) {
        const e = entryOf(section, cur, err, names);
        if (e) out.push(e);
      }
      cur = null;
      lastField = null;
    };
    for (const { n, s } of lines) {
      if (s.trim() === '') { lastField = null; continue; }
      if (/^ {2}\S/.test(s)) {
        // a run line: under a field whose own line ended at its colon
        if (lastField === null || lastField.inline) {
          err(n, 'P3', 'an indented line with no field above it to belong to');
          continue;
        }
        lastField.values.push(unquote(s.slice(2)));
        continue;
      }
      if (/^\s/.test(s)) { err(n, 'P3', 'a run line is indented by exactly two spaces'); continue; }
      const t = s.trim();
      if (t.startsWith('#') || t.startsWith('>')) { lastField = null; continue; }
      const opener = OPENER_RX.exec(t);
      if (opener) {
        flush();
        cur = { label: opener[1]!.trim(), line: n, fields: [] };
        continue;
      }
      const f = FIELD_RX.exec(t);
      if (f) {
        const name = (/^place/i.test(f[1]!) ? 'replaces' : f[1]!.toLowerCase()) as FieldName;
        if (cur === null) { err(n, 'P3', `'${f[1]}:' outside any entry — an entry opens with its **label**`); continue; }
        if (!ALLOWED[section].has(name)) { err(n, 'P3', `'${f[1]}:' has no place in @${section}`); continue; }
        const inline = f[2]!.trim();
        const field: RawField = { name, line: n, values: [], inline: inline !== '' };
        if (inline !== '') field.values.push(unquote(inline));
        (cur as { fields: RawField[] }).fields.push(field);
        lastField = field;
        continue;
      }
      err(n, 'P3', `a line the parser cannot place in @${section}: ${t.slice(0, 60)}`);
    }
    flush();
    return out;
  };

  const decided = entriesOf('decided');
  const proposals = entriesOf('proposals');
  const insertions = entriesOf('insertions');
  for (const e of insertions) {
    if (!e.sites.some((s) => s.after)) err(e.line, 'P8', `${e.label}: an insertion needs an After: site`);
  }

  // -- P4: the decided changes, worked backwards over the text --------------
  undoDecided(text, decided, err);

  // -- P5, P6, P7: the open entries against the text at reset ---------------
  const open_ = [...proposals, ...insertions];
  for (const e of open_) {
    const spans: { start: number; end: number; line: number }[] = [];
    for (const site of e.sites) {
      const at = locate(site, text);
      if ('error' in at) {
        err(site.line, at.error === 'absent' ? 'P5' : 'P6', at.error === 'absent'
          ? `${e.label}: ${site.after ? 'the After: line' : 'the Replaces: run'} is not verbatim in the text`
          : `${e.label}: ${site.after ? 'the After: line' : 'the Replaces: run'} is in the text more than once — quote more lines`);
        continue;
      }
      spans.push({ ...at, line: site.line });
    }
    spans.sort((a, b) => a.start - b.start);
    for (let i = 1; i < spans.length; i++) {
      const a = spans[i - 1]!;
      const b = spans[i]!;
      const overlap = b.start < a.end || (a.start === a.end && b.start === b.end && a.start === b.start);
      if (overlap) err(b.line, 'P7', `${e.label}: two of its sites overlap`);
    }
  }
  // P9a — an exact duplicate of another entry
  const keyOf = (e: PresetEntry): string =>
    JSON.stringify(e.sites.map((s) => [s.after, s.anchor, s.from, s.to]).sort());
  const seen = new Map<string, string>();
  for (const e of open_) {
    const k = keyOf(e);
    const other = seen.get(k);
    if (other !== undefined) err(e.line, 'P9a', `${e.label} duplicates ${other} exactly — the engine would refuse it`);
    else seen.set(k, e.label);
  }

  // -- P10: the rules -------------------------------------------------------
  const rules = new Map<SettingId, SettingValue>();
  for (const { n, s } of bodies.get('rules')?.lines ?? []) {
    const t = s.trim();
    if (t === '' || t.startsWith('>') || t.startsWith('#')) continue;
    const m = /^([a-zA-Z]+):\s*(.+)$/.exec(t);
    if (!m) { err(n, 'P3', 'a @rules line reads `id: {json}`'); continue; }
    const id = m[1]! as SettingId;
    const entry = CATALOGUE_BY_ID.get(id);
    if (!entry) { err(n, 'P10', `'${id}' is not a setting in the catalogue`); continue; }
    if (entry.retiredAnswer !== undefined) { err(n, 'P10', `'${id}' has left the surface and takes no value`); continue; }
    if (entry.kind === 'personal' || id === 'title' || id === 'link' || id === 'startingText') {
      err(n, 'P10', `'${id}' is not a rule the preset sets`);
      continue;
    }
    let value: SettingValue;
    try { value = JSON.parse(m[2]!) as SettingValue; } catch {
      err(n, 'P10', `'${id}': the value is not one line of JSON`);
      continue;
    }
    const bad = validateFor(entry, value);
    if (bad !== null) { err(n, 'P10', bad); continue; }
    const fixed = DEMO_INVARIANTS.get(id);
    if (fixed !== undefined && JSON.stringify(fixed) !== JSON.stringify(value)) {
      err(n, 'P10', `'${id}' is the demo's own and fixed at ${JSON.stringify(fixed)} (DEMO.md §3.1)`);
      continue;
    }
    if (rules.has(id)) { err(n, 'P10', `'${id}' is set twice`); continue; }
    rules.set(id, value);
  }

  if (errors.length > 0) return { preset: null, errors };
  return {
    preset: { title, text, decided, open: open_, cast, rules },
    errors,
  };
}

/** One raw entry to a checked `PresetEntry`, or null with its refusals recorded. */
function entryOf(section: 'proposals' | 'decided' | 'insertions',
  raw: { label: string; line: number; fields: RawField[] },
  err: (line: number, rule: string, message: string) => void,
  names: ReadonlySet<string>): PresetEntry | null {
  const label = raw.label;
  const sites: PresetSite[] = [];
  let reason: string | null = null;
  let proposer: string | null = null;
  let state: PresetState | null = null;
  let stateSaid = false; // a State: line was given, right or wrong
  let rival: { to?: string[]; reason?: string; proposer?: string } | null = null;
  let pending: RawField | null = null; // a site field waiting for its partner
  const once = <T,>(cur: T | null, f: RawField): boolean => {
    if (cur !== null) { err(f.line, 'P3', `${label}: '${f.name}:' is given twice`); return false; }
    return true;
  };
  const oneLine = (f: RawField): string | null => {
    if (f.values.length !== 1) { err(f.line, 'P3', `${label}: '${f.name}:' takes one line`); return null; }
    return f.values[0]!.trim();
  };
  let bad = false;
  for (const f of raw.fields) {
    if (f.values.length === 0) { err(f.line, 'P3', `${label}: '${f.name}:' is empty`); bad = true; continue; }
    const siteOpen = f.name === 'replaces' || f.name === 'after' || f.name === 'as it was';
    const siteClose = f.name === 'with' || f.name === 'adopted';
    if (pending !== null && !siteClose) {
      err(pending.line, 'P3', `${label}: '${pending.name}:' has no ${section === 'decided' ? 'Adopted:' : 'With:'} after it`);
      pending = null;
      bad = true;
    }
    if (siteOpen) { pending = f; continue; }
    if (siteClose) {
      if (pending === null) { err(f.line, 'P3', `${label}: '${f.name}:' with no site above it`); bad = true; continue; }
      const to = f.values.length === 1 && f.values[0]!.trim() === '(delete)' ? [] : f.values.map((v) => v.trim());
      if (f.values.some((v) => v.trim() === '')) { err(f.line, 'P7', `${label}: an empty line in '${f.name}:' — write (delete) to remove`); bad = true; }
      if (pending.name === 'after') {
        const anchor = oneLine(pending);
        if (anchor === null) { bad = true; pending = null; continue; }
        if (to.length === 0) { err(f.line, 'P7', `${label}: an insertion of nothing`); bad = true; }
        sites.push({ line: pending.line, after: true, anchor: anchor === '(start)' ? null : anchor, from: [], to });
      } else {
        const from = pending.values.map((v) => v.trim());
        if (same(from, to)) { err(f.line, 'P7', `${label}: the wording is identical to what it replaces`); bad = true; }
        if (section === 'decided' && to.length === 0) { err(f.line, 'P7', `${label}: a decided deletion cannot be worked backwards`); bad = true; }
        sites.push({ line: pending.line, after: false, anchor: null, from, to });
      }
      pending = null;
      continue;
    }
    switch (f.name) {
      case 'reason': if (once(reason, f)) reason = unitalic(f.values.join(' ')); break;
      case 'proposer': if (once(proposer, f)) proposer = oneLine(f); break;
      case 'state': {
        if (!once(state, f)) break;
        stateSaid = true;
        const v = oneLine(f);
        if (v !== 'fresh' && v !== 'leaning' && v !== 'contested') {
          err(f.line, 'P8', `${label}: State: is fresh, leaning or contested`);
          bad = true;
        } else state = v;
        break;
      }
      case 'losing rival':
        rival ??= {};
        if (rival.to !== undefined) err(f.line, 'P3', `${label}: 'losing rival:' is given twice`);
        rival.to = f.values.map((v) => v.trim());
        break;
      case 'rival reason':
        rival ??= {};
        rival.reason = unitalic(f.values.join(' '));
        break;
      case 'rival proposer':
        rival ??= {};
        { const who = oneLine(f); if (who !== null) rival.proposer = who; }
        break;
      default: break;
    }
  }
  if (pending !== null) {
    err((pending as RawField).line, 'P3', `${label}: '${(pending as RawField).name}:' has no ${section === 'decided' ? 'Adopted:' : 'With:'} after it`);
    bad = true;
  }
  if (sites.length === 0) { err(raw.line, 'P3', `${label}: an entry with no site`); bad = true; }
  if (sites.length > MAX_SITES) { err(raw.line, 'P7', `${label}: more than ${MAX_SITES} sites`); bad = true; }
  if (reason === null || reason === '') { err(raw.line, 'P3', `${label}: no Reason:`); bad = true; }
  if (proposer === null) { err(raw.line, 'P3', `${label}: no Proposer:`); bad = true; }
  else if (!names.has(proposer)) { err(raw.line, 'P9', `${label}: the proposer '${proposer}' is not in the cast`); bad = true; }
  if (section !== 'decided' && state === null && !stateSaid) { err(raw.line, 'P3', `${label}: no State:`); bad = true; }
  let rivalOut: PresetEntry['rival'] = null;
  if (rival !== null) {
    if (sites.length !== 1) { err(raw.line, 'P7', `${label}: a losing rival needs an entry with one site`); bad = true; }
    if (!rival.to || !rival.reason || !rival.proposer) {
      err(raw.line, 'P3', `${label}: a losing rival needs Losing rival:, Rival reason: and Rival proposer:`);
      bad = true;
    } else if (!names.has(rival.proposer)) {
      err(raw.line, 'P9', `${label}: the rival proposer '${rival.proposer}' is not in the cast`);
      bad = true;
    } else {
      rivalOut = { to: rival.to, reason: rival.reason, proposer: rival.proposer };
    }
  }
  if (bad) return null;
  return { section, label, line: raw.line, sites, reason: reason!, proposer: proposer!,
    state: section === 'decided' ? null : state, rival: rivalOut };
}

/**
 * **The text as first published** (§3.3): the text at reset with every
 * decided change worked backwards, newest first — each Adopted run put back
 * to its As it was. Each change's Adopted wording must stand exactly once in
 * the text with the later changes already undone (P4, P6); a change that does
 * not is reported through `err` and left in place.
 */
export function undoDecided(text: readonly string[], decided: readonly PresetEntry[],
  err?: (line: number, rule: string, message: string) => void): string[] {
  const lines = [...text];
  for (let k = decided.length - 1; k >= 0; k--) {
    const e = decided[k]!;
    const placed: { start: number; end: number; site: PresetSite }[] = [];
    for (const site of e.sites) {
      const at = locate(site, lines, 'to');
      if ('error' in at) {
        err?.(site.line, at.error === 'absent' ? 'P4' : 'P6', at.error === 'absent'
          ? `${e.label}: the Adopted wording is not in the text (with the later decided changes undone)`
          : `${e.label}: the Adopted wording is in the text more than once — quote more lines`);
        continue;
      }
      placed.push({ ...at, site });
    }
    if (placed.length !== e.sites.length) continue;
    placed.sort((x, y) => y.start - x.start);
    for (const p of placed) lines.splice(p.start, p.end - p.start, ...p.site.from);
  }
  return lines;
}
