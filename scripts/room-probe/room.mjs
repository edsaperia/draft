const BASE='http://localhost:8140';
export const jars={};
export async function ladder(seed,to='session'){ const r=await fetch(BASE+'/api/dev/ladder',{method:'POST',headers:{'content-type':'application/json',origin:BASE},body:JSON.stringify({to,seed})}); return r.json(); }
export async function seat(slug,m){ const r=await fetch(BASE+'/api/dev/seat',{method:'POST',headers:{'content-type':'application/json',origin:BASE},body:JSON.stringify({slug,member:m})}); if(!r.ok){console.log('seat',m,await r.text());return;} jars[m]=r.headers.get('set-cookie').split(';')[0]; }
export async function view(slug,m){ const r=await fetch(`${BASE}/api/d/${slug}/view`,{headers:{cookie:jars[m]}}); return r.json(); }
export async function cmd(slug,m,cmd,args={}){ const r=await fetch(`${BASE}/api/d/${slug}/cmd`,{method:'POST',headers:{'content-type':'application/json',cookie:jars[m],origin:BASE},body:JSON.stringify({cmd,args})}); const j=await r.json().catch(()=>({})); if(!r.ok) console.log('ERR',m,cmd,JSON.stringify(j)); return j.result??j; }
