import { spawn, execSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ADAPTERS } from '../src/config.mjs';
const here = dirname(fileURLToPath(import.meta.url));
const EPS = [
  ['point_read', '/posts/50000'],
  ['range_scan', '/posts?limit=20&before=60000'],
  ['deep_fetch', '/posts/50000/thread'],
  ['aggregation', '/authors/1000/summary'],
];
function health(base, tries=100){return new Promise((res,rej)=>{const t=async()=>{try{const r=await fetch(`${base}/health`);if(r.ok)return res();}catch{}if(--tries<=0)return rej(new Error('health timeout'));setTimeout(t,100);};t();});}
const typeOf=(v)=>v===null?'null':Array.isArray(v)?'array':typeof v;
const shape=(o)=>{ if(Array.isArray(o)) return {array:o.length, item:o[0]?shape(o[0]):null};
  if(o&&typeof o==='object') return Object.fromEntries(Object.entries(o).map(([k,v])=>[k, (v&&typeof v==='object')?shape(v):typeOf(v)]));
  return typeOf(o); };
const out=[]; let port=3910;
for (const engine of ['postgres','mysql']) for (const adapter of Object.keys(ADAPTERS)) {
  if(!ADAPTERS[adapter].engines.includes(engine)) continue;
  const p=port++; const base=`http://127.0.0.1:${p}`;
  if(adapter==='prisma') execSync(`npx prisma generate --schema=prisma/schema.${engine}.prisma`,{stdio:'ignore'});
  const child=spawn(process.execPath,[join(here,'..','src','server.mjs')],{env:{...process.env,ADAPTER:adapter,ENGINE:engine,PORT:String(p)},stdio:['ignore','ignore','ignore']});
  try{ await health(base);
    for(const [ep,path] of EPS){
      const r=await fetch(base+path); const body=await r.text();
      let parsed=null; try{parsed=JSON.parse(body);}catch{}
      out.push({adapter,engine,ep,status:r.status,bytes:Buffer.byteLength(body),shape:parsed?shape(parsed):'UNPARSEABLE'});
    }
  }catch(e){ out.push({adapter,engine,ep:'ALL',error:e.message}); }
  finally{ child.kill('SIGTERM'); await new Promise(r=>setTimeout(r,300)); }
}
await writeFile(join(here,'..','results','response-probe.json'), JSON.stringify(out,null,2));
// summarize vs native reference
for(const engine of ['postgres','mysql']){
  const nat=engine==='postgres'?'pg':'mysql2';
  console.log(`\n===== ${engine} (ref: ${nat}) =====`);
  for(const [ep] of EPS){
    const ref=out.find(x=>x.adapter===nat&&x.engine===engine&&x.ep===ep);
    const line=[`${ep}: ref ${ref.bytes}B`];
    for(const a of Object.keys(ADAPTERS)){
      if(a===nat||!ADAPTERS[a].engines.includes(engine))continue;
      const c=out.find(x=>x.adapter===a&&x.engine===engine&&x.ep===ep);
      if(!c){line.push(`${a}:MISSING`);continue;}
      const d=c.bytes-ref.bytes;
      const shapeSame=JSON.stringify(c.shape)===JSON.stringify(ref.shape);
      line.push(`${a}:${d>=0?'+':''}${d}B${shapeSame?'':'*'}`);
    }
    console.log('  '+line.join('  '));
  }
}
console.log('\n(* = field-set or type differences vs native; details in response-probe.json)');
