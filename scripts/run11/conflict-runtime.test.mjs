import 'fake-indexeddb/auto';
import {test,expect} from 'vitest';
import {privateRuntime,ACCOUNT} from './private-runtime.mjs';
import {createVault} from '../../apps/web/lib/vault/crypto';
import {synchronize,cloudSnapshot,SyncJournal} from '../../apps/web/lib/vault/cloud-sync';
import {prepareConflictReview,confirmConflictReview,resolveConflicts} from '../../apps/web/lib/vault/conflict-review';
import {validateData} from '../../apps/web/lib/vault/account-data';
import {emptyDashboardSettings} from '../../apps/web/lib/dashboard-settings';
import {decryptBackup} from '../../apps/web/lib/vault/backup';
test('real encrypted account conflict review preserves both copies, fences changes and publishes explicit resolution',async()=>{
 const r=await privateRuntime();try{
  await r.call('/v1/sessions',{action:'register',label:'Conflict fixture'});const vault=await createVault();await r.call('/v1/vault',{protocol:1,vault:vault.manifest.vault,operation:crypto.randomUUID(),base:0,changes:[],manifest:vault.manifest});
  const transport={read:async()=>(await r.call('/v1/vault')).json(),write:async op=>{const res=await r.call('/v1/vault',op);expect(res.status).toBe(200);return res.json();}};
  const journal=new SyncJournal(ACCOUNT),base={settings:JSON.stringify(emptyDashboardSettings())};await(await synchronize(transport,journal,vault.key,vault.manifest,base,validateData,()=>{})).commit();const state=await journal.read();
  const left={settings:JSON.stringify({...JSON.parse(base.settings),preset:'wealth'})},right={settings:JSON.stringify({...JSON.parse(base.settings),preset:'health'})};
  const other={read:async()=>structuredClone(state),write:async()=>{}};await synchronize(transport,other,vault.key,vault.manifest,right,validateData,()=>{});
  await expect(synchronize(transport,journal,vault.key,vault.manifest,left,validateData,()=>{})).rejects.toThrow('Conflicting');
  const review=await prepareConflictReview(ACCOUNT,left,transport,journal,vault.key,vault.manifest,()=>{},['settings']),plan=resolveConflicts(review.original.base,review.local,review.cloud,{});expect(plan.conflicts).toHaveLength(1);
  const backup=JSON.parse((await decryptBackup(review.file,review.recovery)).settings);expect(backup).toMatchObject({local:left,cloud:right});
  let applied;const choices={[plan.conflicts[0].id]:'local'};
  await expect(confirmConflictReview(review,choices,right,transport,journal,vault.key,vault.manifest,async()=>{},()=>{})).rejects.toThrow('changed');
  await confirmConflictReview(review,choices,left,transport,journal,vault.key,vault.manifest,async data=>{applied=data;},()=>{});
  await(await synchronize(transport,journal,vault.key,vault.manifest,applied,validateData,()=>{})).commit();expect((await cloudSnapshot(transport,vault.key,vault.manifest)).data).toEqual(left);expect(await journal.recoveryHistory()).toHaveLength(1);
 }finally{await r.mf.dispose();}
},30000);
