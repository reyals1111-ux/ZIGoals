import {test,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {createVault,type VaultManifest} from './crypto';
import {cloudSnapshot,synchronize,RevisionConflict,type CloudOperation,type CloudTransport,type Journal,type SyncState} from './cloud-sync';
import {reconcileOnce} from './reconcile-once';
// Session AF Part 11 A4 (ADR-028 H8, TIER 3 (sync)): the account-browser b-first race (ADR-027 G24), reproduced
// deterministically on the same in-memory cloud the sync tests use.
type Row=CloudOperation['changes'][number];
class MemoryJournal implements Journal{
 state:SyncState={version:1,base:{},revision:0,headRevision:0,headDigest:null,pending:null};
 async read(){return structuredClone(this.state);}async write(state:SyncState){this.state=structuredClone(state);}
}
class Cloud implements CloudTransport{
 revision=0;rows=new Map<string,Row>();receipts=new Map<string,{body:string;revision:number}>();calls:CloudOperation[]=[];after:((operation:CloudOperation)=>Promise<void>)|null=null;
 constructor(public manifest:VaultManifest){}
 page(){return {protocol:1 as const,revision:this.revision,manifest:this.manifest,records:structuredClone([...this.rows.values()]),cursor:null};}
 async read(){return this.page();}
 async write(input:CloudOperation){const operation=structuredClone(input);this.calls.push(operation);const body=JSON.stringify(operation),receipt=this.receipts.get(operation.operation);if(receipt){if(receipt.body!==body)throw Error('Operation reused');return {revision:receipt.revision};}if(operation.base!==this.revision)throw new RevisionConflict();for(const row of operation.changes){if(row.revision!==(this.rows.get(row.id)?.revision??0)+1)throw new RevisionConflict();}for(const row of operation.changes)this.rows.set(row.id,row);this.revision++;this.receipts.set(operation.operation,{body,revision:this.revision});await this.after?.(operation);return {revision:this.revision};}
}
const noop=()=>{};

test('reconcileOnce: one more attempt after a RevisionConflict, fenced; never on another error; a second conflict surfaces',async()=>{
 const fence=vi.fn();
 let n=0;await expect(reconcileOnce(async()=>{n++;if(n===1)throw new RevisionConflict();return 'ok';},fence)).resolves.toBe('ok');expect(n).toBe(2);expect(fence).toHaveBeenCalledTimes(1);
 n=0;await expect(reconcileOnce(async()=>{n++;throw new RevisionConflict();},fence)).rejects.toThrow(RevisionConflict);expect(n).toBe(2);
 n=0;await expect(reconcileOnce(async()=>{n++;throw Error('boom');},fence)).rejects.toThrow('boom');expect(n).toBe(1);
 // The fence runs before the retry: a locked vault or a changed account stops it.
 n=0;await expect(reconcileOnce(async()=>{n++;throw new RevisionConflict();},()=>{throw Error('Vault locked. Sync result was not applied.');})).rejects.toThrow('Vault locked');expect(n).toBe(1);
});

test('b-first: B replays its offline write against A\'s newer head (409), reconciles once, and reaches the conflict in the same sync instead of pausing',async()=>{
 const vault=await createVault(),cloud=new Cloud(vault.manifest),a=new MemoryJournal(),b=new MemoryJournal();
 // Both devices start from the same synced base: a measurement of 80.
 await (await synchronize(cloud,a,vault.key,vault.manifest,{settings:JSON.stringify({measurement:80})},noop,noop)).commit();b.state=structuredClone(a.state);
 // B corrects it to 77 while offline: its first write is journalled as pending and never reaches the cloud.
 const online=cloud.write.bind(cloud);cloud.write=async()=>{throw Error('Offline');};
 const bLocal={settings:JSON.stringify({measurement:77})};
 await expect(synchronize(cloud,b,vault.key,vault.manifest,bLocal,noop,noop)).rejects.toThrow('Offline');
 expect(b.state.pending).not.toBeNull();
 // A comes online first and syncs its own correction (78): the cloud head moves past B's pending base.
 cloud.write=online;
 await (await synchronize(cloud,a,vault.key,vault.manifest,{settings:JSON.stringify({measurement:78})},noop,noop)).commit();
 // Without reconcile-once (a copy of B's journal): the replay answers 409, pending is cleared, and the sync stops on
 // "Cloud changed… Retry to reconcile" — the state CI run 1013 caught, where the conflict review never appeared.
 const copy=new MemoryJournal();copy.state=structuredClone(b.state);
 await expect(synchronize(cloud,copy,vault.key,vault.manifest,bLocal,noop,noop)).rejects.toThrow(RevisionConflict);
 expect(copy.state.pending).toBeNull();
 // With reconcile-once, the same press reads A's head and reaches the conflict review in this sync.
 const fence=vi.fn(),writes=cloud.calls.length;
 await expect(reconcileOnce(()=>synchronize(cloud,b,vault.key,vault.manifest,bLocal,noop,noop),fence)).rejects.toThrow(/^Conflicting /);
 expect(fence).toHaveBeenCalledTimes(1);
 // Nothing was overwritten: one refused replay is the only write attempt, the cloud still holds A's 78, B keeps its 77 locally.
 expect(cloud.calls.length-writes).toBe(1);
 expect(JSON.parse((await cloudSnapshot(cloud,vault.key,vault.manifest)).data.settings!)).toEqual({measurement:78});
 expect(b.state.pending).toBeNull();
});

test('the account sync and the Portfolio sync both reconcile through reconcileOnce',()=>{
 const controls=readFileSync(new URL('../../components/vault-sync-controls.tsx',import.meta.url),'utf8');
 expect(controls).toContain('const {local,result}=await reconcileOnce(async()=>{const local=await captureData(storage,domains);');
 expect(controls).toContain('const outcome=await reconcileOnce(attempt,fence);');
 expect(controls).not.toMatch(/instanceof RevisionConflict/);
});
