import {test,expect} from 'vitest';
import {privateRuntime} from './private-runtime.mjs';
import {createVault} from '../../apps/web/lib/vault/crypto';
import {ExtrasChangedDuringSync,deleteExtrasCopies,readExtrasChoice,sealSection,sectionText,syncExtras} from '../../apps/web/lib/vault/extras-sync';
import {setGoalCardArt,setGoalReasons,emptyGoalExtras} from '../../apps/web/lib/goal-extras/store';

// Session AB-Cloud Part 2 ([TIER 3] (sync), ADR-023 C1–C5, C11): two devices on one account against the real
// private-sync Worker in Miniflare, through the extras sync the Settings provider runs. Fictional records only.
const GOALS='zigoals:goal-extras:v1',AVG='zigoals:average-goals:v1',CALC='zigoals:calculator:v1',HABITS='zigoals:habit-extras:v1',MICRO='zigoals:micro-targets:v1',COACH='zigoals:health-coach:v1';
const at='2026-10-13T08:00:00.000Z',later='2026-10-13T09:00:00.000Z';
function memoryStorage(){const m=new Map();return {get length(){return m.size;},key:i=>[...m.keys()][i]??null,getItem:k=>m.get(k)??null,setItem:(k,v)=>{m.set(k,String(v));},removeItem:k=>{m.delete(k);},clear:()=>m.clear()};}
function memoryBases(){const m=new Map();return {get:async s=>m.get(s)??null,put:async(s,b)=>{m.set(s,structuredClone(b));},clear:async()=>m.clear(),map:m};}
async function setup(){
 const r=await privateRuntime();
 await r.call('/v1/sessions',{action:'register',label:'Two devices'});
 const vault=await createVault();
 expect((await r.call('/v1/vault',{protocol:1,vault:vault.manifest.vault,operation:crypto.randomUUID(),base:0,changes:[],manifest:vault.manifest})).status).toBe(200);
 let failNextWrite=false;
 const transport={
  heads:async()=>(await r.call('/v1/extras')).json(),
  read:async section=>(await r.call('/v1/extras?section='+section)).json(),
  write:async operation=>{const res=await r.call('/v1/extras',operation);const body=await res.json();if(failNextWrite){failNextWrite=false;throw Error('The answer was lost.');}if(!res.ok){if(body.error==='REVISION_CONFLICT'){const {RevisionConflict}=await import('../../apps/web/lib/vault/cloud-sync');throw new RevisionConflict();}throw Error(body.error);}return body;},
 };
 const device=()=>({storage:memoryStorage(),bases:memoryBases()});
 const sync=(d,health=true)=>syncExtras({transport,key:vault.key,manifest:vault.manifest,storage:d.storage,bases:d.bases,fence:()=>{},health});
 return {r,vault,transport,device,sync,loseNextAnswer:()=>{failNextWrite=true;}};
}
const read=(d,key)=>JSON.parse(d.storage.getItem(key)??'null');
const states=outcomes=>Object.fromEntries(outcomes.map(o=>[o.section,o.state]));

test('migration: the first device uploads its records as they are; the second receives them; the fields that stay on each device stay',async()=>{
 const {r,device,sync}=await setup();
 try{
  const a=device(),b=device();
  let extras=setGoalReasons(emptyGoalExtras(),'private:1',{why:'See the sea'},at);extras=setGoalCardArt(extras,'private:1','nebula-1',at);
  a.storage.setItem(GOALS,JSON.stringify({...extras,dormant:{'private:9':{why:'Old',dormantSince:'2026-10-01'}}}));
  a.storage.setItem(CALC,JSON.stringify({version:1,scenarios:[]}));
  a.storage.setItem(HABITS,JSON.stringify({version:1,areas:{h1:'fun'},folds:{morning:true}}));
  b.storage.setItem(HABITS,JSON.stringify({version:1,folds:{evening:true}}));
  expect(states(await sync(a))).toEqual({goals:'pushed',life:'pushed',habits:'pushed',health:'unchanged'});
  expect(states(await sync(b))).toEqual({goals:'pulled',life:'pulled',habits:'pulled',health:'unchanged'});
  expect(read(b,GOALS).goals['private:1']).toEqual({why:'See the sea',cardArt:'nebula-1',updatedAt:at});
  // A's dormant extras and folds never travel; B keeps its own folds.
  expect(read(b,GOALS).dormant).toBeUndefined();expect(read(b,HABITS)).toEqual({version:1,areas:{h1:'fun'},folds:{evening:true}});
  expect(read(a,GOALS).dormant).toEqual({'private:9':{why:'Old',dormantSince:'2026-10-01'}});
  // Nothing left to do on either side.
  expect(states(await sync(a))).toEqual({goals:'unchanged',life:'unchanged',habits:'unchanged',health:'unchanged'});
  expect(states(await sync(b))).toEqual({goals:'unchanged',life:'unchanged',habits:'unchanged',health:'unchanged'});
 }finally{await r.mf.dispose();}
},60000);

test('both devices edit: different goals both kept; a removal on one device reaches the other; the same goal settles by its later edit',async()=>{
 const {r,device,sync}=await setup();
 try{
  const a=device(),b=device();
  a.storage.setItem(GOALS,JSON.stringify(setGoalReasons(emptyGoalExtras(),'private:1',{why:'One'},at)));
  await sync(a);await sync(b);
  a.storage.setItem(GOALS,JSON.stringify(setGoalReasons(read(a,GOALS),'private:2',{why:'Two, from A'},later)));
  b.storage.setItem(GOALS,JSON.stringify(setGoalReasons(read(b,GOALS),'private:3',{why:'Three, from B'},later)));
  await sync(a);expect(states(await sync(b)).goals).toBe('merged');await sync(a);
  for(const d of [a,b])expect(Object.keys(read(d,GOALS).goals).sort()).toEqual(['private:1','private:2','private:3']);
  // B removes goal 2's extras; A receives the removal.
  const without=read(b,GOALS);delete without.goals['private:2'];b.storage.setItem(GOALS,JSON.stringify(without));
  await sync(b);await sync(a);expect(Object.keys(read(a,GOALS).goals).sort()).toEqual(['private:1','private:3']);
  // Both edit goal 1: the later edit wins on both devices.
  a.storage.setItem(GOALS,JSON.stringify(setGoalReasons(read(a,GOALS),'private:1',{why:'A, earlier'},'2026-10-13T10:00:00.000Z')));
  b.storage.setItem(GOALS,JSON.stringify(setGoalReasons(read(b,GOALS),'private:1',{why:'B, later'},'2026-10-13T11:00:00.000Z')));
  await sync(a);await sync(b);await sync(a);
  for(const d of [a,b])expect(read(d,GOALS).goals['private:1'].why).toBe('B, later');
 }finally{await r.mf.dispose();}
},60000);

test('Health extras travel only under the Health consent; a device without it never receives or sends them',async()=>{
 const {r,device,sync}=await setup();
 try{
  const a=device(),b=device();
  a.storage.setItem(MICRO,JSON.stringify({version:1,targets:{ironMg:15}}));b.storage.setItem(COACH,JSON.stringify({version:1,answers:{'2026-10-12':{answer:'keep',at}}}));
  expect(states(await sync(a,true)).health).toBe('pushed');
  expect(states(await sync(b,false)).health).toBe('skipped');
  expect(b.storage.getItem(MICRO)).toBeNull();expect(read(a,COACH)).toBeNull();
  // B ticks the consent: both devices' Health extras join.
  expect(states(await sync(b,true)).health).toBe('merged');await sync(a,true);
  for(const d of [a,b]){expect(read(d,MICRO)).toEqual({version:1,targets:{ironMg:15}});expect(read(d,COACH).answers['2026-10-12'].answer).toBe('keep');}
 }finally{await r.mf.dispose();}
},60000);

test('a record from a later build travels untouched; a lost upload answer is recognised; an edit made during a sync is never overwritten',async()=>{
 const {r,vault,device,sync,loseNextAnswer}=await setup();
 try{
  const a=device();
  // Another (later) device put a record this build does not know into the goals section.
  const future={'zigoals:future-goal-thing:v3':{version:3,stuff:[1,2,3]},[AVG]:{version:1,goals:[]}};
  expect((await r.call('/v1/extras',{protocol:1,action:'put',vault:vault.manifest.vault,operation:crypto.randomUUID(),section:'goals',base:0,generation:0,epoch:vault.manifest.epoch,parts:await sealSection(vault.key,vault.manifest,'goals',1,sectionText(future))})).status).toBe(200);
  a.storage.setItem(GOALS,JSON.stringify(setGoalReasons(emptyGoalExtras(),'private:1',{why:'Mine'},at)));
  expect(states(await sync(a)).goals).toBe('merged');
  const b=device();await sync(b);
  expect(read(b,GOALS).goals['private:1'].why).toBe('Mine');expect(b.storage.getItem('zigoals:future-goal-thing:v3')).toBeNull();
  const cloud=await (await r.call('/v1/extras?section=goals')).json(),{openSection}=await import('../../apps/web/lib/vault/extras-sync');
  expect(JSON.parse(await openSection(vault.key,vault.manifest,cloud)).records['zigoals:future-goal-thing:v3']).toEqual({version:3,stuff:[1,2,3]});
  // The upload lands but its answer is lost: the next sync recognises the cloud copy as this device's own.
  a.storage.setItem(GOALS,JSON.stringify(setGoalReasons(read(a,GOALS),'private:2',{why:'Lost answer'},later)));
  const lost=await sync(a);expect(states(lost).goals).toBe('pushed');
  loseNextAnswer();a.storage.setItem(GOALS,JSON.stringify(setGoalReasons(read(a,GOALS),'private:4',{why:'Answer lost'},later)));
  expect(states(await sync(a)).goals).toBe('error');
  expect(states(await sync(a)).goals).toBe('unchanged');
  // An edit made between the read and the write is never overwritten: the sync stops and runs again.
  const c=device();c.storage.setItem(GOALS,JSON.stringify(emptyGoalExtras()));
  const raw=c.storage.getItem.bind(c.storage);let reads=0;
  const racing={...c,storage:{...c.storage,getItem:k=>{if(k===GOALS&&++reads===2)c.storage.setItem(GOALS,JSON.stringify(setGoalReasons(emptyGoalExtras(),'private:7',{why:'Typed during sync'},later)));return raw(k);},setItem:c.storage.setItem,removeItem:c.storage.removeItem}};
  await expect(sync(racing)).rejects.toBeInstanceOf(ExtrasChangedDuringSync);
  expect(read(c,GOALS).goals['private:7'].why).toBe('Typed during sync');
  await sync(c);expect(Object.keys(read(c,GOALS).goals).sort()).toEqual(['private:1','private:2','private:4','private:7']);
 }finally{await r.mf.dispose();}
},60000);

test('"Remove from the cloud": every section deleted, this device stops; another device sees the removal and keeps its records',async()=>{
 const {r,vault,transport,device,sync}=await setup();
 try{
  const a=device(),b=device();
  a.storage.setItem(GOALS,JSON.stringify(setGoalReasons(emptyGoalExtras(),'private:1',{why:'Kept here'},at)));
  await sync(a);await sync(b);
  await deleteExtrasCopies({transport,manifest:vault.manifest,storage:a.storage,bases:a.bases,fence:()=>{}});
  expect(readExtrasChoice(a.storage).enabled).toBe(false);expect(a.bases.map.size).toBe(0);
  expect((await (await r.call('/v1/extras')).json()).sections.goals).toMatchObject({generation:1,parts:0});
  expect(states(await sync(b)).goals).toBe('deleted');
  expect(read(b,GOALS).goals['private:1'].why).toBe('Kept here');expect(read(a,GOALS).goals['private:1'].why).toBe('Kept here');
 }finally{await r.mf.dispose();}
},60000);
