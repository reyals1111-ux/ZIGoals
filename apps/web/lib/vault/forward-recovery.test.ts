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
