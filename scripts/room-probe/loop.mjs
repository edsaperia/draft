// Plays a whole room over HTTP against a dev server (npm run server):
// builds a ladder document at 'session', has m-3 propose one amendment,
// then has every other seat clear its cards and vote for it.
// usage: node loop.mjs [seed]
import {ladder,seat,view,cmd} from './room.mjs';
const seed=Number(process.argv[2]||11);
const lad=await ladder(seed); const S=lad.slug; console.log('doc',S);
const members=lad.seats.map(s=>s.id);
for(const m of members) await seat(S,m);
const author='m-3';
let v=await view(S,author);
const lines=v.text.split('\n');
const contested=new Set(v.clauses.flatMap(c=>c.contested.map(x=>x.start)));
let li=lines.findIndex((l,i)=>i>0 && !l.startsWith('#') && !contested.has(i) && l.length>20);
const p=await cmd(S,author,'propose-text',{baseVersion:v.textVersion,hunks:[{start:li,end:li+1,lines:['PROBE: '+lines[li]]}],why:'probe amendment'});
const cid=p.id; console.log('proposed',cid);
const state=async()=>{ const x=await view(S,author); const mine=x.mine.find(c=>c.id===cid); const rec=x.records.find(r=>r.candidateId===cid||r.field?.some(f=>f.candidateId===cid)); const cl=x.clauses.find(c=>c.candidates?.some(k=>k.id===cid)); return {v:x.textVersion, mine:mine?.state, judges:cl?.judges, closeness:cl?.closeness, rec:rec?.outcome, adopted:x.text.includes('PROBE:')}; };
let votesFor=0, otherJudgments=0;
for(const m of members){ if(m===author) continue;
  let found=false;
  for(let k=0;k<8;k++){
    const x=await view(S,m);
    const card=x.raceCards.find(c=>c.a.id===cid||c.b.id===cid);
    if(card){ await cmd(S,m,'judge-race',{a:card.a.id,b:card.b.id,outcome:card.a.id===cid?'a':'b'}); votesFor++; found=true; break; }
    if(!x.raceCards.length){ break; }
    // clear a card: prefer the incumbent so the text doesn't change under us
    const c=x.raceCards[0]; const inc=c.a.incumbent?'a':c.b.incumbent?'b':'tie';
    await cmd(S,m,'judge-race',{a:c.a.id,b:c.b.id,outcome:inc}); otherJudgments++;
  }
  const st=await state();
  console.log(`${m}: ${found?'voted for probe':'NEVER SAW probe card'} | cleared ${otherJudgments} so far | votes ${votesFor} ->`, JSON.stringify(st));
  if(st.adopted||st.rec) break;
}
const f=await view(S,'founder');
console.log('founder crownTasks', JSON.stringify(f.view.crownTasks).slice(0,400));
console.log('final', JSON.stringify(await state()));
{
const x=await view(S,author);
const cl=x.clauses.find(c=>c.candidates?.some(k=>k.id===cid));
console.log('CLAUSE', JSON.stringify(cl));
console.log('walletInfo', JSON.stringify(x.walletInfo), 'floor', x.floor, 'electorate', x.electorateSize);
console.log('settings snippet', JSON.stringify(x.view.settings).slice(0,1500));
}
console.log('waiting 70s for the minute tick…');
await new Promise(r=>setTimeout(r,70000));
console.log('after wait', JSON.stringify(await state()));
{ const f=await view(S,'founder'); console.log('founder crownTasks', JSON.stringify(f.view.crownTasks).slice(0,400)); }
