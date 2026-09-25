// checks-table.mjs — today's page against the prototype, per grammar check, at both widths
// (Q1541 stage 5). Reads data/grammar-{today,proto}-{1600,390}.json and prints a markdown table
// plus examples, which is what checks.md is written from.
//   node design/proposal/tools/checks-table.mjs [--examples=3]
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const DATA = join(resolve(fileURLToPath(new URL('..', import.meta.url))), 'data');
const N = +((process.argv.find((a) => a.startsWith('--examples=')) || '=3').split('=')[1]);
const load = (l, w) => JSON.parse(readFileSync(join(DATA, 'grammar-' + l + '-' + w + '.json'), 'utf8'));
const P = { t16: load('today', 1600), t39: load('today', 390), p16: load('proto', 1600), p39: load('proto', 390) };
const row = (j, c) => (j.table.find((r) => r.check === c) || { findings: 0, cards: 0 });
const checks = P.t16.table.map((r) => r.check);
console.log('| check | today 1600 | proto 1600 | today 390 | proto 390 |');
console.log('|---|---|---|---|---|');
const cell = (r) => r.findings + ' (' + r.cards + ' cards)';
for (const c of checks) console.log('| ' + c + ' | ' + cell(row(P.t16, c)) + ' | ' + cell(row(P.p16, c)) + ' | ' + cell(row(P.t39, c)) + ' | ' + cell(row(P.p39, c)) + ' |');
console.log('\ncards measured: today ' + P.t16.meta.cards + ' / ' + P.t39.meta.cards + ', proto ' + P.p16.meta.cards + ' / ' + P.p39.meta.cards);
console.log('row shapes: today ' + JSON.stringify(P.t16.shapes) + ' · proto ' + JSON.stringify(P.p16.shapes));
console.log('errors: today ' + JSON.stringify(P.t16.errors || []).slice(0, 400) + '\n        proto ' + JSON.stringify(P.p16.errors || []).slice(0, 600));
for (const c of checks) {
  for (const [lab, j] of [['proto 1600', P.p16], ['proto 390', P.p39]]) {
    const g = j.grammar.filter((x) => x.check === c);
    if (!g.length) continue;
    const subs = {};
    g.forEach((x) => { subs[x.sub || '-'] = (subs[x.sub || '-'] || 0) + 1; });
    console.log('\n### ' + c + ' — ' + lab + ' ' + JSON.stringify(subs));
    const seen = new Set();
    for (const x of g) {
      const k = (x.sub || '') + x.ex.replace(/[-\d.]+px/g, '');
      if (seen.has(k)) continue; seen.add(k);
      console.log('- ' + x.walk + '·' + x.key + ' — ' + x.ex);
      if (seen.size >= N) break;
    }
  }
}
