/* cards.js — the decision-card grammar, lifted out of session-view.html
 * (2026-08-18, the system.css move again: two copies of one card drift, and
 * the setup surfaces had been imitating this machinery by hand).
 *
 * Two layers:
 *   - pure exports: string in → HTML out (the diff/markdown engine, the card
 *     sub-builders that read only their own arguments, the drawn glyphs);
 *   - CARDS.make(env): the builders that read surface state — who picked
 *     what, what is locked, what the wash is — with that state crossing the
 *     seam as functions **evaluated at call time**, never as values captured
 *     at make() time. Session-view's `topUrgentId` is a reassigned `let`,
 *     its `chilled` a mutable Set, its `laneMode` mutable: a value captured
 *     once would be silently stale forever.
 *
 * The function bodies are session-view's own, comments and all — the only
 * changes are the seam lines (env.* where a module global stood, the two new
 * clauseHeadHtml params, and `valAttr` where `data-v` was hard-coded, so a
 * surface whose radios speak data-mval can use the same builder). The
 * contamination guard for the lift is design/tools/session-probe.js against
 * design/reference/: card HTML byte-identical, geometry 0.0px.
 */
window.CARDS = (function () {
  'use strict';

  // Every member-readable string this grammar renders lives in copy.js
  // (Ed's brief, 2026-09-05, Part 3: copy edits touch that file only); `G`
  // is the grammar's own section of it. copy.js loads before this file.
  const G = window.COPY.grammar;

  // Full five-character escaping (PRODUCTION.md stage 3, defect 4): esc'd
  // strings land in attribute values as well as text (a lane's valAttr
  // carries member-proposed setting values on the live page), and an
  // unescaped quote there is an injection, not a rendering quirk. For text
  // nodes the extra entities parse back to the identical DOM. Coerces first:
  // this is the one `esc` on the surface (setup.js took its own copy until
  // refactor item 8), and a number or a missing value escapes as its text
  // rather than throwing inside a render.
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  // The urgency ramp's two ends: how much a rail entry's wash saturates at no
  // urgency and at the most. session.js's `washCol` and setup.js's `washOf`
  // both read them here, so the charter's entries and the band's take one
  // ramp (Q623 (a)) — they were two literals kept equal by hand.
  const URG_LO = 0.05, URG_HI = 0.30;

  // Decision cards show the text as it would *stand*, not a redline: the struck
  // words come out and only what is new stays lit. The fixture keeps the full
  // diff, because this is a rendering — which is what made it cheap to put the
  // redline back in 274 and cheap to take it out again when Ed reversed that
  // 2026-08-17. Nothing about the data changed either time.
  //
  // A proposal that removes the text **entirely** would come out of here as an
  // empty string, and blank is the one rendering that cannot be told from
  // unchanged — so that case says so in words (Ed, 274).
  function resultOnly(marked) {
    const out = marked
      .replace(/\s*<del>[\s\S]*?<\/del>\s*/g, ' ')          // a cut leaves one space behind…
      .replace(/\s+((?:<\/?ins>)*)([,.;:!?’”)])/g, '$1$2')  // …which closes up before punctuation
      .replace(/(<ins>)\s+/g, '$1')                          // a highlight never opens on a space
      .replace(/\s{2}/g, ' ')
      .trim();
    return out.replace(/<[^>]*>/g, '').trim()
      ? out : '<div class="lp empty"><br></div>';
  }

  const stripTags = (h) => String(h).replace(/<[^>]+>/g, '');

  // Rounded to whole percent: the second decimal was never doing anything but
  // suggesting the model is more precise than it is.
  const pct = (x) => Math.round((x ?? 0) * 100) + '%';

  // The rail is already a margin against the document; the section sign is a
  // citation mark, and nothing here is being cited (Ed, 188).
  const plainLabel = (t) => String(t ?? '').replace(/^§\s*/, '');

  // **The drawn ✓ is a control, not a mark** (Q1360). It was the same constant
  // as the adopted mark from 2026-08-17 until Q1360 gave the marks their own
  // pictures, and the two part company here: a commit is *pressed*, it greys
  // while nothing is chosen and it lights on `--primary` when armed, all of
  // which want `currentColor` and none of which a colour picture can do. So
  // `.mkg` — one stroke width, `fill: none`, `stroke: currentColor` — is the
  // stroke family's class, and `CROSS` went with the marks: nothing but `MARK`
  // had ever used it.
  const TICK = "<svg class=\"mkg\" viewBox=\"0 0 12 12\" aria-hidden=\"true\"><path d=\"M2 6.4 L4.7 9.2 L10 2.9\"/></svg>";
  // **The third filed mark** (Ed, Q469, 2026-08-20: *⏸️ it is! — but draw
  // your own to match ✔️*). A race unresolved at the close is *undecided*,
  // distinct from kept (SPEC §4.6): two vertical bars at the tick and
  // cross's own stroke width, spanning the cross's height, in currentColor.
  //
  // **And it is the one mark Q1360 did not hand to Fluent** (Ed, 2026-09-15,
  // on the first build's finding 1). Fluent's ⏸ is its *pause button*: a filled
  // blue plate with two white bars knocked out of it, which is word for word
  // what Ed rejected on 2026-08-17 — *they carry their own background unlike
  // all the other symbols* — and at 12px, drained, it reads as a grey square
  // whose contents you cannot make out. Two bars on the tick's own stroke say
  // the same thing and stay in the alphabet. ↻ is the same ruling; see `MARK`.
  const PAUSE = "<svg class=\"mkg\" viewBox=\"0 0 12 12\" aria-hidden=\"true\"><path d=\"M4.3 2.9 L4.3 9.1 M7.7 2.9 L7.7 9.1\"/></svg>";
  const VS16 = "︎";
  // **The alphabet is Fluent Emoji, Flat, in colour — except ⏸ and ↻** (Ed,
  // 2026-09-15, Q1360: *Fluent Flat is perfect!*, and the same day: *keep the
  // hand-drawn ⏸ and ↻ for those two alone*). Q288 had drawn six silhouettes by
  // hand and inked all thirteen from the palette; the drawings were path
  // coordinates written blind, never rendered beside the emoji they replaced,
  // and Ed's first look at them was *they look very different … I'd like them
  // to look more exactly like they look here ✏️✒️*. A proof sheet put the OS
  // emoji, those drawings and Microsoft's Fluent Flat and Color files side by
  // side, and Flat won.
  //
  // The two exceptions are the two Fluent files that are **buttons** rather
  // than pictures of a thing — a filled plate with a white shape knocked out —
  // and that shape of object was rejected in this alphabet on 2026-08-17, and
  // again on sight in 2026-09-15's build. So ⏸ stays the two drawn bars above
  // and ↻ stays the character it always was; the palette paints those three
  // kinds and the eight pictures below — ten of the thirteen kinds, the check
  // and the multiply each serving a decided kind and its filed twin — bring
  // their own colour.
  //
  // What survives of Q288 is the **rule**: every lifecycle mark is drawn, which
  // now means *one set, the same picture on every machine* rather than whichever
  // emoji font the reader happens to have. What does not survive is Q288's
  // reasoning that the palette has to be able to reach every mark — these
  // pictures bring their own colour and keep it. Grey is still how the surface
  // says nothing is asked of you, and a **filed** picture gets it by
  // desaturation (`.mk-filedYes`, `.mk-filedNo` in system.css) where ⏸ and ↻
  // get it by being painted `--muted` as they always were.
  //
  // Source: https://github.com/microsoft/fluentui-emoji — Copyright (c)
  // Microsoft Corporation, **MIT licence** (its LICENSE file). Each picture is
  // its file's paths verbatim, on the file's own `viewBox="0 0 32 32"`, with
  // `width`/`height`/`xmlns` dropped so the CSS box decides the size. No
  // gradients, no filters and no ids, so nothing can collide between two marks
  // on one page.
  //
  // `.mkp` is the picture class and it carries **sizing only**. It is not
  // `.mkg`: that rule sets `fill: none; stroke: currentColor`, and CSS beats a
  // path's own `fill` presentation attribute, so every one of these would come
  // out as an empty outline. `data-mk` names the picture for anything that has
  // to recognise one without a `.mk-<kind>` wrapper around it — card-audit's P8
  // asks for the check.
  const mkSvg = (name, d) => '<svg class="mkp" viewBox="0 0 32 32" data-mk="'
    + name + '" aria-hidden="true">' + d + '</svg>';
  // an idea on the table — light bulb
  const BULB = mkSvg('bulb', '<path d="M17.6512 22.27H13.7612C12.9712 22.27 12.3212 22.91 12.3312 23.7V27.59C12.3312 28.38 12.9712 29.02 13.7612 29.02H14.0093C14.3418 29.6109 14.9749 30.01 15.7012 30.01C16.4275 30.01 17.0605 29.6109 17.393 29.02H17.6512C18.4412 29.02 19.0812 28.38 19.0812 27.59V23.7C19.0812 22.91 18.4412 22.27 17.6512 22.27Z" fill="#9B9B9B"/><path d="M18.1611 23.13C18.4011 23.13 18.5911 22.95 18.6111 22.72C18.6811 21.86 19.0511 19.77 21.0711 17.53C22.9611 16.04 24.2111 13.78 24.3611 11.22C24.3811 10.98 24.3911 10.82 24.3911 10.72V10.71V10.7C24.3911 10.65 24.3911 10.62 24.3911 10.62C24.3311 5.84 20.4611 2 15.6911 2C10.9211 2 7.05111 5.84 7.00111 10.6C7.00111 10.6 6.99111 10.84 7.03111 11.24C7.19111 13.78 8.43111 16.03 10.3211 17.52C12.3411 19.77 12.7411 21.86 12.8111 22.72C12.8311 22.95 13.0211 23.13 13.2611 23.13H18.1611Z" fill="#FCD53F"/><path d="M15.7011 10.7C17.3211 10.7 18.6411 12.01 18.6611 13.63V13.71C18.6611 13.74 18.6611 13.78 18.6511 13.84C18.6011 14.68 18.1911 15.47 17.5311 15.99L17.4611 16.04L17.4011 16.1C16.3011 17.32 16.0711 20.42 16.0311 22.12H15.3811C15.3311 20.42 15.0911 17.32 13.9911 16.1L13.9311 16.04L13.8611 15.99C13.2011 15.47 12.7911 14.69 12.7411 13.82C12.7411 13.78 12.7311 13.75 12.7311 13.73V13.64C12.7611 12.02 14.0911 10.7 15.7011 10.7ZM15.7011 9.69995C13.5311 9.69995 11.7611 11.45 11.7411 13.62C11.7411 13.62 11.7411 13.73 11.7511 13.91C11.8211 15.07 12.3911 16.09 13.2511 16.77C14.4511 18.11 14.3911 23.13 14.3911 23.13H17.0311C17.0311 23.13 16.9511 18.11 18.1611 16.78C19.0211 16.1 19.5911 15.07 19.6611 13.9C19.6711 13.79 19.6711 13.72 19.6711 13.67C19.6711 13.65 19.6711 13.63 19.6711 13.63C19.6411 11.45 17.8811 9.69995 15.7011 9.69995Z" fill="#FFB02E"/><path d="M19.1674 25.0525C19.4394 25.0049 19.6213 24.7458 19.5737 24.4738C19.526 24.2018 19.2669 24.0199 18.9949 24.0675L12.2549 25.2475C11.9829 25.2951 11.801 25.5542 11.8486 25.8262C11.8963 26.0983 12.1554 26.2801 12.4274 26.2325L19.1674 25.0525ZM19.1178 27.2025C19.3897 27.1546 19.5714 26.8954 19.5236 26.6234C19.4757 26.3514 19.2165 26.1698 18.9445 26.2176L12.2945 27.3876C12.0225 27.4355 11.8408 27.6947 11.8887 27.9667C11.9365 28.2386 12.1958 28.4203 12.4678 28.3725L19.1178 27.2025Z" fill="#D3D3D3"/><path d="M13.7912 5.43997C12.6812 7.35997 13.2412 9.75997 15.0412 10.79C16.8412 11.82 19.1912 11.11 20.3012 9.18997C21.4112 7.26997 20.8512 4.86997 19.0512 3.83997C17.2512 2.80997 14.9012 3.51997 13.7912 5.43997Z" fill="#FFF478"/>');
  // the one that wants you most — fire
  const FLAME = mkSvg('fire', '<path d="M26 19.3399C26 25.4393 20.9491 30.3451 14.8501 29.981C8.58145 29.6067 4.2892 23.5781 5.09774 17.2765C5.58685 13.4429 7.38361 10.1555 9.34008 7.6065C9.67947 7.16144 10.0288 10.7422 10.3782 10.3477C10.7276 9.94307 13.9717 4.32923 15.0997 2.35679C15.3093 1.99265 15.7884 1.88139 16.1278 2.14438C18.3937 3.85382 26 10.2769 26 19.3399Z" fill="#FF6723"/><path d="M23 21.8512C23 25.893 19.4812 29.142 15.2011 28.9952C10.5815 28.8386 7.41254 24.6109 8.09159 20.256C9.06903 14.0124 15.4789 10 15.4789 10C15.4789 10 23 14.7072 23 21.8512Z" fill="#FFB02E"/>');
  // two things still fighting — crossed swords
  const SWORDS = mkSvg('swords', '<path d="M29.8501 2.15002C29.9401 2.24002 30.0001 2.36002 30.0001 2.50002V5.61002C30.0001 5.86002 29.9001 6.10002 29.7201 6.27002L19.8656 16.0198L19.4931 17.557L17.9324 17.9325L20.5 19.5L22.07 22.07L19.79 23.6L15.9966 19.8478L11.8301 23.97L9.93005 22.07L19 11L29.8501 2.15002Z" fill="#9B9B9B"/><path d="M2.15 2.15002L9 7.5L14.0659 14.0659L13.5 15.5L12.1303 16.0234L2.28 6.28002C2.1 6.10002 2 5.86002 2 5.61002V2.50002C2 2.36002 2.06 2.24002 2.15 2.15002Z" fill="#9B9B9B"/><path d="M29.855 2.14499C29.765 2.05499 29.64 2 29.5 2H26.39C26.14 2 25.9 2.1 25.72 2.28L16.0028 12.1071L6.27999 2.28C6.09999 2.1 5.85999 2 5.60999 2H2.49999C2.36 2 2.23502 2.05499 2.14502 2.14497L14.0659 14.0659L8.03003 20.17L9.93005 22.07L29.855 2.14499Z" fill="#D3D3D3"/><path d="M22.07 22.07L17.9325 17.9324L19.8698 16.0157L23.98 20.17L22.07 22.07Z" fill="#D3D3D3"/><path d="M3.66003 26.44L5.56003 28.34L10.88 23.02L8.98003 21.12L3.66003 26.44Z" fill="#321B41"/><path d="M28.34 26.44L26.44 28.34L21.12 23.02L23.02 21.12L28.34 26.44Z" fill="#321B41"/><path d="M2.39994 27.71L4.29994 29.61C4.81994 30.13 5.66994 30.13 6.19994 29.61C6.72994 29.09 6.72994 28.24 6.19994 27.71L4.29994 25.81C3.77994 25.28 2.92994 25.28 2.39994 25.81C1.86994 26.33 1.86994 27.18 2.39994 27.71Z" fill="#635994"/><path d="M29.6 27.71L27.7 29.61C27.18 30.13 26.33 30.13 25.8 29.61C25.27 29.09 25.27 28.24 25.8 27.71L27.7 25.81C28.22 25.28 29.07 25.28 29.6 25.81C30.13 26.33 30.13 27.18 29.6 27.71Z" fill="#635994"/><path d="M22.97 17.63C22.91 17.43 23.06 17.23 23.27 17.23H25.39C25.54 17.23 25.67 17.33 25.7 17.48C26.13 19.74 25.43 22.1 23.77 23.76C22.11 25.43 19.75 26.12 17.49 25.69C17.35 25.66 17.24 25.53 17.24 25.38V23.26C17.24 23.05 17.44 22.9 17.64 22.96C19.13 23.39 20.76 22.97 21.87 21.86C22.98 20.75 23.39 19.13 22.97 17.63Z" fill="#533566"/><path d="M9.03 17.64C8.6 19.13 9.02 20.76 10.13 21.87C11.23 22.96 12.81 23.38 14.28 22.99C14.48 22.94 14.68 23.08 14.68 23.29V25.4C14.68 25.55 14.57 25.68 14.42 25.71C12.19 26.11 9.87 25.41 8.23 23.77C6.56 22.11 5.87 19.75 6.3 17.49C6.33 17.35 6.46 17.24 6.61 17.24H8.73C8.94 17.24 9.09 17.44 9.03 17.64Z" fill="#533566"/>');
  // which question is hotter — hot pepper
  const CHILLI = mkSvg('chilli', '<path d="M9.81475 24.34C8.37475 25.42 6.78475 26.12 5.13475 26.47C3.70475 26.77 3.59475 28.77 4.98475 29.23C9.73475 30.79 15.1447 30.08 19.4447 26.85C23.8847 23.52 26.0847 18.31 25.7547 13.15C25.4747 8.70005 20.3647 6.33005 16.7947 9.01005C15.2747 10.15 14.4247 11.98 14.5647 13.87C14.8547 17.8 13.1947 21.8 9.81475 24.34Z" fill="#F8312F"/><path d="M20.9647 3C20.9647 2.44772 20.517 2 19.9647 2C19.4124 2 18.9647 2.44772 18.9647 3V5.03003H17.3547C14.5847 5.03003 12.3447 7.27003 12.3447 10.03C12.3447 11.1 12.8047 12.13 13.6047 12.85L13.6147 12.86C14.3347 13.51 15.4347 13.51 16.1547 12.86C16.8747 12.21 17.9747 12.21 18.6947 12.86C19.4147 13.51 20.5147 13.51 21.2347 12.86C21.9547 12.21 23.0547 12.21 23.7747 12.86C24.4947 13.51 25.5947 13.51 26.3147 12.86L26.3247 12.85C27.1247 12.13 27.5847 11.11 27.5847 10.03C27.5847 7.27003 25.3447 5.03003 22.5847 5.03003H20.9647V3Z" fill="#00D26A"/>');
  // the race runs on without you — hourglass not done
  const GLASS = mkSvg('glass', '<path d="M25 4L16 3L7 4V7.5C7.18983 9.98429 8.82278 14.0192 14 14.8483V17.1517C8.82278 17.9808 7.18983 22.0157 7 24.5V28L16 29L25 28V24.5C24.8102 22.0157 23.1772 17.9808 18 17.1517V14.8483C23.1772 14.0192 24.8102 9.98429 25 7.5V4Z" fill="#83CBFF"/><path d="M17 22.2V14.8C17 14.3 17.3 13.9 17.8 13.8C21 13.1 23.4 10.5 23.9 7.2C24 6.6 23.5 6 22.9 6H9.10002C8.50002 6 8.00002 6.6 8.10002 7.2C8.60002 10.5 11 13.1 14.2 13.8C14.7 13.9 15 14.3 15 14.8C15 16.5 15 20.5 15 22.2C15 22.7 14.7 23.1 14.2 23.2C12.3 23.6 10.7 24.7 9.60002 26.2C9.00002 27 9.60002 28 10.5 28H21.5C22.4 28 23 27 22.4 26.3C21.3 24.8 19.6 23.7 17.8 23.3C17.3 23.1 17 22.7 17 22.2Z" fill="#FFB02E"/><path d="M7 2C6.44772 2 6 2.44772 6 3C6 3.55228 6.44772 4 7 4H25C25.5523 4 26 3.55228 26 3C26 2.44772 25.5523 2 25 2H7Z" fill="#D3D3D3"/><path d="M7 28C6.44772 28 6 28.4477 6 29C6 29.5523 6.44772 30 7 30H25C25.5523 30 26 29.5523 26 29C26 28.4477 25.5523 28 25 28H7Z" fill="#D3D3D3"/><path d="M22.0069 6.11674C22.1473 7.31021 21.9858 8.26372 21.6068 8.97687C21.2367 9.67346 20.6167 10.223 19.6683 10.5565C19.1473 10.7396 18.8734 11.3105 19.0566 11.8315C19.2398 12.3525 19.8106 12.6264 20.3317 12.4433C21.7084 11.9593 22.7457 11.0959 23.373 9.91531C23.9915 8.75132 24.1674 7.36352 23.9931 5.88296C23.9286 5.33447 23.4316 4.94215 22.8831 5.00671C22.3346 5.07126 21.9423 5.56824 22.0069 6.11674Z" fill="white"/><path d="M18.8714 19.0714C18.3586 18.8663 17.7767 19.1157 17.5715 19.6285C17.3664 20.1413 17.6158 20.7233 18.1286 20.9284C19.28 21.3889 20.2457 22.0068 20.9193 22.8151C21.5781 23.6057 22 24.6276 22 25.9999C22 26.5522 22.4477 26.9999 23 26.9999C23.5523 26.9999 24 26.5522 24 25.9999C24 24.1722 23.4219 22.6941 22.4557 21.5347C21.5043 20.393 20.2201 19.6109 18.8714 19.0714Z" fill="white"/>');
  // yours — pencil
  const PENCIL = mkSvg('pencil', '<path d="M16.6352 7.58545L21.1451 10.1198L23.7063 14.6565L9.36953 28.9933L4.50768 26.4228L2.29846 21.9222L16.6352 7.58545Z" fill="#FF822D"/><path d="M1.3895 28.0652L1.97165 29.377L3.22663 29.9024L9.35704 28.9771L2.31475 21.9348L1.3895 28.0652Z" fill="#FFCE7C"/><path d="M1.06291 30.2289L1.38948 28.0652L3.22659 29.9023L1.06291 30.2289Z" fill="#402A32"/><path d="M22.2761 1.94443C23.0572 1.16338 24.3235 1.16338 25.1045 1.94443L29.3472 6.18707C30.1282 6.96812 30.1282 8.23445 29.3472 9.0155L25.8117 12.551L21.2845 10.2869L18.7406 5.47996L22.2761 1.94443Z" fill="#F92F60"/><path d="M18.7406 5.47998L25.8117 12.551L23.6903 14.6724L16.6193 7.6013L18.7406 5.47998Z" fill="#D3D3D3"/>');
  // a proposal carried, and the incumbent held — check mark and multiply, the
  // one pair in the set drawn to match each other (both #785DC8, both solid,
  // both upright), which is what the 2026-08-17 ✔/✖ pairing was chosen for
  const CHECK = mkSvg('check', '<path fill-rule="evenodd" clip-rule="evenodd" d="M28.9278 10.3004C30.1588 11.6067 30.0977 13.6636 28.7914 14.8946L13.9394 28.8901C12.6481 30.107 10.6193 30.0632 9.38167 28.7917L3.11793 22.3567C1.86596 21.0705 1.89371 19.0129 3.17992 17.7609C4.46612 16.509 6.52372 16.5367 7.77569 17.8229L11.809 21.9665L24.3336 10.164C25.6399 8.93304 27.6968 8.99411 28.9278 10.3004Z" fill="#785DC8"/>');
  const MULTIPLY = mkSvg('multiply', '<path d="M7.2225 2.8925C6.0325 1.7025 4.0825 1.7025 2.8925 2.8925C1.7025 4.0925 1.7025 6.0325 2.8925 7.2325L11.6405 15.9765L2.9025 24.7225C1.7125 25.9125 1.7125 27.8625 2.9025 29.0525C4.0925 30.2425 6.0425 30.2425 7.2325 29.0525L15.9735 20.3075L24.7125 29.0425C25.9025 30.2325 27.8525 30.2325 29.0425 29.0425C30.2325 27.8525 30.2325 25.9025 29.0425 24.7125L20.3045 15.9745L29.0525 7.2225C30.2425 6.0325 30.2425 4.0825 29.0525 2.8925C27.8525 1.7025 25.9025 1.7025 24.7125 2.8925L15.9715 11.6415L7.2225 2.8925Z" fill="#785DC8"/>');
  // **The two Fluent files this alphabet does not take** are the pause button
  // and the counterclockwise arrows button, and they are the two that are
  // *buttons*: a rounded blue plate with a white shape knocked out. ⏸ keeps the
  // two drawn bars above and ↻ keeps its character; see the note on `PAUSE`.
  const MARK = {
    // A rail entry is somebody's proposal, not a question the system invented,
    // so it wears a lightbulb rather than a question mark (Ed, 241). The move
    // that makes this work is promoting the *action* to its own glyph: ✏️ is
    // more literal than 💡 for "write one" anyway — a bulb is about having had
    // an idea, a pencil is about writing — so each glyph ends up nearer its own
    // job. It also settles a small clash: ❓ renders red in most emoji fonts
    // while its card washes yellow, and 💡 is yellow.
    needs: BULB,      // an idea is on the table, and it wants your judgment
    urgent: FLAME,    // the one that wants you most
    // The rail says what is true; the buttons say what you can do. So a
    // deadlocked race is marked "stuck" — same yellow as 💡, because it is
    // still open — and ✏️ lives on the drafting it leads to (Ed, 173, 241).
    //
    // ⚔️ rather than ❌ (Ed, 2026-08-17). A cross says *this failed*, which is
    // both wrong and discouraging: nothing failed, the room disagrees, and the
    // disagreement is exactly what makes writing a bridge worth doing. Crossed
    // swords say two things are still fighting, which is the true statement and
    // the one that makes the ask legible. It also stops ❌ being read as a close
    // button, which at 13px beside a card it plainly was.
    stuck: SWORDS,    // judging cannot move this; only a new draft can
    // ✏️ is the writing action *and* the state of a draft of your own that is
    // not yet proposed (Ed, 241). The overload is harmless because subject and
    // act agree — in both cases it is you, writing. Once you propose it, the
    // thing on the table is an ordinary proposal and wears the ordinary 💡;
    // what says it is *yours* is the green.
    propose: PENCIL,  // ...and this is where you write one
    // A salience diagonal: which of two questions is the more **urgent**.
    // 🌶️ rather than ⚖️ (Ed, 2026-08-17). The scales were the wrong idea twice
    // over: weighing is what *every* card on this surface asks for, so a pair
    // of scales says nothing that distinguishes this one — and what a diagonal
    // actually asks is which question is hotter, which is a temperature rather
    // than a balance. It also reads: ⚖️ is a fine-detailed glyph that turns to
    // mush at 13px, where a chilli is one silhouette, and it is the hue the
    // card is already wearing.
    weigh: CHILLI,
    deciding: GLASS,  // yours is in; the race runs on
    // the ground moved under a judgment of yours, so that judgment is void and
    // the race will ask you again — nothing is rewritten, and no new candidate
    // appears: what comes back is a pair to judge, on wordings that already exist
    //
    // **↻ is still a character** (SURFACE Y22), and it is the only mark that is:
    // it has no partner whose weight it must equal, so nothing about it drifts
    // between machines that matters. Q1360 gave it the counterclockwise arrows
    // button for half a day and Ed sent it back the same afternoon — that file
    // is a plate with a white shape knocked out, and a plate is what this
    // alphabet has refused since 2026-08-17.
    shifted: '↻',
    // **The same ↻, in your own blue** (Ed, 2026-09-14, Q170). The text moved
    // under something of yours, and the colour says which: grey where it was a
    // vote (above), `--lc-yours` where it was a proposal — one whose rebase
    // onto the new wording failed, so it is out of every race and held for you
    // until you re-make it against the clause as it now reads or withdraw it
    // (SPEC §2.4, §2.6; SURFACE E38). One shape, one meaning, two owners — and
    // the two are told apart by a `color`, which is why ↻ being painted rather
    // than pictured is load-bearing rather than merely historical.
    stranded: '↻',
    // A decision says which way it went, not just that it happened (Ed, 160):
    // a matched pair, so the outcome is legible before you open anything. The
    // 2026-08-17 argument for ✖ U+2716 over Unicode's own ✘ U+2718 — a pair has
    // to be one weight and one lean at 13px in a margin — is met here by the set
    // rather than by the codepoint: Fluent's check and multiply are one purple,
    // one solid weight and both upright.
    adopted: CHECK,     // a proposal carried: the charter changed here
    retired: MULTIPLY,  // the incumbent held: nothing changed
    // **Filed keeps which way it went** (Ed, 2026-08-17). ☑️ collapsed both
    // outcomes into one mark the moment you acknowledged them, which threw away
    // the only thing about a settled clause anybody ever wants from a margin:
    // *did this change or not*. Same two pictures, desaturated — the difference
    // between decided and filed is whether it still wants something from you,
    // and grey is exactly what this surface uses to say that (system.css). ⏸
    // beside them has nowhere to file *from*, so it is painted that grey.
    filedYes: CHECK,     // filed, and the charter changed
    filedNo: MULTIPLY,   // filed, and the incumbent held
    filedUndecided: PAUSE, // filed at the close, nothing decided: the incumbent stands, undecided
  };
  // Which mark this is, so the palette can reach the three it still paints, the
  // two filed pictures can be drained, and a walk can read a mark's kind off it
  // — **every lifecycle mark is drawn; a subject glyph is an emoji** (Ed,
  // 2026-09-14, Q288). Since Q1360 *drawn* means *from the one set, the same
  // picture on every machine* for ten of the thirteen; ⏸ is this file's own two
  // bars and ↻ is a character, and those three the `.mk-*` rules still colour.
  const DRAWN = ['needs', 'urgent', 'stuck', 'weigh', 'deciding', 'propose',
    'adopted', 'retired', 'filedYes', 'filedNo', 'filedUndecided', 'shifted', 'stranded'];

  // The mark, wrapped in its kind — the queue, the contents rail, the gutter tab
  // and a card's head all show the same mark and must show it the same way. The
  // wrapper is what the colour and the filed treatment hang on, and what a walk
  // reads a mark's kind from (journey-walk, after Q288: never the textContent).
  const mkHtml = (kind) => (DRAWN.includes(kind)
    ? '<span class="mk mk-' + kind + '">' + MARK[kind] + '</span>' : MARK[kind]);
  const markHtml = (kind) => '<span class="qmark" aria-hidden="true">' + mkHtml(kind) + '</span>';

  // ---- the diff / markdown engine -----------------------------------------

  const tokens = (s) => String(s).split(/(\s+|[.,;:!?()\[\]"'’‘“”—–]+)/).filter((t) => t !== '' && t !== undefined);
  // Pieces are `[text, mark]` with mark one of null, 'ins', 'del'. `withDel`
  // asks for the removed words as well as the added ones — a stacked proposal
  // needs both (see the redline note in the stylesheet), the editing lane needs
  // only the additions.
  function diffPieces(oldText, newText, withDel) {
    const A = tokens(oldText), B = tokens(newText);
    const n = A.length, m = B.length;
    const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
    for (let i = n - 1; i >= 0; i--)
      for (let j = m - 1; j >= 0; j--)
        dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const out = [];
    const push = (t, mark) => {
      const last = out[out.length - 1];
      if (last && last[1] === mark) last[0] += t; else out.push([t, mark]);
    };
    let i = 0, j = 0;
    while (i < n && j < m) {
      if (A[i] === B[j]) { push(B[j], null); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { if (withDel) push(A[i], 'del'); i++; }
      else { push(B[j], 'ins'); j++; }
    }
    while (j < m) { push(B[j], 'ins'); j++; }
    if (withDel) while (i < n) { push(A[i], 'del'); i++; }
    // A space between two new words is matched against the old text's own
    // spaces and comes back "unchanged", which would draw two new words as two
    // separate pills with a white gap between them. Rewriting three words is
    // one change, so it should be one mark.
    const joined = [];
    for (let k = 0; k < out.length; k++) {
      const cur = out[k], next = out[k + 1];
      const last = joined[joined.length - 1];
      // …and only where both sides of the gap carry the *same* mark, or a
      // space between a cut and an addition would end up inside one of them
      if (!cur[1] && last && next && last[1] && last[1] === next[1] && /^\s+$/.test(cur[0])) {
        last[0] += cur[0]; continue;
      }
      if (last && last[1] === cur[1]) last[0] += cur[0];
      else joined.push([cur[0], cur[1]]);
    }
    return joined;
  }
  // A highlight never opens or closes on a space — the same tidying `resultOnly`
  // does to the hand-authored diffs in the fixture.
  const markHtml2 = (t, mark, render) => {
    const m = t.match(/^(\s*)([\s\S]*?)(\s*)$/);
    const tag = mark === 'del' ? 'del' : 'ins';
    const r = render || esc;
    return esc(m[1]) + (m[2] ? '<' + tag + '>' + r(m[2]) + '</' + tag + '>' : '') + esc(m[3]);
  };
  // **Result-only** (Ed, 274, retiring the redline). A proposal states the text
  // as it would stand, with what it adds marked and nothing struck through.
  // Ed's reason is about the reader rather than the tuning — *normal people
  // struggle to read or interpret redlines* — and it takes the old floor
  // question with it, since that floor existed to stop a redline turning into
  // confetti.
  //
  // What the deletions were there for is still real: in a stacked card, a
  // proposal whose only change is a cut renders as a sentence that looks like
  // the clause above it. Ed's answer is to cover the case where that is worst
  // and accept it elsewhere — a proposal that removes the text **entirely**
  // would otherwise render as blank space, so it says so in words instead. A
  // partial cut is left to be found by reading against the clause at the head,
  // which is one line up.
  //
  // A marking floor survives, now measured on the *new* text: below half of it
  // surviving from the clause, the proposal states itself plainly. Rival
  // candidates in a race are whole rewrites rather than edits, so this is what
  // keeps a race lane from being marked green end to end (Q92).
  // `force` skips the floor. The `deadlock-card` sets it (Ed, 2026-08-17 — *I'd
  // like to see the green highlights like elsewhere*): its field is eight
  // rewrites of one sentence, each of which falls below the floor on its own
  // and would state itself plain, so the card that most needs the marking is
  // the one the floor silences. The floor exists to stop a *lane* being lit end
  // to end beside its incumbent; here the incumbent is at the head and the
  // whole point of the band is comparison.
  const MARK_FLOOR = 0.5;
  function wordingHtml(oldText, newText, force) {
    if (!String(newText ?? '').trim()) return '<div class="lp empty"><br></div>';
    const pieces = diffPieces(oldText, newText, false);
    let same = 0, all = 0;
    for (const [t, mk] of pieces) {
      if (/^\s+$/.test(t)) continue;
      all += t.length;
      if (!mk) same += t.length;
    }
    if (!force && (!all || same / all < MARK_FLOOR)) return mdToHtml(newText);
    // rendered, not raw: a proposal is read, not checked, so emphasis in it
    // should look like emphasis rather than like asterisks
    return pieces.map(([t, mk]) => (mk ? markHtml2(t, mk, mdToHtml) : mdToHtml(t))).join('');
  }
  // Blocks are split on newlines *after* the diff, so a run of new wording that
  // spans a paragraph break is still one comparison rather than two.
  // `kinds` says what each block of the run *was* — `{ h: level }` for a
  // heading, `{ b: true }` for a bullet, null for a paragraph (`headFlags`) —
  // so a section title still reads as one wherever the run is shown. Matched
  // by position, which holds while the block count does — and where the
  // author has added or removed lines it simply stops claiming, which is the
  // honest failure.
  //
  // **A typed marker previews as it will land** (Q1294, Ed 2026-09-10): a
  // block whose text begins `# ` or `- ` wears the heading or bullet treatment
  // here, with the marker itself dimmed in a `.mdmark` span — still text, so
  // the caret counts it and `htmlToMd` writes it back: what is proposed is the
  // source, and the engine's `blocksOf` reads the same prefix on landing. The
  // marker outranks the origin, since a paragraph retyped as a heading *is*
  // one now. In markdown mode nothing is dressed at all.
  function laneBlocks(text, oldText, kinds, raw) {
    // `raw` is markdown mode: the characters as they are, monospace, nothing
    // rendered — which is the whole point of the mode, since it exists to let
    // somebody check that their edit is exactly what they meant.
    const render = raw ? esc : mdToHtml;
    // Result-only (274): the diff marks what a proposal adds and never what it
    // cut, in the lane exactly as on the card.
    const pieces = oldText == null ? [[String(text), null]] : diffPieces(oldText, text, false);
    const blocks = [[]];
    for (const [t, mark] of pieces) {
      const parts = t.split('\n');
      parts.forEach((part, k) => {
        if (k > 0) blocks.push([]);
        if (part) blocks[blocks.length - 1].push([part, mark]);
      });
    }
    // An emptied block keeps its `<br>` — it is still a line you can put a
    // caret in — and says what it is through a pseudo-element, so the helper is
    // drawn without being *content*: nothing for `htmlToMd` to serialise back
    // into the candidate, and nothing for the caret to land after.
    return blocks.map((ps, i) => {
      const src = ps.map(([t]) => t).join('');
      const typed = raw ? null : mdBlock(src);
      // the marker's characters come off the front of the pieces, whatever
      // the diff made of them — a marker is never marked green
      let lead = typed ? typed.marker.length : 0;
      let marker = '';
      const body = [];
      for (const [t, mark] of ps) {
        let s = t;
        if (lead > 0) {
          const take = s.slice(0, lead);
          marker += take; s = s.slice(take.length); lead -= take.length;
          if (!s) continue;
        }
        body.push(mark ? markHtml2(s, mark, render) : render(s));
      }
      const kind = typed ? (typed.t === 'h' ? { h: typed.level } : { b: true }) : (kinds && kinds[i]) || null;
      const inner = (marker ? '<span class="mdmark">' + esc(marker) + '</span>' : '') + body.join('');
      return '<div class="lp' + (kind && kind.h ? ' hblock lvl' + kind.h : '') +
        (kind && kind.b ? ' bullet' : '') +
        (inner ? '' : ' empty') + '">' + (inner || '<br>') + '</div>';
    }).join('');
  }
  const headFlags = (site) => site.origin.map((o) =>
    (o.t === 'h' ? { h: o.level || 1 } : o.bullet ? { b: true } : null));

  // ---- markdown -------------------------------------------------------
  // A candidate's text **is** markdown (Ed, 2026-08-17). Most people want to
  // edit it rendered; some want to see the characters, "to make sure that
  // their edit is totally accurate" — which only means anything if the
  // characters are what is stored. So the source is the truth and `rich` is a
  // rendering of it, which is also the one arrangement where the two views
  // cannot disagree.
  //
  // **The grammar is small, and deliberately** (Q1294, Ed 2026-09-10): three
  // inline marks — bold, italic, code — and two block kinds a line may begin
  // with, `# ` (to `### `) a heading and `- ` a bullet. A block kind is
  // decided **per line**, never as an object spanning lines: one block is one
  // engine line and one hunk, and the engine never learns the word "list" —
  // consecutive bullets read as one list by CSS adjacency alone. Left out on
  // purpose, because each either spans lines or needs a mapping layer between
  // the page and the footprint: nested lists (a depth is a relation between
  // lines), numbered lists (a number is a count over lines), tables (a row is
  // several cells and the header is another row), block quotes (a run), and
  // link syntax (a docs.vote address is already a link by `linkify`, and any
  // other target is a door out of the document).
  const MD_RX = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/g;
  function mdToHtml(src) {
    return String(src).split(MD_RX).map((part) => {
      if (/^\*\*[\s\S]+\*\*$/.test(part)) return '<strong>' + esc(part.slice(2, -2)) + '</strong>';
      if (/^\*[\s\S]+\*$/.test(part)) return '<em>' + esc(part.slice(1, -1)) + '</em>';
      if (/^`[\s\S]+`$/.test(part)) return '<code>' + esc(part.slice(1, -1)) + '</code>';
      return esc(part);
    }).join('');
  }
  // The one reading of a line's block marker — the page's `blocksOf`,
  // `relabel` and `textDivs` and the lane's preview all ask this, so a line
  // that is a heading in one place is a heading in every place. `marker` is
  // the prefix as typed (the hashes or the dash, and the whitespace after),
  // `text` what follows; null for a paragraph.
  function mdBlock(line) {
    const m = String(line).match(/^(#{1,3}|-)(\s+)(.*)$/);
    if (!m) return null;
    const marker = m[1] + m[2];
    return m[1] === '-' ? { t: 'b', marker, text: m[3] }
      : { t: 'h', level: m[1].length, marker, text: m[3] };
  }
  // The constitution's links are real links: docs.vote addresses wrapped in
  // `.doclink` anchors, applied **after escaping**. Over rendered markdown it
  // runs over the text between the tags only — never inside a `<code>` span,
  // where an address is being quoted rather than given — which is what
  // `mdLine` is: the one rendering of a clause for reading, everywhere one is
  // read (the column, a card's head, the closed page).
  const LINK_RX = /\bdocs\.vote\/(?:d\/)?[a-z0-9][a-z0-9-]*/g;
  const linkify = (s) => String(s).replace(LINK_RX,
    (m) => '<a class="doclink" href="https://' + m + '" target="_blank" rel="noopener">' + m + '</a>');
  function linkifyHtml(html) {
    let code = 0;
    return String(html).split(/(<[^>]*>)/).map((seg) => {
      if (seg.startsWith('<')) {
        if (/^<code[\s>]/.test(seg)) code++;
        else if (/^<\/code>/.test(seg)) code = Math.max(0, code - 1);
        return seg;
      }
      return code > 0 ? seg : linkify(seg);
    }).join('');
  }
  const mdLine = (src) => linkifyHtml(mdToHtml(src));
  // …and back. Walks what the browser made of the lane and writes the markdown
  // for it, so editing rich never silently drops the marks it is showing.
  // `<ins>`/`<del>` are the diff's own wrappers and contribute nothing.
  function htmlToMd(node) {
    let out = '';
    for (const n of node.childNodes) {
      if (n.nodeType === 3) { out += n.nodeValue; continue; }
      if (n.nodeType !== 1) continue;
      const tag = n.tagName.toLowerCase();
      const inner = htmlToMd(n);
      if (!inner && tag !== 'br') continue;
      out += tag === 'strong' || tag === 'b' ? '**' + inner + '**'
        : tag === 'em' || tag === 'i' ? '*' + inner + '*'
        : tag === 'code' ? '`' + inner + '`'
        : inner;
    }
    return out;
  }
  // Plain words, for measuring a change rather than showing one.
  const mdStrip = (src) => String(src).replace(MD_RX, (m) =>
    m.startsWith('**') ? m.slice(2, -2) : m.slice(1, -1));

  // A caret offset does **not** mean the same thing in the two views: markdown
  // mode shows the syntax characters and rich mode does not, so the same place
  // in the text is a different number of characters along. Switching view
  // therefore converts rather than assuming — otherwise the caret drifts by two
  // characters for every bold word above it, which is exactly the class of bug
  // the mode exists to help somebody catch.
  const MD_ONE = /^(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)$/;
  const mdLead = (p) => (p.startsWith('**') ? 2 : 1);
  const mdInner = (p) => (p.startsWith('**') ? p.slice(2, -2) : p.slice(1, -1));
  const mdParts = (src) => String(src).split(MD_RX).filter((p) => p !== '' && p != null);

  function richToSource(src, off) {
    let s = 0, r = 0;
    for (const part of mdParts(src)) {
      const mark = MD_ONE.test(part);
      const inner = mark ? mdInner(part) : part;
      if (off <= r + inner.length) return s + (mark ? mdLead(part) : 0) + (off - r);
      r += inner.length; s += part.length;
    }
    return String(src).length;
  }
  function sourceToRich(src, off) {
    let s = 0, r = 0;
    for (const part of mdParts(src)) {
      const mark = MD_ONE.test(part);
      const inner = mark ? mdInner(part) : part;
      if (off <= s + part.length) {
        return r + Math.max(0, Math.min(inner.length, off - s - (mark ? mdLead(part) : 0)));
      }
      r += inner.length; s += part.length;
    }
    return mdStrip(src).length;
  }
  const originText = (site) => site.origin.map((o) => o.text).join('\n');
  // Read back whatever the browser made of the editing: blocks separated by
  // newlines, however they ended up nested.
  // Read the lane back as **markdown source**, which is what a candidate is.
  // In markdown mode the visible characters already are the source; in rich
  // mode the marks are real elements and have to be written back out, so that
  // editing rendered never silently drops the emphasis it is showing you.
  function readLane(el) {
    const raw = el.classList.contains('md');
    const blocks = [...el.children].filter((c) => c.classList && c.classList.contains('lp'));
    const src = blocks.length
      ? blocks.map((b) => (raw ? b.innerText : htmlToMd(b))).join('\n')
      : (raw ? el.innerText : htmlToMd(el));
    return src.replace(/ /g, ' ').replace(/\r/g, '')
      .replace(/\n{2,}/g, '\n').replace(/\n$/, '');
  }

  // ---- pure card sub-builders ---------------------------------------------

  // ✏️ on a lane: take *this* wording as your starting point (Ed, 228). A null
  // seed means the clause's own current text, which is what the composer uses
  // by default — so the left-hand lane of a quick card or a patch, which is the
  // current text, needs no seed at all.
  function laneSeed(s, lane, key) {
    if (lane === 'keep') return null;
    const note = G.seedNote;
    // a `deadlock-card`'s field is a slate, so the lane is its index in it
    if (String(lane).startsWith('slate:')) {
      const c = (s.slate || [])[+String(lane).slice(6)];
      return c ? { text: c.text, note } : null;
    }
    if (s.kind === 'race') return { text: lane === 'a' ? s.race.a.text : s.race.b.text, note };
    if (s.kind === 'patch') {
      const site = s.sites.find((x) => x.key === key) || s.sites[0];
      return { text: stripTags(resultOnly(site.marked)), note };
    }
    return { text: stripTags(resultOnly(s.marked)), note };
  }
  const laneProposeHtml = (s, lane, key) =>
    '<button class="lanepropose" data-propose-from="' + s.id + '|' + lane + '|' + (key || '') +
    '" title="' + G.proposeEdit.title + '">' +
    // "propose edit" rather than "edit this" (Ed, 2026-08-17): what the button
    // starts is a *proposal*, and "edit this" promises an edit — which is the
    // one thing this surface never lets you do to the charter directly.
    G.proposeEdit.label + '</button>';

  const initials = (n) => String(n).trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  /* ---- avatars ------------------------------------------------------------
     Lifted out of setup.js (backlog 255): the speaker's disc is now one of
     this renderer's callers, and `cards.js` loads before `setup.js`, so a
     helper two files share belongs in the lower of them. `SETUP` re-exports
     it, byte-identical, and every existing caller is untouched.

     `me` in the glossary reads "initials, not a photograph: there are no
     accounts behind it yet". There are now — choosing how you appear is one of
     the cards — so the initials become the *default* rather than the rule.

     **A picture is an emoji, an uploaded image, or none** (Q734, 2026-08-23).
     The grounds for your initials and the three drawn marks are gone: they
     were a mockup device from before either of the real answers existed, and
     with a real uploader in the card a ground is a fourth thing to choose
     between two that mean something. Nothing is left tolerating them — we are
     in alpha and there are no real documents (Ed, 2026-08-23) — so `c0`–`c5`
     and `m0`–`m2` are refused by the server as well as un-offered here, and
     everything that is not `e`+emoji or `u`+image is simply the empty answer.

     **And an emoji is a glyph, not a disc** (Q732/Q735, Ed 2026-08-23: they
     render *very small and right aligned*, and should be *sized like the text
     around them and replace the circle that images use*). So the emoji branch
     stops emitting an `.av` altogether: `.emojiface` has no box, no ground and
     no size of its own, and inherits whatever text it stands in. The circle
     survives exactly where it is doing work — behind an uploaded photograph
     and behind initials, which need a ground to be legible. */
  // **Before there is a name there is still a person** (Ed, 2026-08-19: the
  // picture card offers *initials with a colour picker — or, if they have not
  // given us their name, an anonymous user symbol with a colour picker, which
  // becomes initials when the name is filled*). Drawn rather than a glyph, for
  // the same reason the sealed speaker is: a bare disc reads as a bullet.
  const PERSON = '<svg class="anonav" viewBox="0 0 44 44" aria-hidden="true">' +
    '<circle cx="22" cy="16" r="7.5" fill="currentColor"/>' +
    '<path d="M8.5 37c0-7.2 6-12 13.5-12s13.5 4.8 13.5 12z" fill="currentColor"/></svg>';
  function avHtml(person, cls) {
    const pic = person && person.pic;
    const c = 'av ' + (cls || '');
    // **An emoji is not a disc** (Q735): no ground, no border, no box — it
    // takes the size of the text it stands in, which is what makes one rule
    // right at all nineteen sites at once instead of a specificity race
    // against every context that tunes a two-letter initials size.
    if (pic && pic[0] === 'e') {
      return '<span class="emojiface ' + (cls || '') + '">' + esc(pic.slice(1)) + '</span>';
    }
    // An uploaded picture is stored as 'u' + a data URL, downscaled and
    // re-encoded in the browser before it is ever stored (Q735): the file
    // itself never leaves the page.
    if (pic && pic[0] === 'u') {
      // Only a data-URI image may enter a style attribute (PRODUCTION.md
      // stage 3, defect 4): the server whitelists this shape at
      // set-identity, and the page enforces it again at the sink, because
      // the sink is what survives a data path nobody audited. Anything
      // else stored here renders as nobody — never as markup.
      const u = pic.slice(1);
      if (/^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(u)) {
        return '<span class="' + c + ' photo" style="background-image:url(' + u + ')"></span>';
      }
      return '<span class="' + c + ' anon">' + PERSON + '</span>';
    }
    // anything else stored here is the empty answer — a ground index, a mark
    // index, a string nobody audited — and renders as nobody, never as markup
    if (pic) return '<span class="' + c + ' anon">' + PERSON + '</span>';
    // no name yet: the anonymous person, so a disc never reads as a bullet —
    // and an erased person (decision 1253) the same, whatever stands in `n`
    if (!person || !person.n || person.erased) return '<span class="' + c + ' anon">' + PERSON + '</span>';
    return '<span class="' + c + '">' + esc(initials(person.n)) + '</span>';
  }

  // Somebody said this, and you are not allowed to know who (SPEC §3.4). The
  // disc is the person; its blankness is the seal. Without it the rationale
  // was a bold line of text that read as a heading the system had written.
  // `title` is optional (2026-08-18): the setup surfaces carry an audited
  // copy of the seal tooltip with no spec citation in it; absent, the
  // session-view's own wording stands, byte for byte.
  // `who` (the close, 2026-08-21): at the record the seal lifts where the
  // anonymity ladder says so — the disc stays, and the name stands beside it.
  // Absent, the markup is what it always was, byte for byte.
  //
  // **And the disc is the face the room will see** (SURFACE K30, backlog 255,
  // Ed 2026-08-29: *if the rationale will be shared with non-anonymous
  // identity attached, they should show the avatar*). Where `who` is given the
  // name is already attached — `authorVisible` allowed it — so the blankness
  // would be a lie: the drawn disc gives way to that person's own picture, at
  // the disc's size, and the name stays beside it. `who` may be a bare name,
  // which draws their initials, or a `{ n, pic }` person, which draws whatever
  // they chose. Absent, nothing about this changes.
  const personOf = (who) => (who && typeof who === 'object' ? who : who ? { n: who } : null);
  const speakerHtml = (why, title, who) => {
    const p = personOf(who);
    const name = p ? String(p.n || '') : '';
    const ttl = title || (p ? G.speaker.wroteThis(esc(name)) : G.speaker.sealed);
    return '<div class="speaker' + (p ? ' revealed' : '') + '">' +
      (p
        ? '<span class="spkface" title="' + ttl + '">' + avHtml(p) + '</span>'
        : '<span class="disc" aria-hidden="true" title="' + ttl + '"></span>') +
      (p ? '<span class="who">' + esc(name) + '</span>' : '') +
      (why
        ? '<div class="said">' + esc(why) + '</div>'
        : '<div class="said none">' + G.speaker.noReason + '</div>') +
      '</div>';
  };
  // **A rail entry's body is its speaker** (Ed, 2026-09-12: *[user avatar]
  // Rationale text; if no rationale, no body text*): the teaser under a
  // proposal's title and under a motion's is the rationale behind the same
  // disc the card draws — the sealed head-and-shoulders, or the author's own
  // face where the name is attached (K30), and nothing at all where nobody
  // gave a reason. One helper for the charter's entries and the band's, so
  // the two rails cannot drift. `.qwhy` is the rail's teaser class; `.spoke`
  // is this form of it, the clamp moving to the text beside the face.
  const railSpeakerHtml = (why, who) => {
    if (!why) return '';
    const p = personOf(who);
    return '<span class="qwhy spoke"><span class="qface" aria-hidden="true">' +
      (p ? avHtml(p) : '<span class="disc"></span>') +
      '</span><span class="qsaid">' + esc(why) + '</span></span>';
  };

  // The fold triangle — one control on every surface (2026-08-19, lifted
  // from session-view when setup grew its own copy). Fold state lives with
  // each page, so `open` arrives as a fact rather than being read here.
  const secToggleHtml = (key, open, cls) =>
    '<button class="sectoggle' + (cls ? ' ' + cls : '') + '" data-sec-toggle="' + esc(String(key)) + '"' +
    ' aria-expanded="' + open + '" title="' + (open ? G.sectoggle.fold : G.sectoggle.unfold) +
    '"><span class="tri">▸</span></button>';

  // The field label names the band and, where there is more than one candidate,
  // says how many — which is a fact about this card rather than a standing, so
  // §8.3 has nothing to say about it.
  const fieldHtml = (inner, n, label) =>
    '<div class="field"><div class="fieldlab">' +
    (label || (n > 1 ? G.field.rivals(n) : G.field.proposed)) +
    '</div>' + inner + '</div>';

  // The field a sealed judgment was decided from — only things that were
  // *proposed*. The incumbent is not a proposal: it is what they were all
  // measured against, so it gets its own block rather than a place in the
  // ranking (which would otherwise print "the current text: not adopted").
  // The rank number identifies a proposal in the record, so it needs no letter
  // either (Ed, 197) — a field of five reads 1..5, and a lone proposal is
  // named by what it is.
  function fieldOf(s) {
    // `by` rides only where a record has unsealed an author (the close),
    // `underNote` beside it where that record was made under more than one
    // disclosure rung (entry 31), and `refusal` where somebody said why it
    // ended — the Founder's 🛡️ on the Text (R-056). All three arrive as
    // finished words, the vocabulary having been resolved by the page or the
    // host that owns it.
    if (s.slate) return s.slate.map((c) => ({ label: '', text: c.text, why: c.rationale, p: c.p, won: !!c.won, by: c.by || null, underNote: c.underNote || null, refusal: c.refusal || null }));
    if (s.kind === 'race') return [
      { label: '', text: s.race.a.text, why: s.race.a.rationale, p: s.race.a.p, won: s.won === 'a', by: s.race.a.by || null },
      { label: '', text: s.race.b.text, why: s.race.b.rationale, p: s.race.b.p, won: s.won === 'b', by: s.race.b.by || null },
    ];
    // no label: the band above already says "what was proposed", and printing
    // it again on the only thing in the band said it twice
    return [{ label: '', text: s.optionB, why: s.rationale, p: (s.decided || {}).p, won: s.won === 'b', by: s.by || null, underNote: s.underNote || null, refusal: s.refusal || null }];
  }

  const groundNote = (s) => (!s.shifted || !s.wasGround ? ''
    : '<div class="replaced"><div class="rtag">' + G.ground.tag +
      '<span class="rsub">' + G.ground.sub + '</span></div>' +
      '<div class="rtext">' + esc(s.wasGround) + '</div></div>');

  // ---- the clause sentences, one home -------------------------------------
  // **One value, one sentence, the document's own** (Q1112 (b), Ed 2026-09-01:
  // *we should try and use clause sentences whenever we can*). Q1109 put the
  // clause sentence on the founder's option blocks and left the T41 gradient
  // labels standing in the value's other homes — the member's blind ladder,
  // the composer's lane, the settled strip, the readback — so one value wore
  // two wordings depending on who was reading. Every one of those homes now
  // reads this table.
  //
  // The readers live here rather than in session-view's inline script because
  // setup.js's answer ladders are one of the homes and setup.js loads first
  // (constitution.js → copy.js → cards.js → setup.js → session.js → inline);
  // a helper belongs in the shared file its callers share, and a second copy
  // of a sentence is exactly the drift this ends. It is deliberately **not**
  // in `@draft/constitution` beside `meaningOf`: no architecture without a
  // second consumer (survey item 10, undecided), so it stays page-side until
  // the closing record wants the sentences.
  //
  // A value whose sentence depends on the room takes a function of one
  // context object, never of module state — this file has none.
  // The sentences themselves live in copy.js (the one copy home, 2026-09-05,
  // with the table's own history in its header there); this file keeps the
  // readers, so every caller and export is unchanged.
  const RULES = window.COPY.RULES;
  // the sentence a value would set, in this room. `x` carries only what a
  // sentence names: `founderIsMember`, `admissionPrice`.
  const clauseOf = (k, v, x) => {
    const t = RULES[k]; if (!t) return '';
    const s = t[v];
    return typeof s === 'function' ? s(x || {}) : (s || '');
  };
  // every value of a setting, in the table's own order, as `[value, sentence]`
  const clauseRungs = (k, x) => Object.keys(RULES[k] || {})
    .map((v) => [v, clauseOf(k, v, x)]);

  // ---- geometry, the pure half --------------------------------------------

  // The collapse now travels the card's whole box back onto its paragraph
  // rather than stopping at head height, so it is given a little longer and a
  // curve that *lands* — fast out, soft in — where the old one accelerated into
  // a jump it was never going to make gracefully.
  const COLLAPSE_MS = 240, EXPAND_MS = 230;

  const headOnlyHeight = (el) => {
    const head = el.querySelector('.clausehead');
    if (!head) return 0;                       // no clause to grow from: from nothing
    const cs = getComputedStyle(el);
    return (head.getBoundingClientRect().bottom - el.getBoundingClientRect().top) +
      parseFloat(cs.paddingBottom) + parseFloat(cs.borderBottomWidth);
  };
  // everything except the clause: what the opening gap reveals
  const cardBody = (el) => [...el.children].filter((c) => !c.classList.contains('clausehead'));

  // ---- the lane controls (Q1294 (b), Ed 2026-09-10) -------------------------
  // **One strip for the whole column**, at the top right of the text's card
  // in edit mode: B and I act on the selection in whichever editing lane
  // holds the caret (and are disabled while none does), `[]` flips every
  // clause and every open lane between rendered and source, its pressed-ness
  // carrying the state. Drawn by the column's host beside the column, never
  // inside the contenteditable (a button inside one becomes harvested text),
  // and never per lane — a patch with three sites has one strip.
  // The italic button is a **serif capital I** (Ed, 2026-08-17): a sans
  // italic I is a slash with no serifs on it — it reads as punctuation rather
  // than as a letter. The serifs are what make it an I while it is still
  // leaning. `[]` is one button, not a pair (Ed, 2026-08-17): off by default,
  // pressed for markdown.
  function laneCtlHtml(raw) {
    return '<div class="lanectl" data-editctl="1">' +
      '<button class="lfmt" data-fmt="bold" disabled title="' + G.fmt.bold + '"><b>B</b></button>' +
      '<button class="lfmt" data-fmt="italic" disabled title="' + G.fmt.italic + '">' +
      '<span class="ital">I</span></button>' +
      '<button class="lmode" data-act="col-mode" data-mode="' + (raw ? 'rich' : 'md') + '"' +
      ' aria-pressed="' + !!raw + '" title="' + G.fmt.mdMode + '">[]</button>' +
      '</div>';
  }

  // ---- the factory --------------------------------------------------------
  // `env` keys are functions, read at call time. Defaults are the inert
  // surface: nothing picked, nothing locked beyond what `s` says, no wash, no
  // chip strip, radios speaking `data-v`.
  function make(env0) {
    const env = Object.assign({
      pickOf: () => null,
      stateOf: () => '',
      isCast: () => false,
      isJudged: () => false,
      verdictOf: () => '',
      isTopUrgent: () => false,
      isChilled: () => false,
      washFor: () => '',
      ownChip: () => '',
      speakerTitle: '',   // falsy → speakerHtml's own default wording
      laneRaw: () => false,
      currentTextFor: () => '',
      valAttr: 'data-v',
      root: () => document,
      readLine: () => 150,
      reduced: () => matchMedia('(prefers-reduced-motion: reduce)').matches,
      onExpand: () => {},
      // **You are not shown an act you cannot take** (Ed, 2026-08-21). Two
      // seams, both permissive by default so a caller that sets neither
      // renders exactly what it always did:
      //   mayPropose — may this reader propose at all? A lane's ✏️ is an
      //     *offer*, so it disappears rather than greying.
      //   lockedOf   — is this card locked to this reader? A race is a
      //     *question put to you*, so it stays visible and inert; that is
      //     the state the commit row already draws.
      mayPropose: () => true,
      lockedOf: () => false,
      // **The editing card shows the face the room will see** (K30). Two
      // reads, both permissive-by-absence so a surface that sets neither draws
      // exactly the sealed disc and the sealed title it draws today:
      //   authorRung — the 👤 rung as it stands, `null` where the surface has
      //     no module to ask (the fixture, the setup pages);
      //   signerPerson — the viewer as the room would see them, `{ n, pic }`.
      authorRung: () => null,
      signerPerson: () => null,
    }, env0 || {});

    // The pick control. Two labels rather than one rewritten in JS, so the
    // existing `choose()` — which only ever flips aria-pressed — keeps working
    // untouched across every card a patch is showing on.
    function laneBarHtml(s, v, opts) {
      const o = opts || {};
      // the register is the caller's (CP2): a judgment's lane prefers; a
      // composer's lane proposes, or chooses where the chooser alone decides
      // (Ed, 2026-09-06) — the words arrive as `opts.words`, the default is
      // the judgment's pair. **Every lane on a judgment card takes that
      // default, the current text's included** (Q1362 (a)): the field has no
      // privileged member, so it can have no privileged register.
      const w = o.words || { off: G.lane.prefer, on: G.lane.preferred, title: G.lane.pickTitle };
      return '<div class="lanebar">' +
        '<button class="lanepick" type="button" ' + env.valAttr + '="' + esc(String(v)) + '"' +
        ' aria-pressed="' + (env.pickOf(s) === v) + '"' + (env.lockedOf(s) ? ' disabled' : '') +
        ' title="' + esc(w.title) + '">' +
        '<i class="dot" aria-hidden="true"></i>' +
        '<span class="off">' + esc(w.off) + '</span><span class="on">' + esc(w.on) + '</span></button>' +
        (o.edit === false || !env.mayPropose() ? '' : laneProposeHtml(s, o.lane || v, o.key)) +
        '</div>';
    }

    // The clause, lifted out of the document into the head of the card. It is
    // the same text at the same size, because it *is* the document — only the
    // label above says it has been picked up. The gutter marks come with it, so
    // a second live suggestion at this clause keeps the way in that it had while
    // the paragraph was there.
    // The clause keeps its highlight when it becomes a head, and its gutter mark
    // keeps its place (Ed, 2026-08-17). Both fall out of one move: the washed
    // block inside the head is given the same box as a `.anch` paragraph — the
    // same negative margin, the same padding — so the wash lands on the same
    // rectangle and the `.chipcol` inside it lands in the same gutter column.
    // The mark you clicked therefore does not move at all, which is what makes
    // the card feel like the clause opening rather than something replacing it.
    function clauseHeadHtml(s, o) {
      const opt = !!o.v;
      // **The strip does not reorder** (Ed, 2026-08-17: *when I click between tabs
      // on a card, they shouldn't move around*). The card's own tab used to be
      // prepended, so every switch dealt the column again and the tab you were
      // aiming at moved out from under the pointer on arrival. A tab strip is a
      // fixed set of places you move a highlight around — that is the whole of
      // what makes it a strip rather than a list of shortcuts.
      //
      // It costs nothing that the active one is no longer first: the gutter's pile
      // only ever opens its *front* tab, which is index 0 in the same stack order
      // the strip uses, so the mark you clicked is still at index 0 when the card
      // arrives and the 0px claim holds.
      //
      // `o.chips` is the whole strip when it is given. A card built without one —
      // the diagonal, which stands at no clause of its own — still needs its own
      // mark, because that mark is how it closes.
      //
      // `o.marks` (seam, 2026-08-18) replaces the chipcol wrapper wholesale: the
      // setup surfaces' strip builders return an *already-wrapped* chipcol, and
      // without this they would arrive double-wrapped.
      const marks = o.marks !== undefined ? o.marks
        : '<span class="chipcol">' +
        (o.chips && o.chips.includes('data-anchor="' + s.id + '"')
          ? o.chips
          : env.ownChip(s) + (o.chips || '')) + '</span>';
      return '<div class="clausehead">' +
        // `label: null` means *no eyebrow*: the decided card's head is the top of a
        // ranking whose rank, outcome and score are all in the card's own eyebrow
        // one line above, so a second label under it was the third telling.
        (o.label === null ? ''
          : '<div class="headlab"><span>' + (o.label || G.head.label) + '</span></div>') +
        // `data-key` sits on the washed block, not on the text inside it, because
        // that is the box `.anch` is: hold the text instead and the scroll
        // anchoring lands six pixels out, which is exactly the paragraph's own
        // padding-top that the text does not carry.
        '<div class="headclause"' + (o.key ? ' data-key="' + o.key + '"' : '') +
        (o.washAttrs !== undefined ? o.washAttrs
          : o.wash === false ? '' : env.washFor(s, o.key)) + '>' + marks +
        // `html` for the one head built of several paragraphs: a composer site is
        // a run of clauses joined into one piece of text (225)
        (o.html !== undefined
          ? '<div class="rtext">' + o.html + '</div>'
          : o.text === null
          ? '<div class="rtext none">' + esc(o.nothing != null ? o.nothing : G.head.nothingAtAll) + '</div>'
          : '<div class="rtext">' + mdLine(o.text) + '</div>') +
        '</div>' +
        // **The head's lane is a lane like any other** (Q1362 (a), 2026-09-15):
        // the current text is a candidate in the field, authored by nobody and
        // staked with nothing, so it takes `laneBarHtml`'s own default pair —
        // *Prefer this* / *Preferred* — and never a *Keep* register of its own.
        // What says it is the current text is the head's label above it. The
        // lane **id** stays `keep`: that is the value `judge()` sends and the
        // server reads, and only the words were ever the asymmetry.
        (opt ? laneBarHtml(s, o.v, { lane: 'keep', key: o.key, edit: o.edit }) : '') +
        '</div>';
    }

    // One candidate: what it would make the clause say, who argued for it, and
    // what you can do about it. A reply, in the shape a reply has everywhere.
    // `by` is a name the reveal rule has already allowed (a signed proposal,
    // or one made under `public` — Q770): the speaker is revealed, and the
    // sealed title does not apply to it.
    const proposalHtml = (s, o) =>
      '<div class="propblock">' +
      (o.tag ? '<div class="rtag">' + o.tag + '</div>' : '') +
      '<div class="rtext">' + o.html + '</div>' +
      speakerHtml(o.why, o.by ? undefined : env.speakerTitle, o.by || undefined) +
      (o.v ? laneBarHtml(s, o.v, { lane: o.lane || o.v, key: o.key, edit: o.edit }) : '') +
      '</div>';

    function commitRowHtml(s, extra) {
      // **Indifference is a full option block** (CP4, Q1099, 2026-08-31 —
      // revising Ed 2026-08-16's row placement): a textless block under the
      // same hairline as the lanes, its radio naming the act instead of
      // *Prefer this*, because *neither of these* is one more answer to the
      // same question and the blocks are where the answers live. It stays out
      // of the lanes proper — a judgment about the *pair*, not any text
      // (SPEC §3.2) — so it is the block after them.
      //
      // Submit is always rendered and greyed until something is chosen (Ed,
      // 2026-08-16, revising 202/204). The old argument was that a disabled
      // button is a thing you are being told off by; against it, an absent one
      // gives the row no shape and the reader no idea what finishing looks like.
      // A greyed tick in the corner says *this is where this ends* from the
      // moment the card opens.
      // **Every radio on a card lines up down its left edge** (Ed, 2026-08-17),
      // locked or not — the block keeps the vin radio in the same column as
      // the lanes' own.
      //
      // **🗑️ joins the row** (CP7, Q1102 — C4 wins over the old table rows):
      // far left, always live; it clears an uncommitted choice and closes,
      // and a cast vote stays, the bin putting back un-actioned input only.
      return vinBlockHtml(s) + commitBarHtml(s, extra);
    }
    // **The two halves of the commit row** (Q1382, Ed 2026-09-15: *the vote
    // for a patch is also floating, since there is no single card for it to
    // sit on*): the Indifferent block is an answer and stays with the
    // answers — on a patch, on every site card — while the bar of acts
    // (🗑️ · ❄️? · ✓) is drawn once, on the card for every other kind and on
    // the proposal-row at the foot of the window for a patch, which is why
    // the bar takes a class of its own to wear there.
    function vinBlockHtml(s) {
      const pick = env.pickOf(s);
      return '<div class="pick vinblock">' +
        '<button class="lanepick vin" type="button" ' + env.valAttr + '="indifferent"' +
        ' aria-pressed="' + (pick === 'indifferent') + '"' + (env.lockedOf(s) ? ' disabled' : '') +
        ' title="' + (s.kind === 'diagonal' ? G.commit.vinDiagonal : G.commit.vinPair) + '">' +
        '<i class="dot" aria-hidden="true"></i>' +
        '<span class="off">' + G.commit.indifferent + '</span><span class="on">' + G.commit.indifferent + '</span></button></div>';
    }
    function commitBarHtml(s, extra, cls) {
      const pick = env.pickOf(s);
      const insists = env.isTopUrgent(s) && env.stateOf(s) === 'needs';
      return '<div class="race-mid commitrow' + (cls ? ' ' + cls : '') + '"' +
        (cls ? ' data-patchrow="' + s.id + '"' : '') + '>' +
        '<button class="btn glyphbtn" data-act="clear-close" title="' +
        (env.lockedOf(s) ? G.commit.binLocked : G.commit.bin) + '">🗑️</button>' +
        (extra || '') +
        // The two acts on this card share the right-hand corner, in the order you
        // would reach for them: ❄️ first because it is the one that says *not now*,
        // then the ✓ that says *now*. Grouped, so space-between does not float the
        // snowflake into the middle of the row.
        '<span class="rightpair">' +
        ((insists || env.isChilled(s.id))
          ? '<button class="btn glyphbtn chill" data-act="chill"' +
            ' aria-pressed="' + env.isChilled(s.id) + '" title="' +
            (env.isChilled(s.id) ? G.commit.chillOn : G.commit.chillOff) + '">❄️</button>'
          : '') +
        (env.lockedOf(s) ? '' : '<button class="btn btn-approve glyphbtn"' +
          (pick ? '' : ' disabled') +
          ' data-act="submit" aria-pressed="' + env.isCast(s) + '" title="' +
          (env.isCast(s) ? G.commit.cast
            : pick ? G.commit.submit : G.commit.choose) + '">' + TICK + '</button>') +
        '</span>' +
        '</div>';
    }

    function reviseNote(s) {
      if (!env.isJudged(s)) return '';
      const said = '<span class="rl">' + G.revise.you + (env.verdictOf(s) || s.verdict || G.revise.voted) + '</span>';
      if (s.shifted) {
        return '<div class="srationale locked">' + said + esc(s.shifted) +
          G.revise.shiftedTail + '</div>';
      }
      // **The unlocked case says nothing at all** (Ed, 2026-08-17). It had been
      // trimmed once already, to what you said plus the fact it can change, and
      // both halves turn out to be drawn elsewhere on the same card: the radio on
      // the lane you chose reads *Preferred*, which is what you said, and it is
      // still a live radio, which is what *you can change this* means. A line of
      // prose restating two controls the reader is looking at is the design
      // explaining itself.
      //
      // The shifted case above keeps its sentence, and the contrast is the whole
      // reason: there the controls are dead, so the card cannot say it by being
      // itself and a sentence is the only thing that can.
      return '';
    }

    /**
     * The one element at the head of the draft's own speaker, and the whole of
     * what K30 decides for a rationale being written: **it shows the face the
     * room will see**, and its tooltip says which of the three cases you are in.
     *
     * `public` names you from the moment you propose, so the face is yours and
     * the title says so. Under an elective rung it follows the sign choice —
     * yours when the draft is signed, the sealed disc when it is not — which is
     * why `setDraftSigned` calls this again rather than re-rendering a lane
     * somebody has a caret in. Under `anonymous`, `anonymousElective` unsigned,
     * `sealed` and `sealedElective` unsigned the disc stays, and the two titles
     * differ only in whether the seal ever lifts: the closing record, or never.
     *
     * With no `authorRung` — the fixture, the setup pages, any surface that
     * sets no seam — this is the disc and the sentence it has always drawn.
     */
    function draftFaceHtml(d) {
      const rung = env.authorRung();
      const elective = rung === 'anonymousElective' || rung === 'sealedElective';
      const person = rung === 'public' || (elective && !!(d && d.signed))
        ? env.signerPerson() : null;
      if (person) {
        return '<span class="spkface" title="' + G.draftFace.signed + '">' + avHtml(person) + '</span>';
      }
      const forever = rung === 'anonymous' || rung === 'anonymousElective';
      return '<span class="disc" aria-hidden="true" title="' + G.draftFace.sealedLead +
        (forever ? G.draftFace.forever : G.draftFace.untilClose) + '"></span>';
    }

    // **The editing surface itself**, extracted so the `editing-card` and the
    // `deadlock-card` share one rather than each growing their own (Ed,
    // 2026-08-17 asked the deadlock card for *a full proposal edit box*, and two
    // boxes that drift apart is exactly what "full" must not come to mean).
    //
    // `blank` is the state before a draft exists: the lane holds the clause and
    // is a real editor, but nothing is backing it yet, so the first keystroke
    // opens the draft with that character already applied. Which is
    // `always-on-typing`, applied to a box instead of to a paragraph — the same
    // idea and, it turns out, the same function underneath.
    function laneBoxHtml(d, site, blank) {
      // **No controls of its own since Q1294 (b)** (Ed, 2026-09-10: *top right
      // of the edit box, identical to the existing composer control. You can
      // put bold and italic there too*): the lane is the text and nothing
      // else. B, I and `[]` are one strip at the top right of the lifted
      // column — `laneCtlHtml` below, drawn by session.js beside the column —
      // so a patch with three sites has one strip, not three, and
      // `env.laneRaw()` is the one view state read here.
      return '<div class="lanebox' + (blank ? ' blanklane' : '') + '">' +
        (blank
          ? '<div class="editlane" contenteditable="true" data-deadlane data-key="' + blank +
            '" spellcheck="false"><div class="lp">' + esc(env.currentTextFor(blank)) + '</div></div>'
          : '<div class="editlane' + (env.laneRaw() ? ' md' : '') + '" contenteditable="true" data-lane="' +
            site.keys[0] + '" spellcheck="false">' +
            laneBlocks(site.text, originText(site), headFlags(site), env.laneRaw()) + '</div>') +
        // …and the face on it is **what everybody else will see**, not what you
        // know (K30, backlog 255). One place decides it, because `setDraftSigned`
        // patches the same element in place when the sign choice flips.
        // The rationale is **inside** the same surface (Ed, 2026-08-17): you are
        // expected to fill in both, so they are one editing surface at one
        // height rather than two boxes at different ones — and the speaker's
        // disc comes with it, because it belongs to the words beside it. A
        // hairline separates them without dividing them, which is the card's own
        // band grammar applied one level down.
        '<div class="speaker">' + draftFaceHtml(d) +
        '<div class="said edit-why" contenteditable="plaintext-only"' +
        (blank ? ' data-deadwhy="' + blank + '"' : ' data-why') + ' spellcheck="false"' +
        // Ed, 2026-08-17. A question invited an answer to a different question —
        // "because it's clearer" — where an opening clause invites the sentence
        // the field is actually for. It also states the act: what you are writing
        // is the case for a change, not a note about one.
        ' data-placeholder="' + G.whyPlaceholder + '">' +
        esc((d && d.rationale) || '') + '</div></div>' +
        '</div>';
    }

    // ---- open/close geometry ----------------------------------------------

    // **The card grows out of its own clause** (Ed, 273; replacing the swap that
    // came in with the stacked card, which was correct but jarring).
    //
    // The old unroll grew a card from nothing *underneath* its clause. That
    // stopped making sense once the card became the clause opened: growing from
    // zero meant the paragraph blinking out and something else inflating in the
    // hole. The swap that replaced it was honest and instant, and instant is the
    // problem — nothing tells you where the rest of the charter went.
    //
    // So the card does not grow from nothing. It grows from **exactly the height
    // at which only its own head is showing** — which is the clause, at the size
    // and place the clause already was. Frame one therefore looks like the
    // document with the paragraph still in it; the gap then slides open beneath
    // the clause and the field arrives inside it, fading in a beat behind the
    // motion so the two do not compete. The clause itself never moves: keepStill
    // has already pinned it, and everything that grows, grows below it.
    //
    // Closing runs the same thing backwards, down to head height, and the swap
    // back to a plain paragraph happens at a size where the two are the same
    // shape — so the substitution is never seen.

    // **A card closes all the way back into its paragraph** (Ed, 2026-08-17: the
    // close "feels quite abrupt … the whole card disappears and the text above
    // shifts").
    //
    // It used to collapse to `headOnlyHeight` — the height at which only the head
    // shows, which is where *opening* starts — and then hand over to a re-render
    // that swapped the card for a plain paragraph. Symmetrical on paper, and
    // wrong in use, because a card at head height is not a paragraph: it is a
    // lifted white box with an eyebrow over the clause, 14px of padding round it
    // and its top edge 34px higher than the paragraph's will be. So the animation
    // ran smoothly to a shape that was still 93px too tall and 38px too high, and
    // *then* everything jumped. Opening gets away with the same discrepancy
    // because the jump happens in the frame of the click, before the motion;
    // closing puts it after, which is the one order the eye cannot forgive.
    //
    // So the collapse animates the card's whole box onto the paragraph's box —
    // its height down to the `.headclause` (which is the paragraph's own box by
    // construction: same padding, same negative margin, same width), its padding
    // away, its eyebrow shut, its lift and its white ground out. The margin-top
    // grows by exactly what the padding and the eyebrow gave up, so the clause
    // itself does not move a pixel while everything around it leaves. The last
    // frame *is* a paragraph, and the swap that follows has nothing left to do.
    function collapseCard(el, done) {
      if (!el || env.reduced()) return done();
      // A card that has scrolled off the top is not worth animating: for 190ms it
      // would shrink where nobody can see it while hauling the rest of the charter
      // up the screen, and the delay is 190ms the click doesn't answer in. It goes
      // at once, and the caller's keepStill takes up the slack in the same frame.
      if (el.getBoundingClientRect().bottom < env.readLine()) { el.style.display = 'none'; return done(); }
      const cs = getComputedStyle(el);
      const hc = el.querySelector('.clausehead .headclause');
      const lab = el.querySelector('.clausehead .headlab');
      const h = el.offsetHeight;
      const body = cardBody(el);
      // Falls back to the old head-height collapse where there is no clause to
      // land on — an `insert-anchor` card has no head, so there is no paragraph
      // for it to become.
      const end = hc ? hc.offsetHeight : headOnlyHeight(el);
      const padT = parseFloat(cs.paddingTop) || 0;
      const labH = lab ? lab.getBoundingClientRect().height +
        (parseFloat(getComputedStyle(lab).marginBottom) || 0) : 0;
      const mt = parseFloat(cs.marginTop) || 0;
      const para = env.root().querySelector('.prose p');
      const endMB = para ? getComputedStyle(para).marginBottom : cs.marginBottom;

      el.style.clipPath = 'inset(-60px -100px 0px -100px)';
      el.style.height = h + 'px';
      void el.offsetHeight;
      const ease = COLLAPSE_MS + 'ms cubic-bezier(.32, .72, 0, 1)';
      el.style.transition = ['height', 'padding-top', 'padding-bottom', 'margin-top',
        'margin-bottom', 'box-shadow', 'background-color'].map((p) => p + ' ' + ease).join(', ');
      if (hc) {
        el.style.height = end + 'px';
        el.style.paddingTop = '0px';
        el.style.paddingBottom = '0px';
        // the top edge descends by exactly what it stops holding, so the clause
        // stays put while the card leaves from every other side
        el.style.marginTop = (mt + padT + labH) + 'px';
        el.style.marginBottom = endMB;
        el.style.boxShadow = 'none';
        el.style.backgroundColor = 'transparent';
        if (lab) {
          lab.style.transition = 'opacity 90ms ease-in, height ' + ease + ', margin-bottom ' + ease;
          lab.style.overflow = 'hidden';
          lab.style.height = '0px';
          lab.style.marginBottom = '0px';
          lab.style.opacity = '0';
        }
      } else {
        el.style.height = end + 'px';
      }
      // the body goes first and faster, so the gap is closing over something
      // already gone rather than crushing it
      body.forEach((c) => {
        c.style.transition = 'opacity ' + (COLLAPSE_MS - 70) + 'ms ease-in';
        c.style.opacity = '0';
      });
      setTimeout(done, COLLAPSE_MS);
    }

    function expandCard(el, done) {
      if (!el || env.reduced()) return done();
      const h = el.offsetHeight;
      const start = Math.min(headOnlyHeight(el), h);
      const body = cardBody(el);
      el.style.clipPath = 'inset(-60px -100px 0px -100px)';
      el.style.height = start + 'px';
      body.forEach((c) => { c.style.opacity = '0'; });
      void el.offsetHeight;
      // an ease-out on the height so the gap opens quickly and settles, and the
      // fade held back 60ms so the field reads as arriving *into* the gap rather
      // than the two happening at once
      el.style.transition = 'height ' + EXPAND_MS + 'ms cubic-bezier(.22, .61, .36, 1)';
      el.style.height = h + 'px';
      body.forEach((c) => {
        c.style.transition = 'opacity ' + (EXPAND_MS - 60) + 'ms ease-out 60ms';
        c.style.opacity = '1';
      });
      setTimeout(() => {
        el.style.height = ''; el.style.clipPath = ''; el.style.transition = '';
        body.forEach((c) => { c.style.opacity = ''; c.style.transition = ''; });
        env.onExpand();
        done();
      }, EXPAND_MS);
    }

    // A patch has a card at every site (181), so open and close operate on a set.
    const openCardEls = (id) => [...env.root().querySelectorAll('.sugg[data-card="' + id + '"]')];
    const runOnCards = (fn) => (id, done) => {
      const els = openCardEls(id);
      if (!els.length) return done();
      let left = els.length;
      els.forEach((el) => fn(el, () => { if (--left === 0) done(); }));
    };
    const collapseCards = runOnCards(collapseCard);
    const expandCards = runOnCards(expandCard);

    // Keeping the page still across a layout change (Ed, 2026-08-16).
    //
    // Opening a card is meant to be *one* movement: the charter slides once and
    // stops. But three things in the sequence change the height of content that
    // may be sitting above where you are reading — the old card closing, sections
    // folding and unfolding, and the re-render that follows each — and each of
    // them drags everything below it, so the page lurched before the scroll had
    // begun and then eased back. Nothing was wrong with the destination; the
    // charter simply moved twice to get there.
    //
    // The remedy is the browser's own scroll-anchoring, done by hand because the
    // document is re-rendered wholesale and the native version has nothing stable
    // to hold on to. Note a clause you can see and where it sits, make the change,
    // then move the scroll by however far that clause has travelled — so it has
    // not travelled at all. Several candidates, because the change may be a fold
    // that takes the first one away with it.
    // Held by *selector*, not by element: the document is re-rendered wholesale,
    // so the node measured before the change no longer exists after it, and the
    // selector is the only thing that survives. A clause is found by its key; a
    // proposed section has no key — it is a gap where text is not yet — so it is
    // found by the entry it belongs to. Getting this wrong is quiet: the fallback
    // holds some *other* clause still and the one you were sent to slides away.
    const STILL_KEYS = 8;
    function stillRef(preferSel) {
      const sels = [];
      const add = (sel) => {
        const el = sel && env.root().querySelector(sel);
        if (el && !sels.some((m) => m.sel === sel)) sels.push({ sel, top: el.getBoundingClientRect().top });
      };
      add(preferSel);
      for (const el of env.root().querySelectorAll('[data-key]')) {
        if (el.getBoundingClientRect().bottom <= env.readLine()) continue;   // scrolled past
        add('[data-key="' + el.dataset.key + '"]');
        if (sels.length >= STILL_KEYS) break;
      }
      return sels;
    }

    function restoreStill(ref) {
      if (!ref || !ref.length) return;
      for (const m of ref) {
        const el = env.root().querySelector(m.sel);
        if (!el) continue;                                   // folded away by the change
        const drift = el.getBoundingClientRect().top - m.top;
        if (Math.abs(drift) > 0.5) scrollTo(0, scrollY + drift);
        return;
      }
    }

    // Measure, change, correct — in one synchronous run, so the drift is never
    // painted. `preferSel` names the clause the move is *about*, which is the
    // right thing to hold once we have arrived at it.
    function keepStill(fn, preferSel) {
      const ref = stillRef(preferSel);
      const out = fn();
      restoreStill(ref);
      return out;
    }

    return {
      laneBarHtml, clauseHeadHtml, proposalHtml, commitRowHtml, vinBlockHtml, commitBarHtml, reviseNote,
      laneBoxHtml, draftFaceHtml, collapseCard, expandCard, openCardEls, runOnCards,
      collapseCards, expandCards, stillRef, restoreStill, keepStill,
    };
  }

  return {
    esc, resultOnly, stripTags, pct, plainLabel, URG_LO, URG_HI,
    RULES, clauseOf, clauseRungs,
    TICK, PAUSE, VS16, MARK, DRAWN, mkHtml, markHtml,
    tokens, diffPieces, markHtml2, MARK_FLOOR, wordingHtml, laneBlocks,
    headFlags, originText, MD_RX, mdToHtml, htmlToMd, mdStrip, mdBlock, linkify, linkifyHtml, mdLine,
    MD_ONE, mdLead, mdInner, mdParts, richToSource, sourceToRich, readLane,
    laneSeed, laneProposeHtml, laneCtlHtml, speakerHtml, railSpeakerHtml, secToggleHtml, fieldHtml, fieldOf, groundNote,
    initials, PERSON, avHtml,
    headOnlyHeight, cardBody, COLLAPSE_MS, EXPAND_MS,
    make,
  };
})();
