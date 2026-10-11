import {expect,test} from 'vitest';
import {createVault,sealRecord} from './crypto';
import {encryptPendingRecovery,decryptPendingRecovery} from './pending-recovery';
import type {SyncState} from './cloud-sync';

test('separate recovery encrypts an older incompatible queue without changing it',async()=>{
 const vault=await createVault(),account=crypto.randomUUID(),operation=crypto.randomUUID(),id=crypto.randomUUID();
 const envelope=await sealRecord(vault.key,{vault:vault.manifest.vault,domain:'finance',object:id,revision:1,epoch:1},{value:'FICTIONAL_PENDING_FINANCE'});
 const state:SyncState={version:1,base:{finance:'{"marker":"FICTIONAL_LOCAL_BASE"}'},revision:4,headRevision:1,headDigest:'a'.repeat(64),pending:{protocol:1,vault:vault.manifest.vault,operation,base:4,changes:[{id,domain:'finance',revision:1,epoch:1,envelope,deleted:false}]}};
 const before=structuredClone(state),result=await encryptPendingRecovery(account,state);
 expect(state).toEqual(before);expect(result.file).not.toContain('FICTIONAL_');expect(result.file).not.toContain(account);expect(result.file).not.toContain(operation);
 expect(JSON.parse(result.file).format).toBe('zigoals-pending-recovery');
 expect(await decryptPendingRecovery(result.file,result.recovery)).toEqual({format:'zigoals-pending-recovery-payload',version:1,account,journal:state});
 await expect(decryptPendingRecovery(result.file,(await createVault()).recovery)).rejects.toThrow();
});

test('empty queue is not presented as a recovery export',async()=>{
 const state:SyncState={version:1,base:{},revision:0,headRevision:0,headDigest:null,pending:null};
 await expect(encryptPendingRecovery(crypto.randomUUID(),state)).rejects.toThrow('No pending');
});
