import {createEmptyHealth,healthSchema} from '../health';
import {addWater} from '../health-daily';
import {test,expect} from 'vitest';
import {createVault,sealRecord,type VaultManifest} from './crypto';
import {cloudSnapshot,mergePrivateData,synchronize,RevisionConflict,type CloudOperation,type CloudTransport,type Journal,type PrivateData,type SyncState} from './cloud-sync';
const HEAD='00000000-0000-4000-8000-000000000001';
type Row=CloudOperation['changes'][number];
class MemoryJournal implements Journal{
 state:SyncState={version:1,base:{},revision:0,headRevision:0,headDigest:null,pending:null};
 async read(){return structuredClone(this.state);}async write(state:SyncState){this.state=structuredClone(state);}
}
class Cloud implements CloudTransport{
 revision=0;rows=new Map<string,Row>();receipts=new Map<string,{body:string;revision:number}>();calls:CloudOperation[]=[];
 before:((operation:CloudOperation)=>Promise<void>)|null=null;after:((operation:CloudOperation)=>Promise<void>)|null=null;
 constructor(public manifest:VaultManifest){}
 page(){return {protocol:1 as const,revision:this.revision,manifest:this.manifest,records:structuredClone([...this.rows.values()]),cursor:null};}
 async read(){return this.page();}
 async write(input:CloudOperation){const operation=structuredClone(input);this.calls.push(operation);await this.before?.(operation);if(operation.vault!==this.manifest.vault)throw Error('Wrong vault');const body=JSON.stringify(operation),receipt=this.receipts.get(operation.operation);if(receipt){if(receipt.body!==body)throw Error('Operation reused');return {revision:receipt.revision};}if(operation.base!==this.revision)throw new RevisionConflict();for(const row of operation.changes){if(row.revision!==(this.rows.get(row.id)?.revision??0)+1)throw new RevisionConflict();}for(const row of operation.changes)this.rows.set(row.id,row);this.revision++;this.receipts.set(operation.operation,{body,revision:this.revision});await this.after?.(operation);return {revision:this.revision};}
}
const noop=()=>{};
async function setup(){const vault=await createVault();return {vault,cloud:new Cloud(vault.manifest),journal:new MemoryJournal()};}
async function sync(s:Awaited<ReturnType<typeof setup>>,data:PrivateData){const result=await synchronize(s.cloud,s.journal,s.vault.key,s.vault.manifest,data,noop,noop);await result.commit();return result;}
test('large snapshot stages immutable chunks and publishes one complete catalog last',async()=>{
 const s=await setup(),data={settings:JSON.stringify({notes:'FICTIONAL '.repeat(120000)})};const beforeHead:boolean[]=[];s.cloud.before=async()=>{beforeHead.push(s.cloud.rows.has(HEAD));};
 const result=await sync(s,data);expect(s.cloud.calls.length).toBeGreaterThan(2);expect(beforeHead.every(x=>!x)).toBe(true);expect(s.cloud.calls.at(-1)?.changes.map(r=>r.id)).toEqual([HEAD]);expect(s.cloud.calls.slice(0,-1).every(o=>o.changes.every(r=>r.id!==HEAD&&r.revision===1))).toBe(true);expect(JSON.stringify(s.cloud.page())).not.toContain('FICTIONAL');
 expect((await cloudSnapshot(s.cloud,s.vault.key,s.vault.manifest)).data).toEqual(data);expect(s.journal.state).toMatchObject({base:data,revision:result.revision,headRevision:1,pending:null});
});
test('lost acknowledgement replays the same operation, then completes without partial publication',async()=>{
 const s=await setup(),data={settings:JSON.stringify({items:['one']})};let dropped=false;s.cloud.after=async op=>{if(!dropped&&op.changes.every(r=>r.id!==HEAD)){dropped=true;throw Error('Lost acknowledgement');}};
 await expect(sync(s,data)).rejects.toThrow('Lost acknowledgement');const pending=s.journal.state.pending!;expect(pending).not.toBeNull();expect(s.cloud.rows.has(HEAD)).toBe(false);expect((await cloudSnapshot(s.cloud,s.vault.key,s.vault.manifest)).data).toEqual({});
 await sync(s,data);expect(s.cloud.calls.filter(o=>o.operation===pending.operation)).toHaveLength(2);expect([...s.cloud.receipts.keys()].filter(id=>id===pending.operation)).toHaveLength(1);expect((await cloudSnapshot(s.cloud,s.vault.key,s.vault.manifest)).data).toEqual(data);expect(s.journal.state.pending).toBeNull();
});
test('a staged write rejection leaves the old head visible and clears only a proven rejected operation',async()=>{
 const s=await setup(),original={settings:'{"value":1}'};await sync(s,original);const originalHead=structuredClone(s.cloud.rows.get(HEAD));let reject=true;s.cloud.before=async()=>{if(reject){reject=false;throw new RevisionConflict();}};
 await expect(sync(s,{settings:'{"value":2}'})).rejects.toThrow(RevisionConflict);expect(s.journal.state.pending).toBeNull();expect(s.cloud.rows.get(HEAD)).toEqual(originalHead);expect(s.journal.state.base).toEqual(original);expect((await cloudSnapshot(s.cloud,s.vault.key,s.vault.manifest)).data).toEqual(original);
});
test('initial attach conflicts rather than replacing unrelated local data, while an empty device pulls',async()=>{
 const s=await setup(),remote={settings:'{"value":"cloud"}'};await sync(s,remote);const before=s.cloud.calls.length;const journal=new MemoryJournal();await expect(synchronize(s.cloud,journal,s.vault.key,s.vault.manifest,{settings:'{"value":"local"}'},noop,noop)).rejects.toThrow('Unlinked');expect(s.cloud.calls).toHaveLength(before);expect(journal.state.base).toEqual({});const pulled=await synchronize(s.cloud,journal,s.vault.key,s.vault.manifest,{},noop,noop);expect(pulled.data).toEqual(remote);
});
test('Health exclusion skips Health decryption and publication while preserving remote catalog',async()=>{
 const s=await setup();await sync(s,{health:'{"meal":"FICTIONAL_PRIVATE_HEALTH"}'});const health=[...s.cloud.rows.values()].find(r=>r.domain==='health')!;s.cloud.rows.set(health.id,{...health,envelope:{...health.envelope,ciphertext:'A'.repeat(health.envelope.ciphertext.length)}});const count=s.cloud.calls.length;
 expect((await cloudSnapshot(s.cloud,s.vault.key,s.vault.manifest,0,['settings'])).data).toEqual({});const result=await synchronize(s.cloud,s.journal,s.vault.key,s.vault.manifest,{settings:'{"layout":"balanced"}',health:'{"meal":"LOCAL_ONLY"}'},noop,noop,['settings']);expect(s.cloud.calls.slice(count).every(o=>o.changes.every(r=>r.domain!=='health'))).toBe(true);expect(result.data.settings).toBe('{"layout":"balanced"}');
});
test('revoked Health permission cannot replay an unsent Health operation',async()=>{
 const s=await setup();s.cloud.before=async()=>{throw Error('Offline before send');};await expect(sync(s,{health:'{"meal":"LOCAL_ONLY"}'})).rejects.toThrow('Offline');expect(s.journal.state.pending?.changes.some(r=>r.domain==='health')).toBe(true);s.cloud.calls=[];s.cloud.before=null;
 try{await synchronize(s.cloud,s.journal,s.vault.key,s.vault.manifest,{},noop,noop,['settings']);}catch{/* Blocking pending Health until consent returns is acceptable. */}
 expect(s.cloud.calls.some(o=>o.changes.some(r=>r.domain==='health'))).toBe(false);
});
test('authenticated older and forked heads reject even with a fabricated newer outer revision',async()=>{
 const s=await setup();await sync(s,{settings:'{"value":1}'});const old=s.cloud.page();await sync(s,{settings:'{"value":2}'});const known=s.journal.state;
 const replay:CloudTransport={read:async()=>({...old,revision:known.revision+10}),write:async()=>{throw Error('No write');}};await expect(cloudSnapshot(replay,s.vault.key,s.vault.manifest,known.revision,['settings'],known.headRevision,known.headDigest)).rejects.toThrow('Older encrypted');
 const page=s.cloud.page(),head=page.records.find(r=>r.id===HEAD)!;head.envelope=await sealRecord(s.vault.key,{vault:s.vault.manifest.vault,object:HEAD,domain:'settings',revision:head.revision,epoch:1},{kind:'zigoals-private-catalog',version:1,domains:{}});await expect(cloudSnapshot({...replay,read:async()=>page},s.vault.key,s.vault.manifest,known.revision,['settings'],known.headRevision,known.headDigest)).rejects.toThrow('fork');
});
test('distinct edits retain original order, a sole reorder survives, differing reorders conflict',()=>{
 const wrap=(widgets:{id:string;title:string}[])=>({settings:JSON.stringify({widgets})});const values=[{id:'z',title:'Z'},{id:'a',title:'A'},{id:'b',title:'B'}],base=wrap(values),local=wrap([{...values[0]!,title:'Local Z'},values[1]!,values[2]!]),remote=wrap([values[0]!,{...values[1]!,title:'Remote A'},values[2]!]);
 expect(JSON.parse(mergePrivateData(base,local,remote).settings!).widgets).toEqual([{id:'z',title:'Local Z'},{id:'a',title:'Remote A'},{id:'b',title:'B'}]);const reordered=wrap([values[2]!,values[0]!,values[1]!]);expect(JSON.parse(mergePrivateData(base,reordered,remote).settings!).widgets.map((w:{id:string})=>w.id)).toEqual(['b','z','a']);expect(()=>mergePrivateData(base,reordered,wrap([values[1]!,values[2]!,values[0]!]))).toThrow('order');
});
test('financial divergence and edit/delete conflicts stop without mutating inputs',()=>{const base={finance:'{"amount":"1"}'},local={finance:'{"amount":"2"}'},remote={finance:'{"amount":"3"}'};expect(()=>mergePrivateData(base,local,remote)).toThrow('financial');expect(base.finance).toBe('{"amount":"1"}');const rows=(items:unknown[])=>({habits:JSON.stringify({items})});expect(()=>mergePrivateData(rows([{id:'1',title:'A'}]),rows([]),rows([{id:'1',title:'Edited'}]))).toThrow('Conflicting');});

test('independent additions to a previously absent optional domain group merge without guessing conflicting values',()=>{
 const wrap=(daily?:unknown)=>({health:JSON.stringify({schemaVersion:1,...(daily?{daily}:{})})});const base=wrap(),a=wrap({water:[{id:'a',amount:250}],preferences:{unit:'ml'}}),b=wrap({water:[{id:'b',amount:500}],preferences:{unit:'ml'}});
 expect(JSON.parse(mergePrivateData(base,a,b).health!).daily.water).toEqual([{id:'a',amount:250},{id:'b',amount:500}]);
 expect(()=>mergePrivateData(base,a,wrap({water:[{id:'a',amount:999}],preferences:{unit:'ml'}}))).toThrow('Conflicting');
 expect(()=>mergePrivateData(base,a,wrap({water:[{id:'b',amount:500}],preferences:{unit:'oz'}}))).toThrow('Conflicting');
});

test('real offline Health additions merge receipts and refuse receipt removal even on equal or unchanged branches',()=>{
 const empty=createEmptyHealth(),at='2026-09-23T12:00:00.000Z',date='2026-09-23',aId=`health_${crypto.randomUUID()}`,bId=`health_${crypto.randomUUID()}`;
 const a=addWater(empty,{id:aId,date,amountMilli:250000,unit:'ml'},at),b=addWater(empty,{id:bId,date,amountMilli:500000,unit:'ml'},at),wrap=(v:unknown)=>({health:JSON.stringify(v)});
 const merged=healthSchema.parse(JSON.parse(mergePrivateData(wrap(empty),wrap(a),wrap(b)).health!));
 expect(merged.daily!.water.reduce((n,w)=>n+w.amountMilli,0)).toBe(750000);expect(new Set(merged.daily!.waterOperations)).toEqual(new Set([aId,bId]));
 expect(addWater(merged,{id:aId,date,amountMilli:250000,unit:'ml'},at)).toEqual(merged);
 for(const field of ['waterOperations','copyOperations'] as const){
  const base={...merged,daily:{...merged.daily!,[field]:[aId]}},removed={...base,daily:{...base.daily,[field]:[]}};
  expect(()=>mergePrivateData(wrap(base),wrap(removed),wrap(base))).toThrow('receipt');
  expect(()=>mergePrivateData(wrap(base),wrap(removed),wrap(removed))).toThrow('receipt');
 }
});


test('a queued operation from before retention policy enforcement is preserved and never transmitted',async()=>{
 const s=await setup();s.cloud.before=async()=>{throw Error('Disconnected');};
 await expect(sync(s,{finance:'{"accepted":"original"}'})).rejects.toThrow('Disconnected');
 // Simulate the exact older persisted shape, including a possibly unsafe encrypted catalog.
 delete (s.journal.state as SyncState & {pendingPolicy?:number}).pendingPolicy;
 const original=structuredClone(s.journal.state);s.cloud.calls=[];s.cloud.before=null;
 await expect(sync(s,{finance:'{"accepted":"original"}'})).rejects.toThrow('older sync policy');
 expect(s.cloud.calls).toEqual([]);expect(s.journal.state).toEqual(original);
});

test('a future queued policy cannot be replayed by an older reader',async()=>{
 const s=await setup();s.cloud.before=async()=>{throw Error('Disconnected');};
 await expect(sync(s,{settings:'{"value":1}'})).rejects.toThrow('Disconnected');
 (s.journal.state as SyncState & {pendingPolicy?:number}).pendingPolicy=999;
 const original=structuredClone(s.journal.state);s.cloud.calls=[];s.cloud.before=null;
 await expect(sync(s,{settings:'{"value":1}'})).rejects.toThrow('newer sync policy');
 expect(s.cloud.calls).toEqual([]);expect(s.journal.state).toEqual(original);
});
