/**
 * The document's type, measured (Q1402, 2026-09-16).
 *
 * Every number the type plan rests on is a measurement of the page as it
 * renders — how many characters a body line holds at the measure, how tall
 * a line box is, how tall the title and each heading rank are, and whether
 * the topbar moved — so the plan's *measured, never assumed* has one
 * instrument to be measured with. It borrows `pic-measure.mjs`'s shape: a
 * static server over design/, the Hollow Oak fixture, one table.
 *
 *   node design/tools/type-measure.mjs            # the table, 1600 then 390
 *   node design/tools/type-measure.mjs --json
 *   node design/tools/type-measure.mjs --width=1600 --height=1000   # one size
 *
 * It asserts nothing on its own: `npm run probe` and `card-audit` hold the
 * surface still. This is the instrument for reading a change to the type.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const DESIGN = join(ROOT, 'design');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};
const arg = (name, dflt) => {
  const hit = process.argv.find((a) => a.startsWith('--' + name + '='));
  return hit ? hit.split('=').slice(1).join('=') : dflt;
};
const AS_JSON = process.argv.includes('--json');
const ONE = arg('width', null);
const SIZES = ONE ? [{ width: +ONE, height: +arg('height', 1000) }]
  : [{ width: 1600, height: 1000 }, { width: 390, height: 844 }];

/** design/ over a free port, no traversal — the audits' server, verbatim. */
function serveDesign() {
  const server = createServer(async (req, res) => {
    try {
      const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      const file = normalize(join(DESIGN, path === '/' ? '/session-view.html' : path));
      if (!file.startsWith(DESIGN + sep) && file !== DESIGN) { res.writeHead(403); return res.end(); }
      const s = await stat(file);
      const body = await readFile(s.isDirectory() ? join(file, 'index.html') : file);
      res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(body);
    } catch { res.writeHead(404); res.end(); }
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

/* What is read, in the page. Characters per line are counted by laying a
   Range over each word of a paragraph and grouping the words by the line
   rect they land on: a full line is every line but the last, and its count
   is the characters it holds, spaces included. The line box is the first
   line rect's height. */
const READ = () => {
  const px = (el, prop) => parseFloat(getComputedStyle(el)[prop]);
  const r2 = (n) => Math.round(n * 100) / 100;
  const lineBoxes = (el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const rects = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
    // one entry per distinct top: inline fragments share a line
    const tops = [];
    for (const r of rects) if (!tops.some((t) => Math.abs(t.top - r.top) < 1)) tops.push({ top: r.top, height: r.height });
    return tops;
  };
  const charsPerLine = (p) => {
    const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
    const words = [];   // { top, chars }
    let node;
    while ((node = walker.nextNode())) {
      if (node.parentElement.closest('.chipcol, .nocaret, .sectoggle')) continue;
      const text = node.data;
      const re = /\S+\s*/g;
      let m;
      while ((m = re.exec(text))) {
        const range = document.createRange();
        range.setStart(node, m.index);
        range.setEnd(node, m.index + m[0].trimEnd().length || m.index + 1);
        const rect = range.getClientRects()[0];
        if (!rect) continue;
        words.push({ top: Math.round(rect.top), chars: m[0].length });
      }
    }
    const lines = [];
    for (const w of words) {
      const last = lines[lines.length - 1];
      if (last && Math.abs(last.top - w.top) < 2) last.chars += w.chars;
      else lines.push({ top: w.top, chars: w.chars });
    }
    // the last word's trailing whitespace is none; every other line's count
    // includes the space that ended it
    return lines.map((l) => l.chars);
  };
  const prose = document.querySelector('#charter > .prose') || document.querySelector('.doc .prose');
  const paras = [...document.querySelectorAll('.doc .prose p:not(.bullet):not(.blank)')]
    .filter((p) => p.textContent.trim().length > 120).slice(0, 12);
  const full = [];
  const perPara = [];
  for (const p of paras) {
    const lines = charsPerLine(p);
    if (lines.length < 2) continue;
    const fulls = lines.slice(0, -1);
    full.push(...fulls);
    perPara.push({ lines: lines.length, full: fulls });
  }
  const mean = full.length ? full.reduce((a, b) => a + b, 0) / full.length : 0;
  const sorted = [...full].sort((a, b) => a - b);
  const p0 = document.querySelector('.doc .prose p:not(.bullet)');
  const lb = p0 ? lineBoxes(p0) : [];
  const measureEl = prose;
  const cs = measureEl && getComputedStyle(measureEl);
  const measurePx = measureEl
    ? measureEl.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) : null;
  const block = (label, sel) => {
    const el = document.querySelector(sel);
    if (!el) return { label, missing: sel };
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    // the line box is the layout's: the computed line-height, or the box
    // where it is `normal`; the lines are the content height over it (the
    // fold triangle and the gutter tabs inside a heading would otherwise
    // count as lines of their own)
    const lhPx = parseFloat(cs.lineHeight);
    const content = r.height - (parseFloat(cs.paddingTop) || 0) - (parseFloat(cs.paddingBottom) || 0)
      - (parseFloat(cs.borderTopWidth) || 0) - (parseFloat(cs.borderBottomWidth) || 0);
    const lineBox = Number.isFinite(lhPx) ? lhPx : content;
    return {
      label, text: el.textContent.trim().slice(0, 40),
      fontSize: r2(px(el, 'fontSize')), lineHeight: cs.lineHeight,
      weight: cs.fontWeight, style: cs.fontStyle,
      family: cs.fontFamily.split(',')[0].replace(/"/g, ''),
      transform: cs.textTransform, tracking: cs.letterSpacing,
      lines: Math.round(content / lineBox), lineBox: r2(lineBox),
      boxW: r2(r.width), boxH: r2(r.height),
      marginTop: cs.marginTop, marginBottom: cs.marginBottom,
    };
  };
  const nav = document.querySelector('.navbar');
  const ride = document.querySelector('#ridetab .achip[data-tab="text"]');
  const first = prose && prose.firstElementChild;
  const bullet = document.querySelector('.doc .prose p.bullet');
  return {
    fontsLoaded: document.fonts.status,
    // `fonts.check` answers true when no face is declared at all, so the
    // loaded faces are asked by name
    charis: [...document.fonts].filter((f) => /Charis/.test(f.family) && f.status === 'loaded').length,
    bodyFamily: p0 ? getComputedStyle(p0).fontFamily : null,
    bodyFontSize: p0 ? r2(px(p0, 'fontSize')) : null,
    bodyLineHeight: p0 ? getComputedStyle(p0).lineHeight : null,
    bodyLineBox: p0 ? r2(parseFloat(getComputedStyle(p0).lineHeight)) : null,
    bodyGlyphBox: lb.length ? r2(lb[0].height) : null,
    measurePx: measurePx === null ? null : r2(measurePx),
    charsPerLine: {
      n: full.length, mean: r2(mean),
      min: sorted[0] ?? null, median: sorted[Math.floor(sorted.length / 2)] ?? null, max: sorted[sorted.length - 1] ?? null,
      paragraphs: perPara.length,
    },
    blocks: [
      block('title', '.doc .prose .doctitle'),
      block('lvl1', '.doc .prose .docline.lvl1'),
      block('lvl2', '.doc .prose .docline.lvl2'),
      block('lvl3', '.doc .prose .docline.lvl3'),
      block('body', '.doc .prose p:not(.bullet)'),
      bullet ? block('bullet', '.doc .prose p.bullet') : { label: 'bullet', missing: 'p.bullet' },
    ],
    topbarH: nav ? r2(nav.getBoundingClientRect().height) : null,
    rideTab: ride && first ? {
      tabTop: r2(ride.getBoundingClientRect().top), tabH: r2(ride.getBoundingClientRect().height),
      firstTop: r2(first.getBoundingClientRect().top),
      firstLineBox: (() => { const l = lineBoxes(first); return l.length ? r2(l[0].height) : null; })(),
      tabCentre: r2(ride.getBoundingClientRect().top + ride.getBoundingClientRect().height / 2),
      lineCentre: (() => { const l = lineBoxes(first); return l.length ? r2(l[0].top + l[0].height / 2) : null; })(),
    } : null,
  };
};

const server = await serveDesign();
const port = server.address().port;
const browser = await chromium.launch();
const out = [];
for (const viewport of SIZES) {
  const page = await browser.newPage({ viewport });
  await page.goto(`http://127.0.0.1:${port}/session-view.html?fixture=session`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const r = await page.evaluate(READ);
  out.push({ viewport, ...r });
  await page.close();
}
await browser.close();
server.close();

if (AS_JSON) {
  console.log(JSON.stringify(out, null, 2));
} else {
  for (const r of out) {
    console.log(`\n${r.viewport.width}×${r.viewport.height}  fonts ${r.fontsLoaded} · Charis SIL faces loaded: ${r.charis}`);
    console.log(`  body   ${r.bodyFamily}  ${r.bodyFontSize}px / ${r.bodyLineHeight}  line box ${r.bodyLineBox}px (glyph box ${r.bodyGlyphBox}px)  measure ${r.measurePx}px`);
    console.log(`  chars per full line  mean ${r.charsPerLine.mean}  median ${r.charsPerLine.median}  min ${r.charsPerLine.min}  max ${r.charsPerLine.max}  (${r.charsPerLine.n} lines, ${r.charsPerLine.paragraphs} paragraphs)`);
    for (const b of r.blocks) {
      if (b.missing) { console.log(`  ${b.label.padEnd(7)} missing: ${b.missing}`); continue; }
      console.log(`  ${b.label.padEnd(7)} ${String(b.fontSize).padStart(6)}px / ${b.lineHeight.padEnd(7)} ${b.weight} ${b.style.padEnd(6)} ${b.family.padEnd(12)} ${b.transform.padEnd(9)} tracking ${b.tracking.padEnd(6)} lines ${b.lines}  line box ${b.lineBox}px  box ${b.boxW}×${b.boxH}  margins ${b.marginTop}/${b.marginBottom}`);
    }
    console.log(`  topbar ${r.topbarH}px`);
    if (r.rideTab) console.log(`  riding tab  top ${r.rideTab.tabTop} h ${r.rideTab.tabH} centre ${r.rideTab.tabCentre} · first block top ${r.rideTab.firstTop} line box ${r.rideTab.firstLineBox} centre ${r.rideTab.lineCentre}  → off by ${Math.round((r.rideTab.tabCentre - r.rideTab.lineCentre) * 100) / 100}px`);
  }
}
