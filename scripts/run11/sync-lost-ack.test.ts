// ADR-006: a head (catalog) write the cloud applied but whose acknowledgement never
// reached the browser. The next sync replays it, loses the prospective base, and a
// local edit made since then reads back as a conflict with this device's own upload.
// docs/architecture/ADR-006-sync-lost-confirmation.md
//
// The `test.fails` cases state the behaviour option A must produce. They fail today,
// so Vitest reports them as expected failures. When the fix lands they pass, Vitest
// turns them red, and the fix PR converts each to a plain `test`. The guard tests pass
// today and must still pass after the fix: real conflicts stay conflicts, a write
// that never applied never advances the base, and the reproduction's preconditions
// hold, so a `test.fails` cannot pass merely because its setup broke.
// Registered in docs/testing/SKIPPED_TESTS.md ("Expected failures").
import 'fake-indexeddb/auto';
import {describe,test,expect} from 'vitest';
import {createVault,type VaultManifest} from '../../apps/web/lib/vault/crypto';
import {cloudSnapshot,synchronize,RevisionConflict,SyncJournal,type CloudOperation,type CloudTransport,type Journal,type PrivateData,type SyncState} from '../../apps/web/lib/vault/cloud-sync';

const HEAD='00000000-0000-4000-8000-000000000001';
type Row=CloudOperation['changes'][number];
class MemoryJournal implements Journal{
 state:SyncState={version:1,base:{},revision:0,headRevision:0,headDigest:null,pending:null};
 async read(){return structuredClone(this.state);}async write(state:SyncState){this.state=structuredClone(state);}
}
// The same idempotent, compare-and-swap cloud as apps/web/lib/vault/cloud-sync.test.ts.
class Cloud implements CloudTransport{
 revision=0;rows=new Map<string,Row>();receipts=new Map<string,{body:string;revision:number}>();calls:CloudOperation[]=[];
 before:((operation:CloudOperation)=>Promise<void>)|null=null;after:((operation:CloudOperation)=>Promise<void>)|null=null;
 constructor(public manifest:VaultManifest){}
 page(){return {protocol:1 as const,revision:this.revision,manifest:this.manifest,records:structuredClone([...this.rows.values()]),cursor:null};}
 async read(){return this.page();}
 async write(input:CloudOperation){const operation=structuredClone(input);this.calls.push(operation);await this.before?.(operation);if(operation.vault!==this.manifest.vault)throw Error('Wrong vault');const body=JSON.stringify(operation),receipt=this.receipts.get(operation.operation);if(receipt){if(receipt.body!==body)throw Error('Operation reused');return {revision:receipt.revision};}if(operation.base!==this.revision)throw new RevisionConflict();for(const row of operation.changes){if(row.revision!==(this.rows.get(row.id)?.revision??0)+1)throw new RevisionConflict();}for(const row of operation.changes)this.rows.set(row.id,row);this.revision++;this.receipts.set(operation.operation,{body,revision:this.revision});await this.after?.(operation);return {revision:this.revision};}
}
const noop=()=>{};
const isHead=(operation:CloudOperation)=>operation.changes.some(r=>r.id===HEAD);
async function setup(){const vault=await createVault();return {vault,cloud:new Cloud(vault.manifest),journal:new MemoryJournal()};}
type Device=Awaited<ReturnType<typeof setup>>;
async function sync(s:Device,data:PrivateData,journal:Journal=s.journal){const result=await synchronize(s.cloud,journal,s.vault.key,s.vault.manifest,data,noop,noop);await result.commit();return result;}
const cloudData=async(s:Device)=>(await cloudSnapshot(s.cloud,s.vault.key,s.vault.manifest)).data;
// The cloud applies this device's next head write, then the response is lost.
async function publishWithLostAck(s:Device,published:PrivateData,committed?:PrivateData){
 if(committed)await sync(s,committed);
 let armed=true;s.cloud.after=async op=>{if(armed&&isHead(op)){armed=false;throw new TypeError('network');}};
 await expect(sync(s,published)).rejects.toThrow('network');s.cloud.after=null;
 return s.journal.state.pending!;
}

const F0='{"fixture":"F0"}',F1='{"fixture":"F1"}',F2='{"fixture":"F2"}',FB='{"fixture":"FB"}';

describe('ADR-006 lost head acknowledgement (expected failures until option A)',()=>{
 test.fails('a finance edit made after a lost acknowledgement syncs without a false financial conflict',async()=>{
  const s=await setup();await publishWithLostAck(s,{finance:F1},{finance:F0});
  const result=await sync(s,{finance:F2});
  expect(result.data.finance).toBe(F2);expect((await cloudData(s)).finance).toBe(F2);expect(s.journal.state).toMatchObject({base:{finance:F2},pending:null});
 });
 test.fails('a first upload whose acknowledgement was lost does not read back as unlinked records',async()=>{
  const s=await setup(),S1='{"value":1}',S2='{"value":2}';await publishWithLostAck(s,{settings:S1});
  const result=await sync(s,{settings:S2});
  expect(result.data.settings).toBe(S2);expect((await cloudData(s)).settings).toBe(S2);expect(s.journal.state).toMatchObject({base:{settings:S2},pending:null});
 });
 test.fails('a field edited again after a lost acknowledgement is a plain local change, not a field conflict',async()=>{
  const s=await setup(),wrap=(x:number)=>({settings:JSON.stringify({x,y:0})});await publishWithLostAck(s,wrap(1),wrap(0));
  const result=await sync(s,wrap(2));
  expect(JSON.parse(result.data.settings!)).toEqual({x:2,y:0});expect(JSON.parse((await cloudData(s)).settings!)).toEqual({x:2,y:0});
 });
});

describe('ADR-006 guards (pass before and after option A)',()=>{
 test('precondition: a lost head acknowledgement leaves the head queued, the cloud updated and the base old',async()=>{
  const s=await setup(),pending=await publishWithLostAck(s,{finance:F1},{finance:F0});
  expect(pending.changes.map(r=>r.id)).toEqual([HEAD]);expect(s.journal.state.pendingPolicy).toBe(2);
  expect(s.journal.state.base).toEqual({finance:F0});expect(await cloudData(s)).toEqual({finance:F1});
  expect(s.cloud.receipts.has(pending.operation)).toBe(true);
 });
 test('identical content after a lost acknowledgement already syncs quietly (ADR-006 option C)',async()=>{
  const s=await setup(),pending=await publishWithLostAck(s,{finance:F1},{finance:F0}),calls=s.cloud.calls.length;
  const result=await sync(s,{finance:F1});
  expect(result.data.finance).toBe(F1);expect(s.journal.state).toMatchObject({base:{finance:F1},pending:null});
  expect(s.cloud.calls.slice(calls).map(o=>o.operation)).toEqual([pending.operation]);
 });
 test('another device\'s newer head after a lost acknowledgement is still a real conflict',async()=>{
  const s=await setup();await sync(s,{finance:F0});const other=new MemoryJournal();other.state=structuredClone(s.journal.state);
  await publishWithLostAck(s,{finance:F1});
  await sync(s,{finance:F0},other);await sync(s,{finance:FB},other);const head=structuredClone(s.cloud.rows.get(HEAD));
  await expect(synchronize(s.cloud,s.journal,s.vault.key,s.vault.manifest,{finance:F2},noop,noop)).rejects.toThrow('Conflicting financial changes');
  expect(s.cloud.rows.get(HEAD)).toEqual(head);expect((await cloudData(s)).finance).toBe(FB);expect(s.journal.state.base).toEqual({finance:F0});
 });
 test('a head write that never applied, overtaken by another device, clears without advancing the base',async()=>{
  const s=await setup();await sync(s,{finance:F0});const other=new MemoryJournal();other.state=structuredClone(s.journal.state);
  let armed=true;s.cloud.before=async op=>{if(armed&&isHead(op)){armed=false;throw new TypeError('network');}};
  await expect(sync(s,{finance:F1})).rejects.toThrow('network');s.cloud.before=null;expect(s.journal.state.pending?.changes.map(r=>r.id)).toEqual([HEAD]);
  await sync(s,{finance:FB},other);
  await expect(synchronize(s.cloud,s.journal,s.vault.key,s.vault.manifest,{finance:F1},noop,noop)).rejects.toThrow(RevisionConflict);
  expect(s.journal.state.pending).toBeNull();expect(s.journal.state.base).toEqual({finance:F0});expect((await cloudData(s)).finance).toBe(FB);
 });
 // Evidence for ADR-006's downgrade note: this build's journal reader is strict, so a
 // build that meets a journal key it does not know refuses the journal as damaged
 // before it reads pendingPolicy, and sends nothing.
 test('a stored journal with a key this build does not know is refused as damaged and nothing is sent',async()=>{
  const s=await setup(),journal=new SyncJournal(crypto.randomUUID());
  await journal.write({version:1,base:{},revision:0,headRevision:0,headDigest:null,pending:null,futureField:true} as SyncState);
  await expect(journal.read()).rejects.toThrow('Sync journal is damaged. Export before recovery.');
  await expect(synchronize(s.cloud,journal,s.vault.key,s.vault.manifest,{finance:F0},noop,noop)).rejects.toThrow('Sync journal is damaged');
  expect(s.cloud.calls).toEqual([]);
 });
});
