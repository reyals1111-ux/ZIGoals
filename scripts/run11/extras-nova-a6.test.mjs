import {test,expect,vi,afterEach} from 'vitest';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {ACCOUNT,fixtureToken,privateRuntime,workerAnswer} from './private-runtime.mjs';
import {createVault} from '../../apps/web/lib/vault/crypto';
import {RevisionConflict} from '../../apps/web/lib/vault/cloud-sync';
import {SERVICE_UPDATE_NOTE,deleteExtrasCopies,extrasHeadsSchema,extrasSectionCloudSchema,extrasTransport,openSection,sealSection,sectionText,syncExtras} from '../../apps/web/lib/vault/extras-sync';
import {sectionRows} from '../../apps/web/lib/vault/section-status';
import {privateAccountRequest} from '../../apps/web/lib/server/private-account';
import {setGoalReasons,emptyGoalExtras} from '../../apps/web/lib/goal-extras/store';
const z=createRequire(new URL('../../apps/web/package.json',import.meta.url))('zod');

// Session AM (ADR-038 A6, the owner's safety condition; TIER 3 (sync)): this app, with the new `nova` extras section,
// against the private-sync Worker as it is deployed today (Alpha #54, commit c65882f3, NOT redeployed), next to the same
// scenario against the Worker of this build. The deployed Worker is a frozen copy of its tracked bytes
// (fixtures/private-sync-c65882f3/, checked against its receipt below) run in Miniflare by the same harness as the
// current one. The app side is the real chain: lib/vault/extras-sync.ts `extrasTransport` → the relay
// (lib/server/private-account.ts) → the Worker. Fictional records only.
const FROZEN=new URL('./fixtures/private-sync-c65882f3/',import.meta.url);
const GOALS='zigoals:goal-extras:v1',CALC='zigoals:calculator:v1',HABITS='zigoals:habit-extras:v1',MICRO='zigoals:micro-targets:v1',CHECKLIST='zigoals:checklist:v1',DAYS='zigoals:checklist-days:v1',NOVA='zigoals:nova:v1',STAGE='zigoals:nova-stage:v1',WORLD='zigoals:nova-world:v1';
const at='2026-11-11T08:00:00.000Z',later='2026-11-11T09:00:00.000Z';
const NOVA_NOTE='Your NOVA requests, pinned widgets and layout sync once the sync service is updated. Nothing was changed here.';
afterEach(()=>{vi.unstubAllGlobals();});

function memoryStorage(){const m=new Map();return {get length(){return m.size;},key:i=>[...m.keys()][i]??null,getItem:k=>m.get(k)??null,setItem:(k,v)=>{m.set(k,String(v));},removeItem:k=>{m.delete(k);},clear:()=>m.clear(),m};}
function memoryBases(){const m=new Map();return {get:async s=>m.get(s)??null,put:async(s,b)=>{m.set(s,structuredClone(b));},clear:async()=>m.clear(),map:m};}
const device=()=>({storage:memoryStorage(),bases:memoryBases()});
const read=(d,key)=>JSON.parse(d.storage.getItem(key)??'null');
const states=outcomes=>Object.fromEntries(outcomes.map(o=>[o.section,o.state]));
/** The vault object's own stored keys with a prefix, read from Miniflare's persisted SQLite file (no request, so no lazy step runs). */
async function storedKeys(persist,prefix){
 const dir=join(persist,'do','run11-private-sync-PrivateVault'),keys=[];
 for(const file of (await readdir(dir)).filter(f=>f.endsWith('.sqlite')&&f!=='metadata.sqlite')){const db=new DatabaseSync(join(dir,file),{readOnly:true});try{keys.push(...db.prepare('SELECT key FROM _cf_KV WHERE key LIKE ?').all(`${prefix}%`).map(row=>row.key));}finally{db.close();}}
 return keys.sort();
}
/** A private-sync runtime: the deployed Worker (frozen) or this build's, with a session registered and the vault enrolled. */
async function service(which,vault,persist){
 const r=await privateRuntime(persist,which==='deployed'?{source:FROZEN}:{});
 if(!persist){
  await r.call('/v1/sessions',{action:'register',label:'A6 fixture'});
  expect((await r.call('/v1/vault',{protocol:1,vault:vault.manifest.vault,operation:crypto.randomUUID(),base:0,changes:[],manifest:vault.manifest})).status).toBe(200);
 }
 return r;
}
/**
 * This build's app in front of a service: the browser's fetch is the relay itself, whose upstream is the Worker in
 * Miniflare. `log` is every request that reached the Worker: method, path and query, the section a write names, the
 * status it answered.
 */
function thisApp(r){
 const log=[],config={authOrigin:'https://test.supabase.co',publicKey:'public',syncOrigin:'https://sync.example.workers.dev'};
 const upstream=async(url,init)=>{
  const target=new URL(String(url));if(target.origin!==config.syncOrigin)throw Error('Only private sync is reached in this test.');
  const answer=await workerAnswer(r.mf,'https://sync.test'+target.pathname+target.search,{method:init?.method??'GET',headers:new Headers(init?.headers),...(init?.body?{body:init.body}:{})});
  log.push({method:init?.method??'GET',path:target.pathname+target.search,section:init?.body?JSON.parse(init.body).section:null,status:answer.status});
  return answer;
 };
 const browserFetch=async(url,init)=>privateAccountRequest(new Request('https://app.test'+url,{method:init.method,headers:{...init.headers,cookie:'__Host-zigoals_session='+fixtureToken('fixture'),origin:'https://app.test'},...(init.body?{body:init.body}:{})}),config,upstream);
 const sync=(vault,d,health=true)=>{vi.stubGlobal('fetch',browserFetch);return syncExtras({transport:extrasTransport(ACCOUNT,()=>{}),key:vault.key,manifest:vault.manifest,storage:d.storage,bases:d.bases,fence:()=>{},health});};
 const remove=(vault,d)=>{vi.stubGlobal('fetch',browserFetch);return deleteExtrasCopies({transport:extrasTransport(ACCOUNT,()=>{}),manifest:vault.manifest,storage:d.storage,bases:d.bases,fence:()=>{}});};
 return {log,sync,remove};
}
/** Session AK's app (Alpha #54) in front of a service, as far as the wire goes: the heads asked with `with=checklist` only. */
function sessionAkApp(r){
 const log=[];
 const call=async(path,body)=>{const res=await r.call(path,body);log.push({method:body?'POST':'GET',path,section:body?.section??null,status:res.status});return res;};
 const transport={heads:async()=>(await call('/v1/extras?with=checklist')).json(),read:async section=>(await call('/v1/extras?section='+section)).json(),
  write:async operation=>{const res=await call('/v1/extras',operation),body=await res.json();if(!res.ok){if(body.error==='REVISION_CONFLICT')throw new RevisionConflict();throw Error(body.error);}return body;}};
 const sync=(vault,d,health=true)=>syncExtras({transport,key:vault.key,manifest:vault.manifest,storage:d.storage,bases:d.bases,fence:()=>{},health});
 return {log,sync};
}
/** Two devices with records in every section, NOVA included: A is the phone, B the computer. */
function twoDevices(){
 const a=device(),b=device();
 a.storage.setItem(GOALS,JSON.stringify({...setGoalReasons(emptyGoalExtras(),'private:1',{why:'See the sea'},at),dormant:{'private:9':{why:'Old',dormantSince:'2026-10-01'}}}));
 a.storage.setItem(CALC,JSON.stringify({version:1,scenarios:[]}));
 a.storage.setItem(HABITS,JSON.stringify({version:1,areas:{h1:'fun'},folds:{morning:true}}));
 a.storage.setItem(MICRO,JSON.stringify({version:1,targets:{ironMg:15}}));
 a.storage.setItem(CHECKLIST,JSON.stringify({version:1,items:[{id:'c1',kind:'custom',label:'Fictional piano',addedAt:at}],healthItems:[{id:'c2',kind:'health',input:'water',addedAt:at}],order:['c1','c2']}));
 a.storage.setItem(DAYS,JSON.stringify({version:1,days:{'2026-11-10':{total:3,done:3,perfect:true}},today:{date:'2026-11-11',ticks:[]}}));
 // NOVA on the phone: a request asked there, a widget it made, two pinned widgets, a layout, and the phone's own persona and side bars.
 a.storage.setItem(STAGE,JSON.stringify({version:1,made:[{id:'habit-week',at}],params:{weight:{range:'month'}},asks:[{id:'a-phone-1',at,text:'Fictional: show my habits this week',widgets:['habit-week'],device:'phone',by:'device'}]}));
 a.storage.setItem(NOVA,JSON.stringify({version:1,openingSeen:true,layout:'focus',widgets:[{id:'weight',size:'M',slot:0},{id:'steps',size:'S',slot:1}],persona:{name:'Fictional Pocket',avatar:'zigi'},panels:{left:'hidden',right:'hidden'},yourName:'Fictional Phone'}));
 a.storage.setItem(WORLD,JSON.stringify({version:1,on:true}));
 // The computer: its own habit folds and its own NOVA persona, side bars and instructions.
 b.storage.setItem(HABITS,JSON.stringify({version:1,folds:{evening:true}}));
 b.storage.setItem(NOVA,JSON.stringify({version:1,persona:{name:'Fictional Desk',avatar:'orb'},panels:{left:'open',right:'open',folded:['usage']},customInstructions:'Fictional: the computer\'s own.',accent:'gold'}));
 return {a,b};
}
const NOVA_KEYS=[STAGE,NOVA,WORLD];
const snapshot=(d,keys)=>Object.fromEntries(keys.map(k=>[k,d.storage.getItem(k)]));
const FIVE=['goals','life','habits','health','checklist'];
const five=outcomes=>outcomes.filter(o=>FIVE.includes(o.section));
/** What Settings → Sync shows for the extras after these outcomes (lib/vault/section-status.ts). */
const settingsRow=outcomes=>sectionRows({online:true,busy:false,error:'',health:true,held:[],synced:{},pending:{},extras:{state:'synced',outcomes,at:'10:42'},extrasOn:true,portfolio:null,portfolioAt:'',portfolioOn:false}).find(row=>row.id==='extras');

test('the frozen Worker is the one deployed with Alpha #54, byte for byte, and predates NOVA; this build\'s Worker is a different extras handler',async()=>{
 const receipt=JSON.parse(await readFile(new URL('SOURCE.json',FROZEN),'utf8'));
 expect(receipt.source).toBe('c65882f3d4d2935783961600aa6e6ae2fd01c62b');
 expect(Object.keys(receipt.files).sort()).toEqual((await readdir(FROZEN)).filter(f=>f.endsWith('.mjs')).sort());
 expect(Object.keys(receipt.files).sort()).toEqual(['extras.mjs','lifecycle.mjs','portfolio.mjs','rotation.mjs','sessions.mjs','step-up.mjs','worker.mjs']);
 for(const [path,hash]of Object.entries(receipt.files))expect(createHash('sha256').update(await readFile(new URL(path,FROZEN))).digest('hex'),path).toBe(hash);
 const deployed=await readFile(new URL('extras.mjs',FROZEN),'utf8'),current=await readFile(new URL('../../workers/private-sync/extras.mjs',import.meta.url),'utf8');
 expect(deployed).not.toMatch(/nova/i);expect(deployed).toContain("export const EXTRAS_SECTIONS_OPTIONAL = ['checklist'];");expect(deployed).toContain("withOptional = params.get('with')");
 expect(current).toContain("export const EXTRAS_SECTIONS_OPTIONAL = ['checklist', 'nova'];");
});

test('A6: this app against the deployed Worker: the five sections sync between two devices exactly as with Session AK\'s app; NOVA stays on each device; no error, no refused request, nothing of NOVA at the service',async()=>{
 const vault=await createVault(),deployed=await service('deployed',vault),control=await service('deployed',vault);
 try{
  const app=thisApp(deployed),ak=sessionAkApp(control),now=twoDevices(),before=twoDevices();
  const novaA=snapshot(now.a,NOVA_KEYS),novaB=snapshot(now.b,NOVA_KEYS);
  // The same four syncs with this app and, on a second deployed Worker, with Session AK's request.
  const run=async(sync,{a,b})=>[await sync(vault,a),await sync(vault,b),await sync(vault,a),await sync(vault,b)];
  const mine=await run(app.sync,now),theirs=await run(ak.sync,before);
  // The five sections: the same outcomes, sync by sync.
  expect(mine.map(o=>states(five(o)))).toEqual([{goals:'pushed',life:'pushed',habits:'pushed',health:'pushed',checklist:'pushed'},{goals:'pulled',life:'pulled',habits:'pulled',health:'pulled',checklist:'pulled'},{goals:'unchanged',life:'unchanged',habits:'unchanged',health:'unchanged',checklist:'unchanged'},{goals:'unchanged',life:'unchanged',habits:'unchanged',health:'unchanged',checklist:'unchanged'}]);
  expect(mine.map(five)).toEqual(theirs.map(five));
  // NOVA: kept on the device, said in plain words, never an error; the Settings row reads as it does for a clean sync.
  for(const outcomes of mine){
   expect(outcomes.find(o=>o.section==='nova')).toEqual({section:'nova',state:'skipped',message:NOVA_NOTE});
   expect(outcomes.filter(o=>['error','unreadable','waiting','deleted'].includes(o.state))).toEqual([]);
   expect(settingsRow(outcomes)).toMatchObject({text:'Up to date · 10:42',tone:'ok',retry:null});
  }
  expect(NOVA_NOTE).toBe(SERVICE_UPDATE_NOTE('nova'));
  expect(settingsRow(mine[2])).toEqual(settingsRow(theirs[2]));
  // The devices hold the same records as with Session AK's app, key for key and byte for byte; NOVA is untouched on both.
  for(const side of ['a','b']){
   expect([...now[side].storage.m.keys()].sort()).toEqual([...before[side].storage.m.keys()].sort());
   for(const key of now[side].storage.m.keys())expect(now[side].storage.getItem(key),`${side} ${key}`).toBe(before[side].storage.getItem(key));
  }
  expect(snapshot(now.a,NOVA_KEYS)).toEqual(novaA);expect(snapshot(now.b,NOVA_KEYS)).toEqual(novaB);
  expect(now.b.storage.getItem(STAGE)).toBeNull();
  expect(read(now.b,CHECKLIST).items.map(i=>i.label)).toEqual(['Fictional piano']);expect(read(now.b,GOALS).goals['private:1'].why).toBe('See the sea');
  for(const d of [now.a,now.b])expect([...d.bases.map.keys()].sort()).toEqual(['checklist','goals','habits','health','life']);
  // The wire: this app's requests are Session AK's requests, one for one, but for the heads' second `with`. Every answer is 200.
  expect(app.log.every(entry=>entry.status===200)).toBe(true);
  expect(app.log.map(entry=>({...entry,path:entry.path==='/v1/extras?with=checklist&with=nova'?'/v1/extras?with=checklist':entry.path}))).toEqual(ak.log);
  expect(app.log.filter(entry=>entry.path.includes('with='))).toEqual(Array.from({length:4},()=>({method:'GET',path:'/v1/extras?with=checklist&with=nova',section:null,status:200})));
  expect(app.log.filter(entry=>entry.path.includes('section=nova')||entry.section==='nova')).toEqual([]);
  // The service: the other sections' heads are what Session AK's app leaves, and it holds nothing of NOVA.
  const heads=async r=>(await r.call('/v1/extras?with=checklist')).text();
  expect(await heads(deployed)).toBe(await heads(control));
  expect(JSON.parse(await heads(deployed)).sections).toEqual({goals:{revision:1,generation:0,epoch:vault.manifest.epoch,parts:1},life:{revision:1,generation:0,epoch:vault.manifest.epoch,parts:1},habits:{revision:1,generation:0,epoch:vault.manifest.epoch,parts:1},health:{revision:1,generation:0,epoch:vault.manifest.epoch,parts:1},checklist:{revision:1,generation:0,epoch:vault.manifest.epoch,parts:1}});
  expect((await storedKeys(deployed.persist,'extras')).filter(key=>!key.startsWith('extras-receipt:'))).toEqual(await (async()=>(await storedKeys(control.persist,'extras')).filter(key=>!key.startsWith('extras-receipt:')))());
  expect((await storedKeys(deployed.persist,'')).filter(key=>/nova/i.test(key))).toEqual([]);
 }finally{await deployed.mf.dispose();await control.mf.dispose();}
},120000);

test('A6: no retry storm and no loss: with NOVA changing on the device, each sync against the deployed Worker is one heads request; the other sections keep syncing; "Remove from the cloud" works',async()=>{
 const vault=await createVault(),deployed=await service('deployed',vault);
 try{
  const app=thisApp(deployed),{a,b}=twoDevices();
  await app.sync(vault,a);await app.sync(vault,b);await app.sync(vault,a);
  app.log.length=0;
  // Six syncs, a new NOVA request and a side bar folded before each: nothing is sent but the heads request, nothing fails.
  for(let i=0;i<6;i++){
   const stage=read(a,STAGE);
   a.storage.setItem(STAGE,JSON.stringify({...stage,asks:[{id:`a-phone-${i+2}`,at:later,text:`Fictional request ${i+2}`,device:'phone',by:'device'},...stage.asks]}));
   a.storage.setItem(NOVA,JSON.stringify({...read(a,NOVA),panels:{left:i%2?'open':'rail'}}));
   const outcomes=await app.sync(vault,a);
   expect(states(outcomes)).toEqual({goals:'unchanged',life:'unchanged',habits:'unchanged',health:'unchanged',checklist:'unchanged',nova:'skipped'});
  }
  expect(app.log).toEqual(Array.from({length:6},()=>({method:'GET',path:'/v1/extras?with=checklist&with=nova',section:null,status:200})));
  expect(read(a,STAGE).asks).toHaveLength(7);expect(read(a,STAGE).asks[0].id).toBe('a-phone-7');
  // The Checklist goes on travelling both ways while NOVA waits.
  const list=read(b,CHECKLIST);
  b.storage.setItem(CHECKLIST,JSON.stringify({...list,items:[...list.items,{id:'c3',kind:'custom',label:'Fictional stretch',addedAt:later}],order:[...list.order,'c3']}));
  expect(states(await app.sync(vault,b)).checklist).toBe('pushed');
  expect(states(await app.sync(vault,a)).checklist).toBe('pulled');
  expect(read(a,CHECKLIST).items.map(i=>i.label)).toEqual(['Fictional piano','Fictional stretch']);
  expect(read(a,CHECKLIST).healthItems.map(i=>i.input)).toEqual(['water']);
  // "Remove from the cloud": the five copies are deleted, NOVA is never named, the device keeps everything.
  app.log.length=0;const kept=snapshot(a,[...a.storage.m.keys()].filter(k=>k!=='zigoals:extras-sync-choice:v1'));
  await app.remove(vault,a);
  expect(app.log.every(entry=>entry.status===200)).toBe(true);
  expect(app.log.filter(entry=>entry.method==='POST').map(entry=>entry.section)).toEqual(FIVE);
  expect(snapshot(a,Object.keys(kept))).toEqual(kept);
  expect(Object.values((await (await deployed.call('/v1/extras?with=checklist')).json()).sections).map(h=>[h.generation,h.parts])).toEqual(FIVE.map(()=>[1,0]));
 }finally{await deployed.mf.dispose();}
},120000);

test('A6: why the app repeats `with`: the deployed Worker reads the first one only and refuses every other way of naming NOVA; the relay never sends those',async()=>{
 const vault=await createVault(),deployed=await service('deployed',vault);
 try{
  const text=async path=>{const res=await deployed.call(path);return {status:res.status,body:await res.text()};};
  const asAk=await text('/v1/extras?with=checklist');
  expect(asAk.status).toBe(200);expect(Object.keys(JSON.parse(asAk.body).sections)).toEqual(FIVE);
  // The form this app sends: the same answer, byte for byte.
  expect(await text('/v1/extras?with=checklist&with=nova')).toEqual(asAk);
  // Everything else would stop every section's sync on that Worker, so the app and its relay never send it.
  for(const refused of ['/v1/extras?with=checklist,nova','/v1/extras?with=nova','/v1/extras?with=nova&with=checklist','/v1/extras?section=nova'])
   expect(await text(refused),refused).toEqual({status:400,body:'{"error":"INVALID_EXTRAS_REQUEST"}'});
  const sealed=await sealSection(vault.key,vault.manifest,'nova',1,sectionText({[STAGE]:{version:1}}));
  expect(await (await deployed.call('/v1/extras',{protocol:1,action:'put',vault:vault.manifest.vault,operation:crypto.randomUUID(),section:'nova',base:0,generation:0,epoch:vault.manifest.epoch,parts:sealed})).json()).toEqual({error:'INVALID_EXTRAS_REQUEST'});
  const config={authOrigin:'https://test.supabase.co',publicKey:'public',syncOrigin:'https://sync.example.workers.dev'};
  for(const query of ['&with=checklist,nova','&with=nova','&with=nova&with=checklist']){
   const reached=vi.fn();
   expect((await privateAccountRequest(new Request('https://app.test/api/private-account?action=extras'+query,{headers:{cookie:'__Host-zigoals_session='+fixtureToken('fixture'),'x-zigoals-account':ACCOUNT}}),config,reached)).status,query).toBe(400);
   expect(reached).not.toHaveBeenCalled();
  }
 }finally{await deployed.mf.dispose();}
},60000);

test('this build\'s Worker: the same two devices; the five sections sync as before, and NOVA travels: the phone\'s request and pinned widgets appear on the computer, whose side bars and persona stay its own',async()=>{
 const vault=await createVault(),current=await service('current',vault);
 try{
  const app=thisApp(current),{a,b}=twoDevices(),ownB=read(b,NOVA);
  const first=await app.sync(vault,a),second=await app.sync(vault,b);
  expect(states(first)).toEqual({goals:'pushed',life:'pushed',habits:'pushed',health:'pushed',checklist:'pushed',nova:'pushed'});
  expect(states(second)).toEqual({goals:'pulled',life:'pulled',habits:'pulled',health:'pulled',checklist:'pulled',nova:'pulled'});
  expect([...first,...second].filter(o=>o.message)).toEqual([]);
  expect(app.log.every(entry=>entry.status===200)).toBe(true);
  // D19: the request asked on the phone, with the widget it made and where it was asked.
  expect(read(b,STAGE)).toEqual(read(a,STAGE));
  expect(read(b,STAGE).asks).toEqual([{id:'a-phone-1',at,text:'Fictional: show my habits this week',widgets:['habit-week'],device:'phone',by:'device'}]);
  // D18: the pinned widgets and the layout arrive; every other field of the computer's record is the computer's own.
  expect(read(b,NOVA)).toEqual({...ownB,layout:'focus',widgets:[{id:'weight',size:'M',slot:0},{id:'steps',size:'S',slot:1}]});
  expect(read(b,NOVA).persona).toEqual({name:'Fictional Desk',avatar:'orb'});expect(read(b,NOVA).panels).toEqual({left:'open',right:'open',folded:['usage']});
  expect(read(b,NOVA).yourName).toBeUndefined();expect(read(b,NOVA).openingSeen).toBeUndefined();
  expect(read(a,NOVA).persona).toEqual({name:'Fictional Pocket',avatar:'zigi'});expect(read(a,NOVA).accent).toBeUndefined();
  // The outside-data record never travels.
  expect(b.storage.getItem(WORLD)).toBeNull();
  // The sealed copy holds the stage record and, of NOVA's own record, the two fields; nothing else.
  const cloud=extrasSectionCloudSchema.parse(await (await current.call('/v1/extras?section=nova')).json());
  const held=JSON.parse(await openSection(vault.key,vault.manifest,cloud)).records;
  expect(Object.keys(held).sort()).toEqual([STAGE,NOVA].sort());
  expect(held[NOVA]).toEqual({layout:'focus',widgets:[{id:'weight',size:'M',slot:0},{id:'steps',size:'S',slot:1}]});
  expect(JSON.stringify(held)).not.toMatch(/Fictional Pocket|Fictional Desk|Fictional Phone|the computer's own/);
  // The computer asks and pins too; both devices settle on both.
  b.storage.setItem(STAGE,JSON.stringify({...read(b,STAGE),asks:[{id:'b-desk-1',at:later,text:'Fictional: show my net worth',widgets:['net-worth'],device:'computer',by:'device'},...read(b,STAGE).asks]}));
  b.storage.setItem(NOVA,JSON.stringify({...read(b,NOVA),widgets:[...read(b,NOVA).widgets,{id:'net-worth',size:'M',slot:2}]}));
  expect(states(await app.sync(vault,b)).nova).toBe('pushed');expect(states(await app.sync(vault,a)).nova).toBe('pulled');
  expect(read(a,STAGE).asks.map(x=>[x.id,x.device])).toEqual([['b-desk-1','computer'],['a-phone-1','phone']]);
  expect(read(a,NOVA).widgets.map(w=>w.id)).toEqual(['weight','steps','net-worth']);
  expect(read(a,NOVA).persona).toEqual({name:'Fictional Pocket',avatar:'zigi'});
  expect(states(await app.sync(vault,a))).toEqual({goals:'unchanged',life:'unchanged',habits:'unchanged',health:'unchanged',checklist:'unchanged',nova:'unchanged'});
  // A record and a field a later build writes into the section travel through this build untouched.
  const withLater={...held,'zigoals:nova-later-record:v3':{version:3,list:[1,2,3]},[NOVA]:{...read(a,NOVA),theme:'later-theme'}};
  for(const field of Object.keys(withLater[NOVA]))if(!['layout','widgets','theme'].includes(field))delete withLater[NOVA][field];
  withLater[STAGE]=read(a,STAGE);
  const head=(await (await current.call('/v1/extras?with=nova')).json()).sections.nova;
  expect((await current.call('/v1/extras',{protocol:1,action:'put',vault:vault.manifest.vault,operation:crypto.randomUUID(),section:'nova',base:head.revision,generation:head.generation,epoch:vault.manifest.epoch,parts:await sealSection(vault.key,vault.manifest,'nova',head.revision+1,sectionText(withLater))})).status).toBe(200);
  expect(states(await app.sync(vault,a)).nova).toBe('unchanged');
  // Session AM (AM-S11, deliberate): was "the phone turns on keep, the section is pushed and the sealed copy holds
  // keep:true". The stage record's three per-device choices (keep, proactive, gentle) stay on the device: turning them
  // on sends nothing to the Worker, and the sealed copy never holds them.
  const own={keep:true,proactive:true,gentle:{day:'2026-11-11',shown:['weight']}};
  a.storage.setItem(STAGE,JSON.stringify({...read(a,STAGE),...own}));
  const sentBefore=app.log.length;
  expect(states(await app.sync(vault,a)).nova).toBe('unchanged');
  expect(app.log.slice(sentBefore).filter(entry=>entry.method!=='GET'||entry.path.includes('section='))).toEqual([]);
  // Everything else of the record still travels: a widget folded into the dock is pushed, through this build, with the
  // later build's record and field untouched; the sealed copy is the phone's record without exactly those three fields.
  a.storage.setItem(STAGE,JSON.stringify({...read(a,STAGE),hidden:['steps']}));
  expect(states(await app.sync(vault,a)).nova).toBe('pushed');
  const after=JSON.parse(await openSection(vault.key,vault.manifest,extrasSectionCloudSchema.parse(await (await current.call('/v1/extras?section=nova')).json()))).records;
  expect(after['zigoals:nova-later-record:v3']).toEqual({version:3,list:[1,2,3]});expect(after[NOVA].theme).toBe('later-theme');
  const {keep,proactive,gentle,...travels}=read(a,STAGE);
  expect({keep,proactive,gentle}).toEqual(own);
  expect(Object.keys(travels).sort()).toEqual(['asks','hidden','made','params','version']);expect(travels.hidden).toEqual(['steps']);
  expect(after[STAGE]).toEqual(travels);
  for(const field of ['keep','proactive','gentle'])expect(after[STAGE],field).not.toHaveProperty(field);
  expect(a.storage.getItem('zigoals:nova-later-record:v3')).toBeNull();expect(read(a,NOVA).theme).toBeUndefined();
  // The computer gets what travels and none of the phone's three choices; the phone keeps them.
  expect(states(await app.sync(vault,b)).nova).toBe('pulled');
  expect(read(b,STAGE)).toEqual(travels);
  expect(read(a,STAGE)).toEqual({...travels,...own});
 }finally{await current.mf.dispose();}
},120000);

// The heads schema of Alpha #54's app, copied from c65882f3:apps/web/lib/vault/extras-sync.ts (strict: a section it does
// not know is a refusal there, which is why an optional section is only ever listed when asked for by name).
const akHead=z.object({revision:z.number().int().min(0),generation:z.number().int().min(0),epoch:z.number().int().min(1).nullable(),parts:z.number().int().min(0).max(16)}).strict();
const akHeadsSchema=z.object({protocol:z.literal(1),sections:z.object({goals:akHead,life:akHead,habits:akHead,health:akHead,checklist:akHead.optional()}).strict()}).strict();

test('the older app with this build\'s Worker (and an app rolled back from #55 to #54 after NOVA has synced): every request Session AK\'s app can make is answered byte for byte as the deployed Worker answers it, with NOVA held beside',async()=>{
 const vault=await createVault(),deployed=await service('deployed',vault),current=await service('current',vault);
 try{
  // A device on this build has already synced NOVA to the new Worker.
  const {a}=twoDevices();
  expect(states(await thisApp(current).sync(vault,{storage:(()=>{const s=memoryStorage();for(const k of NOVA_KEYS)s.setItem(k,a.storage.getItem(k));return s;})(),bases:memoryBases()})).nova).toBe('pushed');
  const novaHead=async()=>(await (await current.call('/v1/extras?with=nova')).json()).sections.nova;
  const held=await novaHead();expect(held).toEqual({revision:1,generation:0,epoch:vault.manifest.epoch,parts:1});
  // Session AK's requests, the same bytes to both Workers (one sealed copy, one operation id per write).
  const sealed={goals:await sealSection(vault.key,vault.manifest,'goals',1,sectionText({[GOALS]:setGoalReasons(emptyGoalExtras(),'private:1',{why:'Fictional'},at)})),checklist:await sealSection(vault.key,vault.manifest,'checklist',1,sectionText({[CHECKLIST]:{version:1,items:[],order:[]}}))};
  const put=(section,base,operation)=>({protocol:1,action:'put',vault:vault.manifest.vault,operation,section,base,generation:0,epoch:vault.manifest.epoch,parts:sealed[section]});
  const ops=Array.from({length:4},()=>crypto.randomUUID());
  const script=[['/v1/extras'],['/v1/extras?with=checklist'],['/v1/extras',put('goals',0,ops[0])],['/v1/extras',put('checklist',0,ops[1])],['/v1/extras'],['/v1/extras?with=checklist'],['/v1/extras?section=goals'],['/v1/extras?section=checklist'],['/v1/extras?section=health'],
   ['/v1/extras',put('goals',0,ops[0])],['/v1/extras',put('goals',0,ops[2])],['/v1/extras',{protocol:1,action:'delete',vault:vault.manifest.vault,operation:ops[3],section:'checklist',base:1,generation:0}],['/v1/extras?with=checklist'],['/v1/extras?section=checklist'],
   ['/v1/extras?section=nope'],['/v1/extras?with=portfolio'],['/v1/extras?with=goals'],['/v1/extras?with=Checklist'],['/v1/extras?with='],['/v1/extras',{...put('goals',1,crypto.randomUUID()),section:'vault'}]];
  const answers=async r=>{const out=[];for(const [path,body] of script){const res=await r.call(path,body);out.push({path,section:body?.section??null,status:res.status,body:await res.text()});}return out;};
  const fromDeployed=await answers(deployed),fromCurrent=await answers(current);
  expect(fromCurrent).toEqual(fromDeployed);
  expect(fromCurrent.map(x=>x.status)).toEqual([200,200,200,200,200,200,200,200,200,200,409,200,200,200,400,400,400,400,400,400]);
  // What Session AK's app reads strictly: every heads answer parses, and names no section it does not know.
  for(const answer of fromCurrent.filter(x=>x.status===200&&!x.section&&!x.path.includes('section='))){
   expect(akHeadsSchema.safeParse(JSON.parse(answer.body)).success,answer.path).toBe(true);
   expect(answer.body).not.toMatch(/nova/);
  }
  // And this build's own reader takes the same answers.
  expect(extrasHeadsSchema.safeParse(JSON.parse(fromCurrent[5].body)).success).toBe(true);
  // NOVA's copy is where it was: the older app neither saw nor moved it.
  expect(await novaHead()).toEqual(held);
  expect(await storedKeys(current.persist,'extras-part:nova:')).toEqual(['extras-part:nova:0']);
  // Session AK's sync (its request, the merge it shares with this build) on the new Worker: its five sections, no NOVA.
  const ak=sessionAkApp(current),old=device();
  old.storage.setItem(CALC,JSON.stringify({version:1,scenarios:[]}));
  const outcomes=await ak.sync(vault,old);
  expect(states(five(outcomes))).toEqual({goals:'pulled',life:'pushed',habits:'unchanged',health:'unchanged',checklist:'unchanged'});
  expect(ak.log.every(entry=>entry.status===200)).toBe(true);expect(ak.log.filter(entry=>/nova/.test(entry.path)||entry.section==='nova')).toEqual([]);
  expect(old.storage.getItem(STAGE)).toBeNull();expect(old.storage.getItem(NOVA)).toBeNull();
  expect(await novaHead()).toEqual(held);
 }finally{await deployed.mf.dispose();await current.mf.dispose();}
},120000);

test('the Worker rolled back to the deployed one and forward again, on the same stored account: NOVA waits on the devices, its sealed copy stays where it is, the other sections go on, and NOVA resumes without a refusal',async()=>{
 const vault=await createVault();
 let r=await service('current',vault);const persist=r.persist;
 try{
  const {a,b}=twoDevices();
  let app=thisApp(r);
  await app.sync(vault,a);await app.sync(vault,b);await app.sync(vault,a);
  expect(read(b,STAGE).asks.map(x=>x.id)).toEqual(['a-phone-1']);
  const partsBefore=await storedKeys(persist,'extras-part:nova:');expect(partsBefore).toEqual(['extras-part:nova:0']);
  // Rolled back: the Worker as deployed today, on the same storage.
  await r.mf.dispose();r=await service('deployed',vault,persist);app=thisApp(r);
  a.storage.setItem(STAGE,JSON.stringify({...read(a,STAGE),asks:[{id:'a-phone-2',at:later,text:'Fictional: asked while rolled back',device:'phone',by:'device'},...read(a,STAGE).asks]}));
  const list=read(a,CHECKLIST);a.storage.setItem(CHECKLIST,JSON.stringify({...list,items:[...list.items,{id:'c4',kind:'custom',label:'Fictional walk',addedAt:later}],order:[...list.order,'c4']}));
  const back=await app.sync(vault,a);
  expect(states(back)).toEqual({goals:'unchanged',life:'unchanged',habits:'unchanged',health:'unchanged',checklist:'pushed',nova:'skipped'});
  expect(back.find(o=>o.section==='nova').message).toBe(NOVA_NOTE);
  expect(states(await app.sync(vault,b))).toEqual({goals:'unchanged',life:'unchanged',habits:'unchanged',health:'unchanged',checklist:'pulled',nova:'skipped'});
  expect(app.log.every(entry=>entry.status===200)).toBe(true);
  expect(read(b,CHECKLIST).items.map(i=>i.label)).toEqual(['Fictional piano','Fictional walk']);
  // Nothing of NOVA was lost on either device, and the sealed copy the newer Worker stored is still there.
  expect(read(a,STAGE).asks.map(x=>x.id)).toEqual(['a-phone-2','a-phone-1']);expect(read(b,STAGE).asks.map(x=>x.id)).toEqual(['a-phone-1']);
  expect(read(b,NOVA).widgets.map(w=>w.id)).toEqual(['weight','steps']);
  expect(await storedKeys(persist,'extras-part:nova:')).toEqual(partsBefore);
  // Forward again: what waited on the phone reaches the computer; nothing is refused as an older copy.
  await r.mf.dispose();r=await service('current',vault,persist);app=thisApp(r);
  expect(states(await app.sync(vault,a))).toEqual({goals:'unchanged',life:'unchanged',habits:'unchanged',health:'unchanged',checklist:'unchanged',nova:'pushed'});
  expect(states(await app.sync(vault,b))).toEqual({goals:'unchanged',life:'unchanged',habits:'unchanged',health:'unchanged',checklist:'unchanged',nova:'pulled'});
  expect(read(b,STAGE).asks.map(x=>x.id)).toEqual(['a-phone-2','a-phone-1']);
  expect(app.log.every(entry=>entry.status===200)).toBe(true);
 }finally{await r.mf.dispose();}
},180000);
