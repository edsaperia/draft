// The nh2026 convention's refused proposals, read against the document's own text (Q1491, Q1477; 2026-09-21).
// Rebuilds every version of the text from data/nh2026/engine.jsonl and tests each propose-text refusal in
// data/nh2026/errors.jsonl against the wording it claimed to replace. Both files are gitignored copies taken
// off the docs.vote host (docs/OPERATING.md §11); the script asserts nothing and changes nothing.
// A candidate's patch is its latest of submitted, rebased or confirmed; a !! line means the rebuild has drifted.
import fs from 'fs';
const ev = fs.readFileSync('data/nh2026/engine.jsonl','utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l).event);
const errs = fs.readFileSync('data/nh2026/errors.jsonl','utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l)).filter(r=>r.slug==='nh2026'&&r.cmd==='propose-text');
const apply=(lines,patch)=>{const out=lines.slice();for(const h of [...patch.hunks].sort((a,b)=>b.start-a.start||b.end-a.end))out.splice(h.start,h.end-h.start,...h.lines);return out};
const texts=[];const patches=new Map();let lines=null,ver=0;const verAt=[];// verAt: [t, version]
for(const e of ev){
  if(e.type==='opened'){lines=e.text.split('\n');texts[0]=lines;verAt.push([e.t,0]);}
  if(e.type==='candidate-submitted'||e.type==='candidate-rebased'||e.type==='candidate-confirmed')patches.set(e.id,e.patch);
  if(e.type==='adopted'){const p=patches.get(e.candidateId);if(p.baseVersion!==ver)console.log('!! base',p.baseVersion,'ver',ver,e.candidateId);lines=apply(lines,p);ver=e.newVersion;texts[ver]=lines;verAt.push([e.t,ver]);}
}
console.log('versions',ver,'| lines at v0',texts[0].length,'| CR-ending lines at v0:',texts[0].filter(l=>l.endsWith('\r')).length,'| at last:',texts[ver].filter(l=>l.endsWith('\r')).length,'of',texts[ver].length);
const norm=s=>s.replace(/\r$/,'');const BS=String.fromCharCode(92);const unesc=s=>{let o="";const n=norm(s);for(let i=0;i<n.length;i++){if(n[i]===BS&&".#*_-[]()>".includes(n[i+1]||""))continue;o+=n[i]}return o.trim()};
const t2=t=>new Date(t).toLocaleTimeString('en-GB',{timeZone:'Europe/London'});
for(const r of errs){
  if(!/not what/.test(r.reason))continue;
  const a=JSON.parse(r.args);const live=[...verAt].reverse().find(([t])=>t<=r.at)[1];
  for(const h of a.hunks){ if(!h.was)continue;
    const base=texts[a.baseVersion];const got=base.slice(h.start,h.end);
    let verdict;
    if(got.length===h.was.length&&got.every((g,i)=>g===h.was[i]))verdict='IDENTICAL?!';
    else if(got.length===h.was.length&&got.every((g,i)=>norm(g)===norm(h.was[i])))verdict='same line, differs only by trailing CR';
    else if(got.length===h.was.length&&got.every((g,i)=>unesc(g)===unesc(h.was[i])))verdict='same line, differs by markdown escape/space';
    else{ // search elsewhere
      const at=[];for(let i=0;i+h.was.length<=base.length;i++)if(h.was.every((w,k)=>unesc(w)===unesc(base[i+k])))at.push(i);
      const exact=at.filter(i=>h.was.every((w,k)=>w===base[i+k]));
      verdict=at.length?`MISAIMED: wording is at line ${at.map(i=>i+1).join(',')} (offset ${at.map(i=>i-h.start).join(',')})${exact.length?' exact':' modulo CR/escape'}`:'wording not in the text at that version';
      if(!at.length){for(let v=texts.length-1;v>=0;v--){const b=texts[v];let f=-1;for(let i=0;i+h.was.length<=b.length;i++)if(h.was.every((w,k)=>unesc(w)===unesc(b[i+k]))){f=i;break}if(f>=0){verdict+=` — last stood at v${v} line ${f+1}`;break}}}
    }
    console.log(t2(r.at),r.seat,'base v'+a.baseVersion,'(live v'+live+')','['+(h.start+1)+'–'+h.end+']',verdict);
    if(/CR|escape/.test(verdict)&&!/MISAIMED/.test(verdict))console.log('     engine:',JSON.stringify(got[0]).slice(0,60),'…',JSON.stringify(got[0]).slice(-12),'\n     page  :',JSON.stringify(h.was[0]).slice(0,60),'…',JSON.stringify(h.was[0]).slice(-12));
  }
}
console.log('\n--- late refusals: does stripping CR from the engine text reproduce the refusal?');
let all=0,rep=0,crIn=0;
for(const r of errs){if(!/not what/.test(r.reason))continue;const a=JSON.parse(r.args);if(a.baseVersion===0)continue;all++;
 const stripped=texts[a.baseVersion].map(norm);const h=a.hunks[0];
 if(h.was.some(w=>w.endsWith('\r')))crIn++;
 if(h.was.some((w,k)=>w!==stripped[h.start+k])&&h.was.every((w,k)=>norm(w)===stripped[h.start+k]))rep++;}
console.log('late refusals',all,'| claimed wording ends in CR:',crIn,'| refusal reproduced by CR-stripping alone:',rep);
console.log('\n--- when did CR lines enter the text?');
let prev=0;for(let v=0;v<texts.length;v++){const n=texts[v]?texts[v].filter(l=>l.endsWith('\r')).length:prev;if(n!==prev){const e=ev.find(x=>x.type==='adopted'&&x.newVersion===v);const sub=ev.find(x=>x.type==='candidate-submitted'&&x.id===e.candidateId);console.log('v'+v,t2(e.t),e.candidateId,'by',sub.author,'CR lines',prev,'→',n);prev=n}}
console.log('\n--- early refusals: what stood above line 5 at 11:09?');
const t0=errs.find(r=>/not what/.test(r.reason)).at;
for(const e of ev){if(e.t>t0+70000)break;if(e.type==='candidate-submitted')console.log(t2(e.t),e.id,e.author,'base v'+e.patch.baseVersion,JSON.stringify(e.patch.hunks.map(h=>[h.start,h.end,h.lines.length])));if(e.type==='adopted'||e.type==='candidate-withdrawn')console.log(t2(e.t),e.type,e.candidateId||e.id)}
console.log('v0 lines 1–6:');texts[0].slice(0,6).forEach((l,i)=>console.log(' ',i+1,JSON.stringify(l.slice(0,70))));
