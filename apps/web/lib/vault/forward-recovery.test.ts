import 'fake-indexeddb/auto';
import {test,expect} from 'vitest';
import {SyncJournal,type SyncState} from './cloud-sync';
import {createVault} from './crypto';
import {prepareForwardRecovery,confirmForwardRecovery} from './forward-recovery';

test('forward recovery archives the unchanged obsolete journal atomically and never sends its operation',async()=>{
 const account=crypto.randomUUID(),vault=await createVault(),journal=new SyncJournal(account);
 const state:SyncState={version:1,base:{},revision:0,headRevision:0,headDigest:null,pending:{protocol:1,vault:vault.manifest.vault,operation:crypto.randomUUID(),base:0,changes:[]}};
 state.pendingPolicy=1;await journal.write(state);let writes=0;const transport={read:async()=>({protocol:1,revision:0,manifest:vault.manifest,records:[],cursor:null}),write:async()=>{writes++;throw Error('Never replay');}},local={settings:'{"widget":"fictional"}'};
 const review=await prepareForwardRecovery(account,local,transport,journal,vault.key,vault.manifest,()=>{},()=>{});
 expect(await journal.read()).toEqual(state);expect(review.file).not.toContain('fictional');
 const applied:unknown[]=[];await confirmForwardRecovery(review,local,transport,journal,vault.key,vault.manifest,()=>{},async data=>{applied.push(data);},()=>{});
 expect(writes).toBe(0);expect(applied).toEqual([local]);expect((await journal.read()).pending).toBeNull();expect(await journal.recoveryHistory()).toEqual([{id:review.id,original:state}]);
 // A stale confirmation cannot overwrite a newer queue.
 await journal.write({...state,pending:{...state.pending!,operation:crypto.randomUUID()}});
 await expect(confirmForwardRecovery(review,local,transport,journal,vault.key,vault.manifest,()=>{},async()=>{},()=>{})).rejects.toThrow('changed');
});

test('newer pending policy and changed local records stay untouched',async()=>{
 const account=crypto.randomUUID(),vault=await createVault(),journal=new SyncJournal(account),state:SyncState={version:1,base:{},revision:0,headRevision:0,headDigest:null,pendingPolicy:999,pending:{protocol:1,vault:vault.manifest.vault,operation:crypto.randomUUID(),base:0,changes:[]}};await journal.write(state);
 const transport={read:async()=>{throw Error('Must reject before network');},write:async()=>{throw Error('Never send');}};
 await expect(prepareForwardRecovery(account,{},transport,journal,vault.key,vault.manifest,()=>{},()=>{})).rejects.toThrow('newer');expect(await journal.read()).toEqual(state);
});

// Session Y Part 5, FIX_PLAN B5 (Q-SYNC-06, ADR-018): archived journals hold a plaintext copy of the synced base. Per
// account at most ARCHIVES_KEPT stay; only this build's timestamped archives without pending work are removed, oldest
// first. An archive with work that was never uploaded, and every archive an earlier build wrote, stays.
test('B5: the recovery archive keeps the newest twenty; pending work and earlier builds\' archives are never removed',async()=>{
 const {ARCHIVES_KEPT}=await import('./cloud-sync'),{vi}=await import('vitest');
 const account=crypto.randomUUID(),other=crypto.randomUUID(),journal=new SyncJournal(account),vault=await createVault();
 const plant=(owner:string,id:string,original:SyncState)=>new Promise<void>((resolve,reject)=>{const open=indexedDB.open('zigoals-account-sync-v1',2);open.onsuccess=()=>{const t=open.result.transaction('recovery','readwrite');t.objectStore('recovery').put({id,original},JSON.stringify([owner,id]));t.oncomplete=()=>{open.result.close();resolve();};t.onerror=()=>reject(t.error);};open.onerror=()=>reject(open.error);});
 const state=(n:number,pending=false):SyncState=>({version:1,base:{settings:`{"n":${n}}`},revision:n,headRevision:n,headDigest:null,pending:pending?{protocol:1,vault:vault.manifest.vault,operation:crypto.randomUUID(),base:n,changes:[]}:null});
 await journal.read();
 const legacy=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333'];
 for(const [i,id] of legacy.entries())await plant(account,id,state(100+i));
 await new SyncJournal(other).read();await plant(other,'44444444-4444-4444-8444-444444444444',state(200));
 let now=1_000;const clock=vi.spyOn(Date,'now').mockImplementation(()=>now++);
 const ids:string[]=[];
 try{
  for(let n=0;n<25;n++){const original=state(n,n===2);await journal.write(original);const id=crypto.randomUUID();ids.push(id);await journal.recover(id,original,{version:1,base:{},revision:0,headRevision:0,headDigest:null,pending:null},()=>{});}
 }finally{clock.mockRestore();}
 const kept=await journal.recoveryHistory(),keptIds=kept.map(r=>r.id);
 expect(kept).toHaveLength(ARCHIVES_KEPT);
 for(const id of legacy)expect(keptIds).toContain(id);
 expect(keptIds).toContain(ids[2]);expect(kept.find(r=>r.id===ids[2])!.original.pending).not.toBeNull();
 // The 16 newest of this build's own: 25 written, the pending one kept, so the 8 oldest others went.
 const removed=ids.filter((_,n)=>n!==2).slice(0,8);for(const id of removed)expect(keptIds).not.toContain(id);
 for(const id of ids.slice(9))expect(keptIds).toContain(id);
 expect((await new SyncJournal(other).recoveryHistory()).map(r=>r.id)).toEqual(['44444444-4444-4444-8444-444444444444']);
 // Idempotent: nothing more to remove.
 expect(await journal.pruneArchives()).toBe(0);
});
