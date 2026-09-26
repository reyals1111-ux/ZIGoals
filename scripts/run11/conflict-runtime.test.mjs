import 'fake-indexeddb/auto';
import {test,expect} from 'vitest';
import {privateRuntime,ACCOUNT} from './private-runtime.mjs';
import {createVault} from '../../apps/web/lib/vault/crypto';
import {synchronize,cloudSnapshot,SyncJournal} from '../../apps/web/lib/vault/cloud-sync';
import {prepareConflictReview,confirmConflictReview,resolveConflicts} from '../../apps/web/lib/vault/conflict-review';
import {validateData} from '../../apps/web/lib/vault/account-data';
import {emptyDashboardSettings} from '../../apps/web/lib/dashboard-settings';
import {decryptBackup} from '../../apps/web/lib/vault/backup';
import {emptyPlatform,platformSchema,allocationBalance,goalProgress} from '../../apps/web/lib/positions';
import {fundGoal} from '../../apps/web/lib/contribution-funding';
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
test('two independent funding aggregates retain both deposits, cap allocation and replay without duplication',async()=>{
 const r=await privateRuntime();try{
  await r.call('/v1/sessions',{action:'register',label:'Funding fixture'});const vault=await createVault();await r.call('/v1/vault',{protocol:1,vault:vault.manifest.vault,operation:crypto.randomUUID(),base:0,changes:[],manifest:vault.manifest});const at=new Date().toISOString();
  const platform=platformSchema.parse({...emptyPlatform(),positions:[{id:'cash',providerId:'Cash',sourceType:'MANUAL',network:'manual',account:'local',asset:'USD',assetClass:'Cash',denom:'USD',quantity:'0',decimals:2,valuation:{value:'0',decimals:2,currency:'USD',source:'MANUAL',observedAt:at},liquidity:'LIQUID',verification:'MANUAL',sync:'MANUAL',observedAt:at,provenance:'Fixture',notes:'',risk:'',executionAuthority:'NONE'}],goals:[{id:'81',name:'Fictional reserve',type:'VALUE',asset:'USD',denom:'USD',milestones:[],network:'zigchain-1',decimals:2,target:'200000',category:'Emergency Fund',status:'active',createdAt:at,notes:''}]});
  const transport={read:async()=>(await r.call('/v1/vault')).json(),write:async op=>{const res=await r.call('/v1/vault',op);expect(res.status).toBe(200);return res.json();}},journal=new SyncJournal(crypto.randomUUID()),base={finance:JSON.stringify(platform)};
  await(await synchronize(transport,journal,vault.key,vault.manifest,base,validateData,()=>{})).commit();const original=await journal.read();
  const inputA={id:crypto.randomUUID(),goalId:'81',positionId:'cash',quantity:'2000000',occurredAt:at},inputB={...inputA,id:crypto.randomUUID(),quantity:'50000'},a=fundGoal(platform,inputA,[],Date.parse(at)),b=fundGoal(platform,inputB,[],Date.parse(at));
  expect(goalProgress(a,'81').current).toBe('200000');expect(allocationBalance(a,'cash').unallocated).toBe('1800000');
  const left={finance:JSON.stringify(a)},right={finance:JSON.stringify(b)},other={read:async()=>structuredClone(original),write:async()=>{}};await synchronize(transport,other,vault.key,vault.manifest,right,validateData,()=>{});
  const review=await prepareConflictReview(journal.accountId,left,transport,journal,vault.key,vault.manifest,()=>{},['finance']),plan=resolveConflicts(review.original.base,left,right,{}),choices=Object.fromEntries(plan.conflicts.map(c=>[c.id,c.path.includes('allocations')?'local':c.combined!==undefined?'combined':'local']));let applied;
  await confirmConflictReview(review,choices,left,transport,journal,vault.key,vault.manifest,async value=>{applied=value;},()=>{});await(await synchronize(transport,journal,vault.key,vault.manifest,applied,validateData,()=>{})).commit();
  const result=platformSchema.parse(JSON.parse((await cloudSnapshot(transport,vault.key,vault.manifest)).data.finance));expect(result.contributions.map(e=>e.id).sort()).toEqual([inputA.id,inputB.id].sort());expect(result.positions[0].quantity).toBe('2050000');expect(goalProgress(result,'81').current).toBe('200000');expect(allocationBalance(result,'cash').unallocated).toBe('1850000');expect(fundGoal(result,inputA,[],Date.parse(at))).toEqual(result);
 }finally{await r.mf.dispose();}
},30000);
