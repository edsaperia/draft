# Paper on a desk — mockup, 2026-09-23 (Q1516 (6))

The switch is `?paper=1` on `design/session-view.html` (it loads `design/paper.css` and `design/paper.js`). Without it, the page does not fetch either file. The Rules sheet and the Text sheet float on a grey desk with a gap between them, and the two rails sit on the desk as gutters. The section heading reads **Rules** under the switch. Shots come from the Hollow Oak fixture (`?fixture=session&band=1`, Rules unfolded). `plain` is the page as it stands and `paper` is the same view with the switch on. Regenerate with `node design/mockups/paper-2026-09-23/shots.mjs <npm run design's address>`.

| file | shows |
|---|---|
| `desk-plain-1-top.png` / `desk-paper-1-top.png` | 1600×1000: the top of the page across the Rules sheet, with both rails on the desk |
| `desk-plain-2-break.png` / `desk-paper-2-break.png` | 1600: the Rules sheet ending, the desk gap, the Text sheet beginning, and the contents rail's own break |
| `desk-plain-3-rules-card.png` / `desk-paper-3-rules-card.png` | 1600: an open setting card on the Rules sheet (⏱️ Proposal Rate) |
| `desk-plain-4-text-card.png` / `desk-paper-4-text-card.png` | 1600: an open race card on the Text sheet (💡 The Common Room), with its rail entry and wire |
| `desk-plain-6-founding.png` / `desk-paper-6-founding.png` | 1600: the founding page's first minute, which is one sheet with no break yet |
| `desk-plain-7-founded-break.png` / `desk-paper-7-founded-break.png` | 1600: the same founding page after ⏩, where the break arrives with the Rules and the Text sheet is still empty |
| `phone-plain-1-top.png` / `phone-paper-1-top.png` | 390×844 (@2x): the top. The sheets run to the glass and the alpha strip stands on the desk |
| `phone-plain-2-break.png` / `phone-paper-2-break.png` | 390: the break, a 16px band of desk |
| `phone-plain-3-rules-card.png` / `phone-paper-3-rules-card.png` | 390: the setting card open on the Rules sheet |
| `phone-plain-4-text-card.png` / `phone-paper-4-text-card.png` | 390: the race card open on the Text sheet |
| `phone-plain-5-contents-drawer.png` / `phone-paper-5-contents-drawer.png` | 390: the contents drawer on the desk colour, with the break between Rules and the Text |

The stagehand's dev dropdown is hidden in every shot except the two founding pairs, where ⏩ is pressed.

**Round 2, after Ed's review (2026-09-23: *the left margin seems too large, and the top and bottom margins seem too small*).** The paper shots are re-taken; the plain ones are the first round's, the plain page being unchanged. Each sheet now has an 80px margin at its top and foot at 1600 (`--sheet-margin`; 48px at 390), measured from the sheet's edge to the first or last line's box, and the Text sheet ends 80px below its last line, the scroll runway lying on the desk. At 1600 the sheet's drawn left edge comes 88px in over the tab gutter (`--sheet-trim`), so the text stands 84px from both edges and the tabs 24px from the left one; at 390 the sheets still run to the glass and the left is unchanged.

**Round 3, after Ed's review (2026-09-23: *adjust the colours of the queue cards slightly, to make them stand out better from the desk*).** The paper shots are re-taken again and the plain ones are still the first round's. Under the switch every rail entry's wash is doubled: the ground goes from 0.06 to 0.12, and the bar (the evidence meter) doubles with it, because the bar is the ground's own colour at its own alpha. A decided entry's bar goes from 0.16 to 0.32, the urgency ramp from 0.05–0.30 to 0.10–0.60, and 🔥 from 0.44 to 0.88. The doubling is written where the wash is made (`QUEUE_WASH_K` in `session.js`, a factor of 1 without the switch), so the wire leaving an entry still matches the entry's colour. The slips' captions go from `#6B747C` to `#495057` (`--slip-muted`), because the old grey measured 2.76∶1 on a decided entry's full green bar. The lowest contrast on any slip is now 4.74∶1, for a caption on that bar. Resting entries already lay at `--shadow-sm` and the open one lifts to `--shadow-xl`, three steps above, so the lift is unchanged.

**Built for everyone, 2026-09-23** (Ed: *build it*, with the P1 batch). The look is now the page's own: `design/paper.css` folded into `system.css` under `html.desk` (the page's root carries the class), `design/paper.js` loaded always, `QUEUE_WASH_K` the only strength. The `?paper=1` switch is gone, so `shots.mjs` now takes the same page for *plain* and *paper*; the PNGs here are the record of the mockup as Ed judged it, and the switch they name no longer exists.
