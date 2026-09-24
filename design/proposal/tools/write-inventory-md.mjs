/**
 * write-inventory-md.mjs — Q1541 stage 1: inventory.json → inventory.md.
 * Run after build-inventory.mjs. Throwaway.
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROP = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const SHOTS = join(PROP, 'shots', 'current');
const out = JSON.parse(await readFile(join(PROP, 'inventory.json'), 'utf8'));
const { records, zones, evidence: EV, kinds: kindsSummary, notReached, meta } = out;
const audit1600 = JSON.parse(await readFile(join(PROP, 'data', 'audit-1600.json'), 'utf8'));
const rollupCounts = {};
for (const f of audit1600.rollup || []) rollupCounts[f.rule] = (rollupCounts[f.rule] || 0) + f.cards.length;

const clip = (s, n = 160) => { s = String(s ?? '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/</g, '&lt;');
const shotLink = (f) => (f ? '[' + f + '](shots/current/' + f + ')' : '—');
const L = []; const P = (s = '') => L.push(s);
const FAMS = [['judgment', 'Judgment cards (the charter)'], ['composer', 'Your own proposals (the composer)'], ['record', 'Records'],
  ['setting', 'Settings cards (the band)'], ['power', 'Power cards ✒️ 🛡️'], ['motion', 'Motions and 👑 questions'],
  ['news', 'News, grants, gates, park'], ['lifecycle', '🍾 and 🥂'], ['door', 'Doors (✉️ ❌ 🌂 adm: the stranger)'], ['identity', 'Identity ✋ 🖼️ 📧']];
const groupKey = (r) => r.state.replace(/ · (the founder|a stranger|member m-\d+)/, '');
const byId = new Map(records.map((r) => [r.id, r]));
const shotFor = (id) => { const r = byId.get(id.split(' — ')[0]); return r ? r.shot || r.shotOf : null; };
const firstShot = (ids) => { for (const id of ids) { const s = shotFor(id); if (s) return s; } return null; };

P('# Inventory — the surface as it stands (Q1541, stage 1)');
P();
P('Generated ' + out.generated.slice(0, 16).replace('T', ' ') + ' UTC from the payloads in `design/proposal/data/` by `tools/build-inventory.mjs` (→ `inventory.json`, which stage 2 counts from) and `tools/write-inventory-md.mjs` (→ this file). Every card was opened by a script and measured in the DOM at **1600×1000** and **390×844**; nothing here is a redrawing.');
P();
P('**How it was made.** `tools/inventory-audit.mjs` is a copy of `design/tools/card-audit.mjs` that also reads each card\'s slots in order and its rail entry, crops a screenshot, re-shoots the *delegated* state after the rung is chosen, and adds two walks (`sessionband`, `closedband`) for the band\'s cards on the session and closed fixtures, which the audit\'s charter walks never open. `tools/live-shots.mjs` stood a phase-ladder document (seed 42) at each of the five rungs on a throwaway dev server (port 8177, scratch data dir, killed after) and opened every card offered to the founder, two members and a stranger (at most three of any one key shape per seat). `tools/edit-shots.mjs` typed into the column in edit mode for the editing card. `tools/zone-shots.mjs` cropped the non-card zones. No product file was touched.');
P();
P('**Reading a state.** A state is the walk that reached it: *founding* (unanswered), *answers*, *delegated* (collecting), *settled* (⏩ plus five seeded motions — carried, held, crowned, running constitutional, running ordinary — seen by the founder), *seat:1* (a member, the motions\' mover), *seat:stranger*, *charter* (session fixture), *closed*, *sessionband*, *closedband*, *edit*, and *live · rung · seat*. On the fixture charter the state also names the item\'s fixture state (needs · deciding · sealed, deadlocked, outcome); everywhere the rail entry\'s mark is appended where the card has one. One screenshot per kind × state × width; the other cards in the group point at it (`shotOf` in the JSON). **Geometry caveat:** glyph and clause travel are card-audit\'s measurements and are trustworthy on the fixture walks, which run at scroll 0 with the motion stubbed; on the live walks a card is opened from its rail entry, which travels the page to it, so a live travel figure mixes the scroll in and is not evidence of a moving tab.');
P();
P('## Summary');
P();
P('| | |');
P('|---|---|');
P('| card records (key × state × width) | ' + out.counts.records + ' |');
P('| card kinds listed (SURFACE §9 rows, split where one row draws two shapes) | ' + out.counts.kindsListed + ' |');
P('| kinds reached | ' + out.counts.kinds + ' of ' + out.counts.kindsListed + ' |');
P('| distinct kind × state pairs (both widths) | ' + out.counts.states + ' |');
P('| non-card zone crops | ' + out.counts.zones + ' |');
P('| screenshots in `shots/current/` | ' + out.counts.shots + ' PNG, ' + out.counts.shotMB + ' MB |');
P();
P('| family | kind | SURFACE §9 row | reached | states | records @1600 | @390 |');
P('|---|---|---|---|---|---|---|');
for (const [fam] of FAMS) for (const k of kindsSummary.filter((x) => x.family === fam)) {
  P('| ' + fam + ' | `' + k.kind + '` | ' + esc(k.row) + ' | ' + (k.reached ? 'yes' : '**no**') + ' | ' + k.states.length + ' | ' + k.at1600 + ' | ' + k.at390 + ' |');
}
P();
P('## Not reached');
P();
notReached.forEach((n, i) => P((i + 1) + '. **' + n.row + '** — ' + n.why));
P();
P('## Evidence carried from the title-card fix (2026-09-24) — inputs for stage 2');
P();
const bins = EV.E2_bin_alone_rows.reduce((a, id) => { const r = byId.get(id); a[r.kind] = (a[r.kind] || 0) + 1; return a; }, {});
P('1. **The *Set to … / Set by …* standing block repeats the card\'s head** (`readBody`, design/setup.js:801 — a `statline` then a `lockline`). **' + EV.E1_readBody_standing_block.length + '** records: every read-only setting card (📍, 🌍, ⏱️, any setting whose ✒️ was laid down) on the member, stranger, closed and live walks. Example: ' + shotLink(firstShot(EV.E1_readBody_standing_block)) + '. **And a worse case:** on the live ladder at the *constitution* rung a member opening 🌍 or ❌ reads **"Set to undefined"** — ' + shotLink('chamber-live_constitution_m-1-1600.png') + ' (also at 390).');
P('2. **A card with nothing left to change has a commit row of 🗑️ alone**, where SURFACE §9.1 / CP9 give such a row 🗑️ + OK. **' + EV.E2_bin_alone_rows.length + '** records; by kind: ' + Object.entries(bins).map(([k, n]) => '`' + k + '` ' + n).join(', ') + '. Some are 🗑️-as-withdraw by rule (a member\'s own proposal, the editing card, a mover\'s motion); the read-only settings, 🎩 once locked, 🪪 🤝, the doors for a member and the non-founder 👑 are the CP9 cases.');
P('3. **The closed document\'s charter cards draw an empty commit row whose hairline stands over nothing** (placeholder spans `binslot`, `rightpair`). card-audit P12 counts **' + (rollupCounts.P12 || 0) + '** at 1600; here **' + EV.E3_P12_orphan_hairlines.length + '** records across both widths, every one `bottom: div.race-mid.commitrow (top)`. Example: ' + shotLink(firstShot(EV.E3_P12_orphan_hairlines)) + '.');
P('4. **On the closed fixture ⏱️ says three things about who decided it**: the standing block *Decided by the members.*, the head radio *Chosen by the Founder ✒️*, its latest record *Changed by the Founder: a new proposal every 45 minutes* — with *Set to One every 45 minutes* restating the clause beneath. Records: ' + EV.E4_rate_provenance_contradiction.map((x) => '`' + x.split(' — ')[0] + '`').join(', ') + '; shot ' + shotLink(shotFor(EV.E4_rate_provenance_contradiction[0] || '')) + '.');
P('5. **On the closed fixture the founder\'s settings still offer live *Choose this* radios and *Picking a value here takes it back*** on a document where nothing can change. **' + EV.E5_closed_takeback_live_radios.length + '** records (' + new Set(EV.E5_closed_takeback_live_radios.map((x) => x.split('|')[0])).size + ' cards × 2 widths): ' + [...new Set(EV.E5_closed_takeback_live_radios.map((x) => x.split('|')[0]))].join(', ') + '.');
P();
P('**Found along the way** (numbered on, for stage 2):');
P();
P('6. **🥂 states the closing moment twice** — its head *The document closed at 00:42 on 25 September. 2 members have signed it.* and a blue box beneath, *The document is final as of 00:42 on 25 September.* ' + shotLink('closing-closedband-1600.png') + '.');
P('7. **The floating 📝 (`edit-door`) covers the right rail\'s lowest entries at 1600** on the session fixture (the ✏️ and ↻ entries) — ' + shotLink('page-session-1600.png') + '. The dev switch likewise covers the contents rail\'s foot, but it is stagehand furniture.');
P('8. **In edit mode a single-site draft carries 🗑️ and ✏️ twice** — the card\'s own row and the floating proposal-row, which at the window\'s foot overlaps the card — ' + shotLink('editing-gap-site-1600.png') + '. And a gap draft\'s head reads *A new clause after: ‹the clause before›…* where M19 heads a gap race *The gap as it stands / (no text here)*: one place, two heads.');
P('9. **The 👑 Text question\'s ✒️ accept is drawn solid green** beside a flat 🛡️, where §9.1 reserves solid green for ✓; its strip\'s tab is the race\'s 💡, not 👑 — ' + shotLink('crown_cq-4-live_session_founder-1600.png') + '.');
P('10. **At 390 there is no edit door and no riding 📝 tab** (MOBILE.md: read + judge), yet edit mode opens if the tab is clicked by script, and the lifted column then stands 64px off the left edge and flush with the right — ' + shotLink('page-editmode-390.png') + '.');
P('11. **The contents rail\'s marks run past the left drawer\'s edge at 390** (*…8 more* cut by the glass) — ' + shotLink('page-drawer-left-390.png') + '.');
P();
P('card-audit\'s rollup at 1600, for reference: ' + Object.entries(rollupCounts).map(([k, n]) => k + ' ' + n).join(' · ') + ' sightings. S1 is the spacing grid (`.sugg` 15.13px side margins and 14px padding, `.headclause` 6px padding, `.setupcard` −17px top margin — all off `--s1…--s5`).');
P();

for (const [fam, title] of FAMS) {
  const ks = kindsSummary.filter((k) => k.family === fam && k.reached);
  if (!ks.length) continue;
  P('## ' + title);
  P();
  for (const k of ks) {
    const rs = records.filter((r) => r.kind === k.kind);
    const keys = [...new Set(rs.map((r) => r.key))];
    P('### `' + k.kind + '` — ' + esc(k.row));
    P();
    P('Rules: ' + (rs[0].rules || []).join(', ') + '. Keys: ' + keys.slice(0, 14).map((x) => '`' + x + '`').join(' ') + (keys.length > 14 ? ' … (' + keys.length + ')' : '') + '.');
    P();
    const byState = new Map();
    for (const r of rs) { const g = groupKey(r); if (!byState.has(g)) byState.set(g, []); byState.get(g).push(r); }
    P('| state | cards | 1600 | 390 | commit row | P12 faults | glyph travel on open |');
    P('|---|---|---|---|---|---|---|');
    for (const [st, g] of byState) {
      const w16 = g.filter((r) => r.width === 1600); const w39 = g.filter((r) => r.width === 390);
      const pick = (w) => (w.find((r) => r.shot) || w[0] || {});
      const a = pick(w16); const b = pick(w39); const rep = w16[0] || g[0];
      const faults = g.filter((r) => r.orphanHairlines.length).length;
      P('| ' + esc(st) + ' | ' + new Set(g.map((r) => r.key)).size + ' | ' + shotLink(a.shot || a.shotOf) + ' | ' + shotLink(b.shot || b.shotOf) + ' | ' +
        esc(rep.commitRow.join(' · ') || '(none)') + ' | ' + (faults ? faults + '/' + g.length : '—') + ' | ' + (rep.tab.travel ? rep.tab.travel.join(', ') : '—') + ' |');
    }
    P();
    for (const [st, g] of byState) {
      const w16 = g.filter((x) => x.width === 1600);
      const r = w16.find((x) => x.shot) || w16[0] || g[0];
      const n = g.find((x) => x.width === 390 && x.key === r.key);
      const s = r.strings;
      P('<details><summary><b>' + esc(st) + '</b> — <code>' + esc(r.key) + '</code></summary>');
      P();
      P('- **Slots, in order:** ' + (r.slots.map((x) => x.role + (x.lines.length ? ' [' + x.lines.join('/') + ' rule]' : '') + (x.text ? ' “' + esc(clip(x.text, 70)) + '”' : '')).join(' → ') || '(none read)'));
      P('- **Dividers:** ' + (r.dividers.length ? r.dividers.map((d) => d.between.join(' | ') + (d.contentBothSides ? '' : ' **(nothing on one side)**')).join('; ') : 'none between top-level slots') +
        (r.orphanHairlines.length ? ' — **P12:** ' + r.orphanHairlines.map((h) => h.kind + ' ' + (h.a || '') + (h.b ? ' / ' + h.b : '')).join(', ') : ''));
      P('- **Controls:** ' + (r.controls.map((c) => c.kind === 'radio' ? 'radio “' + esc(clip(c.label, 40)) + '”' + (c.on ? ' (on)' : '')
        : c.kind === 'input' ? c.type + ' field' + (c.placeholder ? ' “' + esc(c.placeholder) + '”' : '')
        : 'button ' + (c.label || '?') + ' — ' + esc(clip(c.does, 80))).join('; ') || 'none'));
      P('- **Strings:** ' + ([s.eyebrow && 'eyebrow “' + clip(s.eyebrow, 80) + '”', s.head && 'head “' + clip(s.head, 120) + '”', s.standing && 'standing “' + clip(s.standing, 100) + '”',
        s.lock && 'lockline “' + clip(s.lock, 100) + '”', s.helpers.length && 'notes ' + s.helpers.map((h) => '“' + clip(h, 90) + '”').join(' '),
        s.options.length && 'options ' + s.options.slice(0, 6).map((o) => '“' + clip(o, 60) + '”').join(' ')].filter(Boolean).map(esc).join(' · ') || '—'));
      P('- **All visible text:** ' + esc(clip(s.all, 420)));
      P('- **Tab and rail:** tab ' + (r.tab.glyph || '—') + ', glyph travel ' + JSON.stringify(r.tab.travel) + ', clause travel ' + JSON.stringify(r.clauseTravel) +
        (r.tab.outside ? ', ' + r.tab.outside + ' tab(s) outside the card' : '') + '; rail ' + (r.rail ? (r.rail.mark || '') + ' “' + esc(clip(r.rail.text, 80)) + '”' : 'no entry'));
      P('- **Geometry:** ' + (r.card && r.card.r ? Math.round(r.card.r[2]) + '×' + Math.round(r.card.r[3]) + 'px at x ' + Math.round(r.card.r[0]) : '?') + ', radius ' + (r.card && r.card.radius) + ', border ' + (r.card && r.card.border) +
        (n && n.card && n.card.r ? '; at 390 ' + Math.round(n.card.r[2]) + '×' + Math.round(n.card.r[3]) + 'px, page ' + (n.screen ? n.screen.scrollW : '?') + 'px wide' + (n.tab.travel ? ', glyph travel ' + JSON.stringify(n.tab.travel) : '') : ''));
      if (r.findings.length) P('- **card-audit:** ' + r.findings.slice(0, 5).map((f) => esc(clip(f, 110))).join('; '));
      if (r.proposalRow) P('- **Proposal row:** “' + esc(clip(r.proposalRow.text, 80)) + '” — ' + r.proposalRow.buttons.map((b) => (b.t || '').trim() + (b.disabled ? ' (dark)' : '')).join(' · '));
      P('- **Shot:** ' + shotLink(r.shot || r.shotOf) + (new Set(g.map((x) => x.key)).size > 1 ? ' · same state: ' + [...new Set(g.map((x) => x.key))].slice(0, 12).map((x) => '`' + x + '`').join(' ') : ''));
      P();
      P('</details>');
      P();
    }
  }
}

P('## Non-card zones');
P();
P('Cropped by `tools/zone-shots.mjs` (fixture: the birth, the mail modal, the save, ⏩ settled, a member, the stranger\'s door, the session, the sheet break, edit mode, the session band, the closed page and its foot) and one full-window shot per live rung × seat.');
P();
P('| zone | state | 1600 | 390 | box @1600 (x, y, w, h) | what it holds @1600 |');
P('|---|---|---|---|---|---|');
const zk = new Map();
for (const z of zones) { const k = z.zone + '|' + z.state; if (!zk.has(k)) zk.set(k, {}); zk.get(k)[z.width] = z; }
const why = (z) => (!z || !z.zone ? '—' : z.shot ? shotLink(z.shot) : z.missing ? 'not drawn' : z.empty ? 'zero box' : z.error ? 'error' : '—');
for (const [k, v] of zk) {
  const [zone, state] = k.split('|');
  const a = v[1600]; const b = v[390];
  P('| ' + zone + ' | ' + state + ' | ' + why(a) + ' | ' + why(b) + ' | ' + (a && a.r ? a.r.map(Math.round).join(', ') : '—') + ' | ' + esc(clip((a && (a.text || a.note)) || '', 150)) + ' |');
}
P();
const livePages = (await readdir(SHOTS)).filter((f) => /^page-live_/.test(f)).sort();
P('**Live ladder pages** (rung × seat × width): ' + livePages.map(shotLink).join(' · '));
P();
P('**Zone notes.** The topbar holds, left to right, 🪶 and the title; pulse · clock · quorum · the room\'s faces; the wallets (✏️ count and drip clock, ✒️ ∞, 🛡️ ∞, 🏛️) and `me` — see the topbar shots. At 390 the topbar is two rows, the right rail is the `task-sheet` (peek and raised), the contents rail the left drawer, and the floating 📝 and the riding tab are not drawn. The band at the birth has no box — the birth is one sheet with the title and link in `#titlepara`. The closed page folds *Rules* by default; the closed-band walk unfolds it.');
P();
P('## Instrument errors');
P();
for (const [k, v] of Object.entries(meta.errors)) if (v.length) P('- `' + k + '`: ' + v.slice(0, 10).map((e) => esc(clip(e, 110))).join('; ') + (v.length > 10 ? ' … (' + v.length + ')' : ''));
P();
await writeFile(join(PROP, 'inventory.md'), L.join('\n'));
console.log('inventory.md: ' + L.length + ' lines');
