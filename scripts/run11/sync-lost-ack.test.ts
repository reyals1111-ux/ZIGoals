// ADR-006: a head (catalog) write the cloud applied but whose acknowledgement never
// reached the browser. Before option A2 (Session P, PR 2) the next sync replayed it,
// lost the prospective base, and a local edit made since then read back as a conflict
// with this device's own upload. docs/architecture/ADR-006-sync-lost-confirmation.md
//
// X1-X3 were `test.fails` until A2 landed (docs/testing/SKIPPED_TESTS.md, "Expected
// failures"); they are plain tests now. The guards passed before the fix and still
// pass: real conflicts stay conflicts, a write that never applied never advances the
// base, and the reproduction's preconditions hold.
import 'fake-indexeddb/auto';
import {describe,test,expect} from 'vitest';
import {createVault,type VaultManifest} from '../../apps/web/lib/vault/crypto';
import {cloudSnapshot,synchronize,syncStateSchema,RevisionConflict,SyncJournal,type CloudOperation,type CloudTransport,type Journal,type PrivateData,type SyncConfirmation,type SyncState} from '../../apps/web/lib/vault/cloud-sync';

const HEAD='00000000-0000-4000-8000-000000000001';
type Row=CloudOperation['changes'][number];
class MemoryJournal implements Journal{
 state:SyncState={version:1,base:{},revision:0,headRevision:0,headDigest:null,pending:null};confirmation:SyncConfirmation|null=null;
 async read(){return structuredClone(this.state);}
 async write(state:SyncState,confirmation?:SyncConfirmation|null){this.state=structuredClone(state);if(confirmation!==undefined)this.confirmation=confirmation&&structuredClone(confirmation);}
 async readConfirmation(){return this.confirmation&&structuredClone(this.confirmation);}
}
/** A journal from before A2: it keeps the record only and offers no confirmation. */
class OlderJournal implements Journal{
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
async function setup(journal:Journal=new MemoryJournal()){const vault=await createVault();return {vault,cloud:new Cloud(vault.manifest),journal};}
type Device=Awaited<ReturnType<typeof setup>>;
async function sync(s:Device,data:PrivateData,journal:Journal=s.journal){const result=await synchronize(s.cloud,journal,s.vault.key,s.vault.manifest,data,noop,noop);await result.commit();return result;}
const cloudData=async(s:Device)=>(await cloudSnapshot(s.cloud,s.vault.key,s.vault.manifest)).data;
const state=async(s:Device)=>s.journal.read();
// The cloud applies this device's next head write, then the response is lost.
async function publishWithLostAck(s:Device,published:PrivateData,committed?:PrivateData,journal:Journal=s.journal){
 if(committed)await sync(s,committed,journal);
 let armed=true;s.cloud.after=async op=>{if(armed&&isHead(op)){armed=false;throw new TypeError('network');}};
 await expect(sync(s,published,journal)).rejects.toThrow('network');s.cloud.after=null;
 return (await journal.read()).pending!;
}
const digest=async(raw:string)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw)))].map(v=>v.toString(16).padStart(2,'0')).join('');

const F0='{"fixture":"F0"}',F1='{"fixture":"F1"}',F2='{"fixture":"F2"}',FB='{"fixture":"FB"}';

describe('ADR-006 lost head acknowledgement, fixed by option A2 (X1-X3, plain tests since Session P)',()=>{
 test('X1 a finance edit made after a lost acknowledgement syncs without a false financial conflict',async()=>{
  const s=await setup();await publishWithLostAck(s,{finance:F1},{finance:F0});
  const result=await sync(s,{finance:F2});
  expect(result.data.finance).toBe(F2);expect((await cloudData(s)).finance).toBe(F2);expect(await state(s)).toMatchObject({base:{finance:F2},pending:null});
 });
 test('X2 a first upload whose acknowledgement was lost does not read back as unlinked records',async()=>{
  const s=await setup(),S1='{"value":1}',S2='{"value":2}';await publishWithLostAck(s,{settings:S1});
  const result=await sync(s,{settings:S2});
  expect(result.data.settings).toBe(S2);expect((await cloudData(s)).settings).toBe(S2);expect(await state(s)).toMatchObject({base:{settings:S2},pending:null});
 });
 test('X3 a field edited again after a lost acknowledgement is a plain local change, not a field conflict',async()=>{
  const s=await setup(),wrap=(x:number)=>({settings:JSON.stringify({x,y:0})});await publishWithLostAck(s,wrap(1),wrap(0));
  const result=await sync(s,wrap(2));
  expect(JSON.parse(result.data.settings!)).toEqual({x:2,y:0});expect(JSON.parse((await cloudData(s)).settings!)).toEqual({x:2,y:0});
 });
});

describe('ADR-006 option A2: what the confirmation record does and does not do',()=>{
 test('the head write stores its confirmation beside the journal record and an acknowledged write clears it',async()=>{
  const s=await setup(),journal=s.journal as MemoryJournal;const seen:(SyncConfirmation|null)[]=[];
  s.cloud.before=async op=>{seen.push(journal.confirmation&&structuredClone(journal.confirmation));if(isHead(op))expect(journal.state.pending?.operation).toBe(op.operation);};
  await sync(s,{finance:F0,settings:'{"a":1}'});
  // While the head write was in flight: this operation, the head it expects, and the two sections it publishes unchanged.
  const atHead=seen.at(-1)!;expect(atHead).toMatchObject({version:1,headRevision:1,base:{finance:await digest(F0),settings:await digest('{"a":1}')}});
  expect(atHead.operation).toBe(s.cloud.calls.at(-1)!.operation);expect(atHead.headDigest).toMatch(/^[a-f0-9]{64}$/);
  expect(journal.confirmation).toBeNull();expect(seen.slice(0,-1).every(c=>c===null)).toBe(true);
 });
 test('a section that merged another device\'s edits is not listed and never advances',async()=>{
  const s=await setup(),journal=s.journal as MemoryJournal,wrap=(x:number,y:number)=>JSON.stringify({x,y});
  await sync(s,{finance:F0,settings:wrap(0,0)});const other=new MemoryJournal();other.state=structuredClone(journal.state);
  await sync(s,{finance:F0,settings:wrap(0,1)},other);
  // This device edits x while the cloud already carries y: settings merge, finance is this device's own publication.
  let confirmation:SyncConfirmation|null=null;s.cloud.before=async op=>{if(isHead(op))confirmation=structuredClone(journal.confirmation);};
  await publishWithLostAck(s,{finance:F1,settings:wrap(1,0)});
  expect(Object.keys(confirmation!.base)).toEqual(['finance']);
  const result=await sync(s,{finance:F1,settings:wrap(1,0)});
  // Finance advanced to this device's own bytes; settings kept its old base and merged again, with no conflict.
  expect(result.data.finance).toBe(F1);expect(JSON.parse(result.data.settings!)).toEqual({x:1,y:1});
  expect(JSON.parse((await cloudData(s)).settings!)).toEqual({x:1,y:1});expect(await state(s)).toMatchObject({base:{finance:F1,settings:wrap(1,1)},pending:null});
 });
 test('a stale confirmation for another operation is ignored and cleared: the replay behaves as before A2',async()=>{
  const s=await setup(),journal=s.journal as MemoryJournal;await publishWithLostAck(s,{finance:F1},{finance:F0});
  journal.confirmation={...journal.confirmation!,operation:crypto.randomUUID()};
  await expect(synchronize(s.cloud,s.journal,s.vault.key,s.vault.manifest,{finance:F2},noop,noop)).rejects.toThrow('Conflicting financial changes');
  expect(journal.confirmation).toBeNull();expect(journal.state).toMatchObject({base:{finance:F0},pending:null});
 });
 test('a head that changed since the confirmation applies nothing: the base stays and the real conflict shows',async()=>{
  const s=await setup(),journal=s.journal as MemoryJournal;await sync(s,{finance:F0});const other=new MemoryJournal();other.state=structuredClone(journal.state);
  await publishWithLostAck(s,{finance:F1});expect(journal.confirmation).not.toBeNull();
  await sync(s,{finance:F0},other);await sync(s,{finance:FB},other);
  await expect(synchronize(s.cloud,s.journal,s.vault.key,s.vault.manifest,{finance:F2},noop,noop)).rejects.toThrow('Conflicting financial changes');
  expect(journal.state).toMatchObject({base:{finance:F0},pending:null});expect(journal.confirmation).toBeNull();expect((await cloudData(s)).finance).toBe(FB);
 });
 test('a confirmation never survives a rejected replay',async()=>{
  const s=await setup(),journal=s.journal as MemoryJournal;await sync(s,{finance:F0});const other=new MemoryJournal();other.state=structuredClone(journal.state);
  let armed=true;s.cloud.before=async op=>{if(armed&&isHead(op)){armed=false;throw new TypeError('network');}};
  await expect(sync(s,{finance:F1})).rejects.toThrow('network');s.cloud.before=null;expect(journal.confirmation).not.toBeNull();
  await sync(s,{finance:FB},other);
  await expect(synchronize(s.cloud,s.journal,s.vault.key,s.vault.manifest,{finance:F1},noop,noop)).rejects.toThrow(RevisionConflict);
  expect(journal.confirmation).toBeNull();expect(journal.state).toMatchObject({base:{finance:F0},pending:null});
 });
 test('crash and reopen: the persisted confirmation survives a new journal instance and the replay applies it once',async()=>{
  const account=crypto.randomUUID(),s=await setup(new SyncJournal(account));
  const pending=await publishWithLostAck(s,{finance:F1},{finance:F0});
  const reopened=new SyncJournal(account),stored=await reopened.readConfirmation();
  expect(stored).toMatchObject({version:1,operation:pending.operation,headRevision:2,base:{finance:await digest(F1)}});
  // The journal record itself is unchanged in shape: today's strict reader parses it while the confirmation exists.
  expect(syncStateSchema.safeParse(await reopened.read()).success).toBe(true);
  const result=await synchronize(s.cloud,reopened,s.vault.key,s.vault.manifest,{finance:F2},noop,noop);await result.commit();
  expect(result.data.finance).toBe(F2);expect((await cloudData(s)).finance).toBe(F2);
  expect(await reopened.read()).toMatchObject({base:{finance:F2},pending:null});expect(await reopened.readConfirmation()).toBeNull();
 });
 test('old reads new: a journal from before A2 ignores the companion record and replays as it always did',async()=>{
  // Downgrade story (ADR-006, A2): the record keeps today's shape and policy, so an older build neither refuses it nor
  // gains the fix; the false conflict it always showed is all that remains.
  const s=await setup(new OlderJournal());await publishWithLostAck(s,{finance:F1},{finance:F0});
  expect((await s.journal.read()).pendingPolicy).toBe(2);expect(syncStateSchema.safeParse(await s.journal.read()).success).toBe(true);
  await expect(synchronize(s.cloud,s.journal,s.vault.key,s.vault.manifest,{finance:F2},noop,noop)).rejects.toThrow('Conflicting financial changes');
  expect((await s.journal.read())).toMatchObject({base:{finance:F0},pending:null});
 });
 test('recovery clears the confirmation in its own transaction',async()=>{
  const account=crypto.randomUUID(),journal=new SyncJournal(account),s=await setup(journal);
  const pending=await publishWithLostAck(s,{finance:F1},{finance:F0});expect(await journal.readConfirmation()).not.toBeNull();
  const original=await journal.read();await journal.recover(crypto.randomUUID(),original,{...original,pending:null},noop);
  expect(await journal.readConfirmation()).toBeNull();expect((await journal.read()).pending).toBeNull();expect(pending.operation).toBeTruthy();
 });
});

describe('ADR-006 guards (passed before A2 and still pass)',()=>{
 test('precondition: a lost head acknowledgement leaves the head queued, the cloud updated and the base old',async()=>{
  const s=await setup(),pending=await publishWithLostAck(s,{finance:F1},{finance:F0});
  expect(pending.changes.map(r=>r.id)).toEqual([HEAD]);expect((await state(s)).pendingPolicy).toBe(2);
  expect((await state(s)).base).toEqual({finance:F0});expect(await cloudData(s)).toEqual({finance:F1});
  expect(s.cloud.receipts.has(pending.operation)).toBe(true);
 });
 test('identical content after a lost acknowledgement already syncs quietly (ADR-006 option C)',async()=>{
  const s=await setup(),pending=await publishWithLostAck(s,{finance:F1},{finance:F0}),calls=s.cloud.calls.length;
  const result=await sync(s,{finance:F1});
  expect(result.data.finance).toBe(F1);expect(await state(s)).toMatchObject({base:{finance:F1},pending:null});
  expect(s.cloud.calls.slice(calls).map(o=>o.operation)).toEqual([pending.operation]);
 });
 test('another device\'s newer head after a lost acknowledgement is still a real conflict',async()=>{
  const s=await setup();await sync(s,{finance:F0});const other=new MemoryJournal();other.state=structuredClone((s.journal as MemoryJournal).state);
  await publishWithLostAck(s,{finance:F1});
  await sync(s,{finance:F0},other);await sync(s,{finance:FB},other);const head=structuredClone(s.cloud.rows.get(HEAD));
  await expect(synchronize(s.cloud,s.journal,s.vault.key,s.vault.manifest,{finance:F2},noop,noop)).rejects.toThrow('Conflicting financial changes');
  expect(s.cloud.rows.get(HEAD)).toEqual(head);expect((await cloudData(s)).finance).toBe(FB);expect((await state(s)).base).toEqual({finance:F0});
 });
 test('a head write that never applied, overtaken by another device, clears without advancing the base',async()=>{
  const s=await setup();await sync(s,{finance:F0});const other=new MemoryJournal();other.state=structuredClone((s.journal as MemoryJournal).state);
  let armed=true;s.cloud.before=async op=>{if(armed&&isHead(op)){armed=false;throw new TypeError('network');}};
  await expect(sync(s,{finance:F1})).rejects.toThrow('network');s.cloud.before=null;expect((await state(s)).pending?.changes.map(r=>r.id)).toEqual([HEAD]);
  await sync(s,{finance:FB},other);
  await expect(synchronize(s.cloud,s.journal,s.vault.key,s.vault.manifest,{finance:F1},noop,noop)).rejects.toThrow(RevisionConflict);
  expect((await state(s)).pending).toBeNull();expect((await state(s)).base).toEqual({finance:F0});expect((await cloudData(s)).finance).toBe(FB);
 });
 // Evidence for ADR-006's downgrade note: this build's journal reader is strict, so a
 // build that meets a journal key it does not know refuses the journal as damaged
 // before it reads pendingPolicy, and sends nothing. A2 adds no key to the record.
 test('a stored journal with a key this build does not know is refused as damaged and nothing is sent',async()=>{
  const s=await setup(),journal=new SyncJournal(crypto.randomUUID());
  await journal.write({version:1,base:{},revision:0,headRevision:0,headDigest:null,pending:null,futureField:true} as SyncState);
  await expect(journal.read()).rejects.toThrow('Sync journal is damaged. Export before recovery.');
  await expect(synchronize(s.cloud,journal,s.vault.key,s.vault.manifest,{finance:F0},noop,noop)).rejects.toThrow('Sync journal is damaged');
  expect(s.cloud.calls).toEqual([]);
 });
});
