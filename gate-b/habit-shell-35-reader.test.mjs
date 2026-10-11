import 'fake-indexeddb/auto';
import {test,expect} from 'vitest';
// TEMPORARY, never committed (Session Z-Cloud Gate B): a #35 device (12a3ef9's own sync, validation, merge, habit
// readers and private-sync Worker) receives a habit deleted for good by this branch's code.
import {privateRuntime} from './private-runtime.mjs';
import {createVault} from '../../apps/web/lib/vault/crypto';
import {synchronize,cloudSnapshot,SyncJournal} from '../../apps/web/lib/vault/cloud-sync';
import {prepareConflictReview,resolveConflicts} from '../../apps/web/lib/vault/conflict-review';
import {validateData} from '../../apps/web/lib/vault/account-data';
import {createHabit,emptyHabitData,habitDataSchema,logHabitValue,habitRuleOn,habitDay,habitStats} from '../../apps/web/lib/habits';
import {scheduleHabitState} from '../../apps/web/lib/habit-actions';
import {deleteHabitForGood} from '/home/user/ZIGoals/apps/web/lib/habit-delete-write.ts';
import {isDeletedHabit} from '/home/user/ZIGoals/apps/web/lib/habit-delete.ts';
const T0=new Date('2026-09-01T09:00:00.000Z'),A='2f0c8d6e-1a2b-4c3d-8e9f-0a1b2c3d4e5f',B='7b6a5c4d-3e2f-4a1b-9c8d-7e6f5a4b3c2d';
function start(){
 let data=createHabit({...emptyHabitData(),timeZone:'UTC'},{title:'Fictional smoke-free evenings',category:'Health',description:'',notes:'Fictional private notes',type:'quit',measurement:{kind:'count',unit:'cigarettes'},schedule:{kind:'daily'},target:0},T0,A);
 data=createHabit(data,{title:'Fictional reading',category:'Personal',description:'',notes:'',schedule:{kind:'daily'},target:1},T0,B);
 data=logHabitValue(data,A,'2026-09-02',0,{note:'fictional hard day'},new Date('2026-09-02T20:00:00.000Z'));
 return scheduleHabitState(data,A,'archived','2026-09-21',new Date('2026-09-20T09:00:00.000Z'));
}
async function devices(){
 const r=await privateRuntime();
 await r.call('/v1/sessions',{action:'register',label:'Fictional devices'});const vault=await createVault();
 await r.call('/v1/vault',{protocol:1,vault:vault.manifest.vault,operation:crypto.randomUUID(),base:0,changes:[],manifest:vault.manifest});
 const transport={read:async()=>(await r.call('/v1/vault')).json(),write:async op=>{const response=await r.call('/v1/vault',op);expect(response.status).toBe(200);return response.json();}};
 const sync=async(journal,habits)=>{const result=await synchronize(transport,journal,vault.key,vault.manifest,{habits:JSON.stringify(habits)},validateData,()=>{});await result.commit();return habitDataSchema.parse(JSON.parse(result.data.habits));};
 const one=new SyncJournal(crypto.randomUUID()),two=new SyncJournal(crypto.randomUUID()),initial=start();
 await sync(one,initial);expect(await sync(two,initial)).toEqual(initial);
 return {r,vault,transport,one,two,initial,sync};
}
test('#35 receives the deletion: it parses, validates and merges the shell; the habit stays archived, never due, nothing private left',async()=>{
 const d=await devices();
 try{
  const {data:deleted}=deleteHabitForGood(d.initial,A,new Date('2026-09-25T09:00:00.000Z'));
  await d.sync(d.one,deleted);
  const received=await d.sync(d.two,d.initial);
  const shell=received.habits.find(h=>h.id===A);
  expect(isDeletedHabit(shell)).toBe(true);
  expect(habitRuleOn(shell,'2026-09-25').state).toBe('archived');
  for(const day of ['2026-09-25','2026-09-26','2026-10-11']) expect(habitDay(shell,day,day).status).toBe('archived');
  expect(()=>habitStats(shell,'2026-09-25')).not.toThrow();
  expect(received.habits.find(h=>h.id===B)).toEqual(d.initial.habits.find(h=>h.id===B));
  expect(JSON.stringify(received)).not.toMatch(/smoke-free|private notes|hard day/);
  const cloud=JSON.parse((await cloudSnapshot(d.transport,d.vault.key,d.vault.manifest)).data.habits);
  expect(JSON.stringify(cloud)).not.toMatch(/smoke-free|private notes|hard day/);
 }finally{await d.r.mf.dispose();}
},30000);
test('#35 edits the deleted habit offline: a conflict to review, never a silent overwrite',async()=>{
 const d=await devices();
 try{
  const {data:deleted}=deleteHabitForGood(d.initial,A,new Date('2026-09-25T09:01:00.000Z'));
  await d.sync(d.one,deleted);
  const restored=scheduleHabitState(d.initial,A,'active','2026-09-26',new Date('2026-09-25T09:00:00.000Z'));
  await expect(synchronize(d.transport,d.two,d.vault.key,d.vault.manifest,{habits:JSON.stringify(restored)},validateData,()=>{})).rejects.toThrow('Conflicting');
  const review=await prepareConflictReview(d.two.accountId,{habits:JSON.stringify(restored)},d.transport,d.two,d.vault.key,d.vault.manifest,()=>{},['habits']);
  expect(resolveConflicts(review.original.base,{habits:JSON.stringify(restored)},review.cloud,{}).conflicts.length).toBeGreaterThan(0);
 }finally{await d.r.mf.dispose();}
},30000);
test('#35 checks in another habit while the deletion is offline: both kept',async()=>{
 const d=await devices();
 try{
  const {data:deletedOffline}=deleteHabitForGood(d.initial,A,new Date('2026-09-25T09:00:00.000Z'));
  const checkedIn=logHabitValue(d.initial,B,'2026-09-25',1,{},new Date('2026-09-25T10:00:00.000Z'));
  await d.sync(d.two,checkedIn);
  const merged=await d.sync(d.one,deletedOffline);
  expect(isDeletedHabit(merged.habits.find(h=>h.id===A))).toBe(true);
  expect(merged.habits.find(h=>h.id===B).entries.map(e=>e.date)).toContain('2026-09-25');
  expect(await d.sync(d.two,checkedIn)).toEqual(merged);
 }finally{await d.r.mf.dispose();}
},30000);
