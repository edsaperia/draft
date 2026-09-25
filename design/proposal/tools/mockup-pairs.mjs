/**
 * mockup-pairs.mjs — Q1541 stage 4: choose the current/proposed pairs for
 * mockups.html and copy the proposed crops into shots/proposed/.
 *
 *   node design/proposal/tools/mockup-pairs.mjs
 *
 * Reads inventory.json (today's shots, stage 1) and the prototype's payloads
 * from `grammar-audit.mjs --label=pshot --shots` at 1600 and 390
 * (data/grammar-pshot-<w>.json, crops in data/shots-pshot-<w>/). For every
 * card kind it picks the commonest fixture state and the worst ones (the
 * tallest card, and the closed page where the kind has one); a proposed crop
 * is copied to shots/proposed/<key>-<walk>-<w>.png — the name the current
 * crop has, or would have had without stage 1's de-duplication. Writes
 * data/mockup-pairs.json for write-mockups.mjs.
 */
import { readFile, writeFile, copyFile, mkdir, readdir, stat, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const P = join(resolve(fileURLToPath(new URL('../../..', import.meta.url))), 'design', 'proposal');
const inv = JSON.parse(await readFile(join(P, 'inventory.json'), 'utf8'));
const proto = {};
for (const w of [1600, 390]) {
  try { proto[w] = JSON.parse(await readFile(join(P, 'data', 'grammar-pshot-' + w + '.json'), 'utf8')); }
  catch { proto[w] = { cards: [] }; console.log('no prototype payload at ' + w + ' (yet)'); }
}
const safe = (s) => String(s).replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);
const FIXTURE = new Set(['audit', 'deleg', 'band']);

const recOf = (key, walk, w) => inv.records.find((r) => r.key === key && r.walk === walk && r.width === w);
const protoOf = (key, walk, w) => proto[w].cards.find((c) => c.key === key && c.walk === walk);
const curShot = (r) => r && (r.shot || r.shotOf) || null;

await mkdir(join(P, 'shots', 'proposed'), { recursive: true });
const used = new Set();

async function proposed(key, walk, w) {
  const m = protoOf(key, walk, w);
  if (!m || !m.shot) return null;
  const name = safe(key) + '-' + safe(walk) + '-' + w + '.png';
  await copyFile(join(P, 'data', 'shots-pshot-' + w, m.shot), join(P, 'shots', 'proposed', name));
  used.add(name);
  return name;
}

async function pair(key, walk, why) {
  const r16 = recOf(key, walk, 1600), r39 = recOf(key, walk, 390);
  const r = r16 || r39;
  return {
    key, walk, why, kind: r && r.kind, family: r && r.family, row: r && r.surfaceRow, state: r && r.state,
    rules: r && r.rules,
    cur: { 1600: curShot(r16), 390: curShot(r39) },
    pro: { 1600: await proposed(key, walk, 1600), 390: await proposed(key, walk, 390) },
    h: { cur: r16 && r16.card && Math.round(r16.card.r[3]), pro: (protoOf(key, walk, 1600) || {}).card && Math.round(protoOf(key, walk, 1600).card.r[3]) },
  };
}

/** a kind's representative key, where the first found would be a poor one */
const PREFER = { setting: 'rate', birth: 'title', identity: 'myname', grant: 'grant-voice', gate: 'canpropose',
  news: 'chamber', quick: 'quick-keys', power: 'pw:u:title', 'sealed-record': 'race-claims' };
/** the §6 worked cards, in grammar.md's order (fixture stand-ins where §6's state is live-only) */
const LEAD = [
  ['6.1', 'title', 'settled'],
  ['6.2', 'quick-keys', 'charter'],
  ['6.3', 'race-claims', 'charter'],
  ['6.4', 'mo:mo-4', 'seat:1'],
  ['6.5', 'invite', 'seat:1'],
];

const out = { lead: [], kinds: [], zones: [] };
for (const [sec, key, walk] of LEAD) out.lead.push({ sec, ...(await pair(key, walk, 'worked card')) });

for (const k of inv.kinds) {
  const recs = inv.records.filter((r) => r.kind === k.kind && r.width === 1600 && FIXTURE.has(r.source));
  const entry = { kind: k.kind, row: k.row, family: k.family, reached: k.reached, liveOnly: false, pairs: [] };
  if (!recs.length) {
    entry.liveOnly = k.reached;
    const live = inv.records.find((r) => r.kind === k.kind && r.width === 1600);
    if (live) entry.current = { 1600: curShot(live), 390: curShot(recOf(live.key, live.walk, 390)), state: live.state };
    out.kinds.push(entry); continue;
  }
  const byWalk = {};
  for (const r of recs) (byWalk[r.walk] ||= []).push(r);
  // stage 1 shot one card per kind × state and pointed the rest at it (`shotOf`),
  // so a pair is only honest on a card that owns its crop at both widths
  const owns = (r) => !!r.shot && !r.shotOf && (() => { const n = recOf(r.key, r.walk, 390); return !n || (!!n.shot && !n.shotOf); })();
  // the commonest state a member meets: the closed page only where the kind has nothing else
  const live = Object.entries(byWalk).filter(([w, rs]) => !/closed/.test(w) && rs.some(owns));
  const common = (live.length ? live : Object.entries(byWalk)).sort((a, b) => b[1].length - a[1].length)[0][0];
  const pick = (walk) => { const rs = byWalk[walk]; return (rs.find((r) => r.key === PREFER[k.kind] && owns(r)) || rs.find(owns) || { key: null }).key; };
  const chosen = [[pick(common), common, 'commonest']];
  const tall = [...recs].filter(owns).sort((a, b) => (b.card ? b.card.r[3] : 0) - (a.card ? a.card.r[3] : 0))[0];
  if (tall && !(tall.walk === common && tall.key === chosen[0][0])) chosen.push([tall.key, tall.walk, 'worst: the tallest']);
  if (byWalk.settled && !chosen.some(([, w]) => w === 'settled') && byWalk.settled.some(owns))
    chosen.push([pick('settled'), 'settled', 'also common: the settled document (the Founder, after ⏩)']);
  if (byWalk.founding && !chosen.some(([, w]) => w === 'founding') && byWalk.founding.some(owns))
    chosen.push([pick('founding'), 'founding', 'worst: empty (the founding, unanswered)']);
  const closedWalk = ['closed', 'closedband'].find((w) => byWalk[w]);
  if (closedWalk && !chosen.some(([, w]) => w === closedWalk)) chosen.push([pick(closedWalk), closedWalk, 'worst: the closed page']);
  for (const [key, walk, why] of chosen) if (key) entry.pairs.push(await pair(key, walk, why));
  out.kinds.push(entry);
}

// zones: current names from inventory, proposed from zone-shots-proto (same names)
const have = new Set(await readdir(join(P, 'shots', 'proposed')));
for (const z of inv.zones) {
  if (!z.shot) continue;
  out.zones.push({ zone: z.zone, state: z.state, width: z.width, cur: z.shot, pro: have.has(z.shot) ? z.shot : null, note: z.note || '' });
}
await writeFile(join(P, 'data', 'mockup-pairs.json'), JSON.stringify(out, null, 1));

// prune proposed crops no pair uses (zone crops are pruned by write-mockups, which knows which zones it shows)
let n = 0, bytes = 0;
for (const f of await readdir(join(P, 'shots', 'proposed'))) { n++; bytes += (await stat(join(P, 'shots', 'proposed', f))).size; }
console.log('lead ' + out.lead.length + ' · kinds ' + out.kinds.length + ' · card pairs ' + out.kinds.reduce((s, k) => s + k.pairs.length, 0) +
  ' · zones ' + out.zones.length + ' · proposed files ' + n + ', ' + (bytes / 1048576).toFixed(1) + ' MB');
for (const k of out.kinds) for (const p of k.pairs) if (!p.pro[1600] || !p.pro[390] || !p.cur[1600] || !p.cur[390])
  console.log('  gap: ' + k.kind + ' ' + p.key + '|' + p.walk + ' cur ' + !!p.cur[1600] + '/' + !!p.cur[390] + ' pro ' + !!p.pro[1600] + '/' + !!p.pro[390]);
void unlink;
