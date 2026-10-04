import {test,expect} from 'vitest';
import {createRequire} from 'node:module';
import {createHmac} from 'node:crypto';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const require=createRequire(new URL('../../apps/web/node_modules/wrangler/package.json',import.meta.url));
const {build}=require('esbuild'),{Miniflare,convertV4MiniflareOptions}=require('miniflare');

// Session S Part 4 (FIX_PLAN C7, Q-PRIV-03): admission records are removed by an alarm sweep once they expire, even in a
// shard that is never used again, and an expired failed-code record is removed when it is read. The real Worker runs in
// Miniflare with SQLite storage; the fixture clock moves by restarting on the same storage, and the alarm spacing is
// shortened only under the fixture flag. A test-only wrapper adds one route that lists a shard's rows.
const KEY='fixture-secret-00000000000000000000';
const code=(await build({stdin:{contents:"import worker,{AdmissionService,AdmissionAuthority as Base} from './worker.mjs';export default worker;export {AdmissionService};export class AdmissionAuthority extends Base{async fetch(request){if(new URL(request.url).pathname==='/test/rows')return Response.json(Object.fromEntries(await this.state.storage.list()));return super.fetch(request);}}",resolveDir:new URL('../../workers/auth-abuse/',import.meta.url).pathname,loader:'js'},bundle:true,write:false,format:'esm',platform:'browser',external:['cloudflare:workers']})).outputFiles[0].text;
const shard=(dimension,value)=>`auth-admission-v2:${dimension}:${parseInt(createHmac('sha256',KEY).update(value).digest('hex').slice(0,4),16)%32}`;
async function admission(){
 const persist=await mkdtemp(join(tmpdir(),'run11-admission-retention-'));let mf;
 const start=time=>{mf=new Miniflare({...convertV4MiniflareOptions({workers:[{name:'app',modules:true,script:'export default {fetch(r,e){return e.GATE.fetch(r)}}',serviceBindings:{GATE:{name:'gate',entrypoint:'AdmissionService'}}},{name:'gate',modules:true,script:code,compatibilityDate:'2026-09-13',durableObjects:{ADMISSION:{className:'AdmissionAuthority',useSQLite:true}},bindings:{AUTH_ADMISSION_KEY:KEY,ISOLATED_FIXTURE:'true',LOCAL_TEST_NOW:String(time),LOCAL_SWEEP_MS:'150'}}]}),resourcePersistencePath:persist});};
 const call=(action,email,ip='192.0.2.1')=>mf.dispatchFetch('https://gate.test/',{method:'POST',body:JSON.stringify({action,email,ip})}).then(async r=>{await r.text();return r.status;});
 const rows=async name=>{const ns=await mf.getDurableObjectNamespace('ADMISSION','gate');return (await ns.get(ns.idFromName(name)).fetch('https://internal/test/rows')).json();};
 const records=async names=>{const all=[];for(const name of names)all.push(...Object.keys(await rows(name)).filter(key=>/^[rxf]:/.test(key)));return all;};
 return {restart:async time=>{await mf?.dispose();start(time);},call,rows,records,close:()=>mf?.dispose()};
}
const until=async(check,ms=5000)=>{for(const end=Date.now()+ms;;){if(await check())return;if(Date.now()>end)throw Error('condition not reached');await new Promise(r=>setTimeout(r,100));}};

test('expired admission records are swept from shards that are never used again',async()=>{
 const a=await admission(),T0=Date.UTC(2026,9,4,9),email='retention@example.invalid';
 const names=[shard('email','email:'+email),shard('ip','ip:192.0.2.1')];
 try{
  await a.restart(T0);
  expect(await a.call('send',email)).toBe(200);expect(await a.call('verify',email)).toBe(200);expect(await a.call('verify-failed',email)).toBe(200);
  const before=await a.records(names);expect(before.filter(k=>k.startsWith('r:')).length).toBeGreaterThanOrEqual(4);expect(before.some(k=>k.startsWith('f:'))).toBe(true);
  // Not expired yet: the sweep keeps everything.
  await new Promise(r=>setTimeout(r,600));expect((await a.records(names)).sort()).toEqual(before.sort());
  // A day and an hour later nothing is sent again; the pending alarms still empty both shards.
  await a.restart(T0+25*3600000);
  await until(async()=>(await a.records(names)).length===0);
  for(const name of names)expect((await a.rows(name)).count).toBe(0);
 }finally{await a.close();}
},30000);

test('an expired failed-code record is removed when it is read',async()=>{
 const a=await admission(),T0=Date.UTC(2026,9,4,9),email='expired-read@example.invalid',name=shard('email','email:'+email);
 try{
  await a.restart(T0);expect(await a.call('verify-failed',email)).toBe(200);
  expect(Object.keys(await a.rows(name)).some(k=>k.startsWith('f:'))).toBe(true);
  // After the day, a verification reads the record, finds it expired and deletes it with the same transaction.
  await a.restart(T0+86400000+1000);expect(await a.call('verify',email,'198.51.100.9')).toBe(200);
  const after=await a.rows(name);expect(Object.keys(after).some(k=>k.startsWith('f:'))).toBe(false);
 }finally{await a.close();}
},30000);
