// merge-walks.mjs — Q1541 revision pass: splice a re-run of some walks into a
// grammar-audit payload, so one fixed card does not cost a whole re-run.
//   node design/proposal/tools/merge-walks.mjs <base.json> <supplement.json> [out.json]
// Every card, finding, zone reading and tooltip reading whose walk the
// supplement covers is taken from the supplement; the rest from the base;
// the table and the row-shape counts are recounted from the merged findings.
// (Used once, 2026-09-25: the 👑 card's note read a copy key from the wrong
// table and threw, so the settled and outsiders walks were re-run after the
// fix, while every other walk's payload stood.)
import { readFileSync, writeFileSync } from 'node:fs';
const [basePath, supPath, outPath = basePath] = process.argv.slice(2);
const base = JSON.parse(readFileSync(basePath, 'utf8'));
const sup = JSON.parse(readFileSync(supPath, 'utf8'));
const walks = new Set([...sup.cards.map((c) => c.walk), ...(sup.grammar || []).map((f) => f.walk)]);
const keep = (x) => !walks.has(x.walk);
const out = { ...base };
out.cards = base.cards.filter(keep).concat(sup.cards);
out.grammar = base.grammar.filter(keep).concat(sup.grammar);
for (const k of ['zones', 'closedTips', 'switches', 'doors', 'rails', 'strips']) {
  if (Array.isArray(base[k]) && Array.isArray(sup[k])) out[k] = base[k].filter(keep).concat(sup[k]);
}
out.errors = (base.errors || []).filter((e) => ![...walks].some((w) => String(e).startsWith(w + ':'))).concat(sup.errors || []);
out.table = base.table.map((r) => {
  const fs = out.grammar.filter((f) => f.check === r.check);
  const subs = {};
  for (const f of fs) if (f.sub) subs[f.sub] = (subs[f.sub] || 0) + 1;
  return { check: r.check, findings: fs.length, cards: new Set(fs.map((f) => f.walk + '·' + f.key)).size, subs,
    examples: fs.filter((f, i) => fs.findIndex((x) => x.ex === f.ex) === i).slice(0, 2).map((f) => f.walk + '·' + f.key + ' — ' + f.ex) };
});
out.shapes = {};
for (const c of out.cards) for (const s of c.shapes || []) out.shapes[s] = (out.shapes[s] || 0) + 1;
out.meta = { ...base.meta, cards: out.cards.length, merged: { from: supPath.replace(/.*[\\/]/, ''), walks: [...walks] } };
writeFileSync(outPath, JSON.stringify(out));
console.log('merged ' + [...walks].join(', ') + ' → ' + out.cards.length + ' cards');
for (const r of out.table) console.log('  ' + r.check.padEnd(22) + String(r.findings).padStart(5) + String(r.cards).padStart(5));
