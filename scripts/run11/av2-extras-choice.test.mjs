import {test,expect,vi,afterEach} from 'vitest';
import {ACCOUNT,fixtureToken,privateRuntime,workerAnswer} from './private-runtime.mjs';
import {createVault} from '../../apps/web/lib/vault/crypto';
import {SERVICE_UPDATE_NOTE,deleteExtrasCopies,extrasTransport,syncExtras,writeExtrasSectionChoice} from '../../apps/web/lib/vault/extras-sync';
import {privateAccountRequest} from '../../apps/web/lib/server/private-account';
import {setGoalReasons,emptyGoalExtras} from '../../apps/web/lib/goal-extras/store';

// Session AV lane 2 (sync; LEDGER #41, #134, #209; TIER 3 (sync)): this app with the journal, the money records and the
// workout log chosen, through the real chain (lib/vault/extras-sync.ts `extrasTransport` → the relay
// lib/server/private-account.ts → the Worker in Miniflare), against the Worker deployed today (the frozen copy of
// c65882f3) and the Worker of this build. Neither knows the three sections yet (that needs a Worker change, the owner's
// deploy): every answer is 200, the six sections sync as before, the chosen ones wait on the device in plain words and
// are never read or written. Fictional records only.
const FROZEN=new URL('./fixtures/private-sync-c65882f3/',import.meta.url);
const GOALS='zigoals:goal-extras:v1',JOURNAL='zigoals:journal:v1',MONEY='zigoals:money-log:v1';
afterEach(()=>{vi.unstubAllGlobals();});
function memoryStorage(){const m=new Map();return {get length(){return m.size;},key:i=>[...m.keys()][i]??null,getItem:k=>m.get(k)??null,setItem:(k,v)=>{m.set(k,String(v));},removeItem:k=>{m.delete(k);},clear:()=>m.clear(),m};}
function memoryBases(){const m=new Map();return {get:async s=>m.get(s)??null,put:async(s,b)=>{m.set(s,structuredClone(b));},clear:async()=>m.clear(),map:m};}
const states=outcomes=>Object.fromEntries(outcomes.map(o=>[o.section,o.state]));
async function chain(which,vault){
 const r=await privateRuntime(undefined,which==='deployed'?{source:FROZEN}:{});
 await r.call('/v1/sessions',{action:'register',label:'AV2 fixture'});
 expect((await r.call('/v1/vault',{protocol:1,vault:vault.manifest.vault,operation:crypto.randomUUID(),base:0,changes:[],manifest:vault.manifest})).status).toBe(200);
 const log=[],config={authOrigin:'https://test.supabase.co',publicKey:'public',syncOrigin:'https://sync.example.workers.dev'};
 const upstream=async(url,init)=>{const target=new URL(String(url));const answer=await workerAnswer(r.mf,'https://sync.test'+target.pathname+target.search,{method:init?.method??'GET',headers:new Headers(init?.headers),...(init?.body?{body:init.body}:{})});log.push({method:init?.method??'GET',path:target.pathname+target.search,section:init?.body?JSON.parse(init.body).section:null,status:answer.status});return answer;};
 const browserFetch=async(url,init)=>privateAccountRequest(new Request('https://app.test'+url,{method:init.method,headers:{...init.headers,cookie:'__Host-zigoals_session='+fixtureToken('fixture'),origin:'https://app.test'},...(init.body?{body:init.body}:{})}),config,upstream);
 const input=d=>({transport:extrasTransport(ACCOUNT,()=>{}),key:vault.key,manifest:vault.manifest,storage:d.storage,bases:d.bases,fence:()=>{}});
 return {r,log,sync:(d,health=true)=>{vi.stubGlobal('fetch',browserFetch);return syncExtras({...input(d),health});},remove:d=>{vi.stubGlobal('fetch',browserFetch);return deleteExtrasCopies(input(d));}};
}
for(const which of ['deployed','current'])test(`a Worker that does not know the chosen sections (${which}): 200 throughout, the six sync, the three wait untouched, "Remove from the cloud" works`,async()=>{
 const vault=await createVault(),app=await chain(which,vault);
 try{
  const a={storage:memoryStorage(),bases:memoryBases()},b={storage:memoryStorage(),bases:memoryBases()};
  for(const d of [a,b])for(const name of ['journal','money','workouts'])writeExtrasSectionChoice(d.storage,name,true);
  const journal=JSON.stringify({version:1,entries:[{id:'e1',date:'2026-11-20',text:'Fictional walk',createdAt:'2026-11-20T08:00:00.000Z'}],shareWithAi:false,followUps:true});
  a.storage.setItem(JOURNAL,journal);a.storage.setItem(MONEY,JSON.stringify({version:1,entries:[],weekStartsOn:'monday'}));
  a.storage.setItem(GOALS,JSON.stringify(setGoalReasons(emptyGoalExtras(),'private:1',{why:'Fictional sea'},'2026-11-20T08:00:00.000Z')));
  const first=await app.sync(a);
  expect(states(first)).toEqual({goals:'pushed',life:'unchanged',habits:'unchanged',health:'unchanged',checklist:'unchanged',nova:which==='deployed'?'skipped':'unchanged',journal:'skipped',money:'skipped',workouts:'skipped'});
  for(const name of ['journal','money','workouts'])expect(first.find(o=>o.section===name).message).toBe(SERVICE_UPDATE_NOTE(name));
  expect(states(await app.sync(b)).goals).toBe('pulled');
  expect(JSON.parse(b.storage.getItem(GOALS)).goals['private:1'].why).toBe('Fictional sea');
  expect(b.storage.getItem(JOURNAL)).toBeNull();expect(a.storage.getItem(JOURNAL)).toBe(journal);
  expect(app.log.every(entry=>entry.status===200)).toBe(true);
  expect(app.log.filter(entry=>entry.path.includes('with='))).toEqual(Array.from({length:2},()=>({method:'GET',path:'/v1/extras?with=checklist&with=nova&with=journal&with=money&with=workouts',section:null,status:200})));
  expect(app.log.filter(entry=>/journal|money|workouts/.test(entry.section??'')||/section=(journal|money|workouts)/.test(entry.path))).toEqual([]);
  app.log.length=0;await app.remove(a);
  expect(app.log.every(entry=>entry.status===200)).toBe(true);
  expect(app.log.filter(entry=>entry.method==='POST').map(entry=>entry.section)).toEqual(['goals']);
 }finally{await app.r.mf.dispose();}
},120000);
