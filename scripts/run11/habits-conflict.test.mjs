import 'fake-indexeddb/auto';
import {test,expect} from 'vitest';
import {privateRuntime} from './private-runtime.mjs';
import {createVault} from '../../apps/web/lib/vault/crypto';
import {synchronize,cloudSnapshot,SyncJournal} from '../../apps/web/lib/vault/cloud-sync';
import {prepareConflictReview,confirmConflictReview,resolveConflicts} from '../../apps/web/lib/vault/conflict-review';
import {validateData} from '../../apps/web/lib/vault/account-data';
import {decryptBackup} from '../../apps/web/lib/vault/backup';
import {createHabit,emptyHabitData,habitDataSchema,habitRuleOn} from '../../apps/web/lib/habits';
import {scheduleHabitEdit,habitEditFingerprint,startHabitTimer,pauseHabitTimer,commitHabitTimer} from '../../apps/web/lib/habit-actions';
const now=new Date('2026-09-26T12:00:00Z'),id='59a35604-3696-4a78-b455-4015acb66885',timer='ff829326-f352-4a26-80d0-eb8c31cde62e';
const input={title:'Fictional reading',category:'Personal',description:'',notes:'',schedule:{kind:'daily'},target:30,measurement:{kind:'duration',unit:'minutes'}};
for(const kind of ['rules','timer','timer-commit','timer-divergent-commit'])test(`real encrypted two-client ${kind} conflict retains both reviewed copies and does not silently overwrite`,async()=>{
 const r=await privateRuntime();try{
  await r.call('/v1/sessions',{action:'register',label:'Habit conflict fixture'});const vault=await createVault();await r.call('/v1/vault',{protocol:1,vault:vault.manifest.vault,operation:crypto.randomUUID(),base:0,changes:[],manifest:vault.manifest});
  let initial=createHabit({...emptyHabitData(),timeZone:'UTC'},input,now,id);if(kind!=='rules')initial=startHabitTimer(initial,id,timer,now);if(kind==='timer-commit')initial=pauseHabitTimer(initial,id,timer,new Date(+now+30_000));
  const transport={read:async()=>(await r.call('/v1/vault')).json(),write:async op=>{const response=await r.call('/v1/vault',op);expect(response.status).toBe(200);return response.json();}},journal=new SyncJournal(crypto.randomUUID()),base={habits:JSON.stringify(initial)};
  await(await synchronize(transport,journal,vault.key,vault.manifest,base,validateData,()=>{})).commit();const state=await journal.read(),fingerprint=habitEditFingerprint(initial.habits[0]);
  const leftState=kind==='rules'?scheduleHabitEdit(initial,id,{...input,target:45},'2026-09-27',now,fingerprint):kind==='timer-divergent-commit'?commitHabitTimer(pauseHabitTimer(initial,id,timer,new Date(+now+30_000)),id,timer,new Date(+now+31_000)):kind==='timer-commit'?commitHabitTimer(initial,id,timer,new Date(+now+31_000),JSON.stringify(initial.habits[0].timer)):pauseHabitTimer(initial,id,timer,new Date(+now+30_000),JSON.stringify(initial.habits[0].timer));
  const rightState=kind==='rules'?scheduleHabitEdit(initial,id,{...input,target:60},'2026-09-27',now,fingerprint):kind==='timer-divergent-commit'?commitHabitTimer(pauseHabitTimer(initial,id,timer,new Date(+now+60_000)),id,timer,new Date(+now+60_000)):kind==='timer-commit'?commitHabitTimer(initial,id,timer,new Date(+now+60_000),JSON.stringify(initial.habits[0].timer)):pauseHabitTimer(initial,id,timer,new Date(+now+60_000),JSON.stringify(initial.habits[0].timer));
  const left={habits:JSON.stringify(leftState)},right={habits:JSON.stringify(rightState)};await synchronize(transport,{read:async()=>structuredClone(state),write:async()=>{}},vault.key,vault.manifest,right,validateData,()=>{});
  await expect(synchronize(transport,journal,vault.key,vault.manifest,left,validateData,()=>{})).rejects.toThrow('Conflicting');
  const review=await prepareConflictReview(journal.accountId,left,transport,journal,vault.key,vault.manifest,()=>{},['habits']),plan=resolveConflicts(review.original.base,left,right,{});expect(plan.conflicts.length).toBeGreaterThan(0);expect(JSON.parse((await decryptBackup(review.file,review.recovery)).settings)).toMatchObject({local:left,cloud:right});
  let applied;await confirmConflictReview(review,Object.fromEntries(plan.conflicts.map(c=>[c.id,'local'])),left,transport,journal,vault.key,vault.manifest,async data=>{applied=data;},()=>{});await(await synchronize(transport,journal,vault.key,vault.manifest,applied,validateData,()=>{})).commit();
  const resolved=habitDataSchema.parse(JSON.parse((await cloudSnapshot(transport,vault.key,vault.manifest)).data.habits));
  if(kind==='rules'){expect(habitRuleOn(resolved.habits[0],'2026-09-26').target).toBe(30);expect(habitRuleOn(resolved.habits[0],'2026-09-27').target).toBe(45);expect(resolved.habits[0].ruleRevisions.map(r=>r.rule.target)).toEqual(expect.arrayContaining([30,45,60]));}
  else if(kind.includes('commit')){expect(resolved.habits[0].entries[0].count).toBe(.5);expect(resolved.habits[0].timerReceipts).toHaveLength(2);expect(resolved.habits[0].timerReceipts.map(r=>r.value).sort()).toEqual(kind==='timer-commit'?[.5,.5]:[.5,1]);expect(resolved.habits[0].timerReceipts.map(r=>r.recordedAt).sort()).toEqual([new Date(+now+31_000).toISOString(),new Date(+now+60_000).toISOString()]);expect(commitHabitTimer(resolved,id,timer,new Date(+now+70_000))).toBe(resolved);}
  else {expect(resolved.habits[0].timer.elapsedMs).toBe(30_000);expect(()=>commitHabitTimer(resolved,id,timer,new Date(+now+60_000),JSON.stringify(rightState.habits[0].timer))).toThrow('changed');const logged=commitHabitTimer(resolved,id,timer,new Date(+now+60_000),JSON.stringify(resolved.habits[0].timer));expect(logged.habits[0].entries[0].count).toBe(.5);expect(commitHabitTimer(logged,id,timer,new Date(+now+70_000))).toBe(logged);}
 }finally{await r.mf.dispose();}
},30000);
