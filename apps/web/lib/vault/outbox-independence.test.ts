// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,test,vi} from 'vitest';
import {activateAccount,clearAccountSession,unlockAccount} from '../account-session';
import {getAppStorage} from '../showcase-storage';
import {captureData,modules} from './account-data';
import {localDatabase} from './local';
import {createVault} from './crypto';
import {cloudSnapshot,synchronize,RevisionConflict,type CloudOperation,type CloudTransport,type Journal,type SyncState,type Domain} from './cloud-sync';
import {financeV3,habitsV2,healthV1,settingsV1} from './format-fixtures';

/**
 * Session Y Part 5, FIX_PLAN B5, owner edit 2 (ADR-018): before any outbox entry is skipped or swept, prove that sync
 * never needs one. The upload is built from each section's whole current state on this device (captureData), never from
 * the outbox; the outbox is only acknowledged after the upload. So a section that was never synced, whose outbox is
 * empty (or was never written), still uploads every record it holds when sync is turned on later. This file runs
 * unchanged against #34 (`e30b7c6`) from a worktree; the result is in the STATUS entry.
 */
const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',DOMAINS:Domain[]=['finance','habits','health','settings'];
const RECORDS={finance:financeV3(),habits:habitsV2(),health:healthV1(),settings:settingsV1()};
type Row=CloudOperation['changes'][number];
class MemoryJournal implements Journal{state:SyncState={version:1,base:{},revision:0,headRevision:0,headDigest:null,pending:null};async read(){return structuredClone(this.state);}async write(state:SyncState){this.state=structuredClone(state);}}
function memoryCloud(manifest:Awaited<ReturnType<typeof createVault>>['manifest']):CloudTransport{
 let revision=0;const rows=new Map<string,Row>();
 return {read:async()=>({protocol:1 as const,revision,manifest,records:structuredClone([...rows.values()]),cursor:null}),
  write:async operation=>{if(operation.base!==revision)throw new RevisionConflict();for(const row of operation.changes)rows.set(row.id,structuredClone(row));return {revision:++revision};}};
}
/** Every outbox entry in the private database, read straight from IndexedDB. */
function outbox(){return new Promise<unknown[]>((resolve,reject)=>{const open=indexedDB.open('zigoals-private-vault-v1');open.onsuccess=()=>{const db=open.result,r=db.transaction('outbox').objectStore('outbox').getAll();r.onsuccess=()=>{db.close();resolve(r.result);};r.onerror=()=>reject(r.error);};open.onerror=()=>reject(open.error);});}
function clearOutbox(){return new Promise<void>((resolve,reject)=>{const open=indexedDB.open('zigoals-private-vault-v1');open.onsuccess=()=>{const db=open.result,t=db.transaction('outbox','readwrite');t.objectStore('outbox').clear();t.oncomplete=()=>{db.close();resolve();};t.onerror=()=>reject(t.error);};open.onerror=()=>reject(open.error);});}
beforeEach(()=>{vi.stubGlobal('navigator',{locks:{request:async(_key:string,work:()=>unknown)=>work()}});});
afterEach(()=>{clearAccountSession();localStorage.clear();vi.unstubAllGlobals();});

test('turning sync on later uploads every current record of a section whose outbox is empty',async()=>{
 activateAccount(A);unlockAccount();const storage=getAppStorage();
 for(const d of DOMAINS)storage.setItem(modules[d].key,JSON.stringify(RECORDS[d]));
 // The first capture moves each section into the private database, as the app does on first use.
 const first=await captureData(storage,DOMAINS);
 expect((await localDatabase.pending(`account:${A}`)).length).toBeGreaterThan(0);
 // The person never synced: now their outbox is gone entirely (what B5's sweep or a never-written entry leaves).
 await clearOutbox();expect(await outbox()).toEqual([]);
 const captured=await captureData(storage,DOMAINS);
 expect(captured).toEqual(first);
 for(const d of DOMAINS)expect(JSON.parse(captured[d]!),d).toEqual(JSON.parse(JSON.stringify(modules[d].schema.parse(RECORDS[d]))));
 // Sync turned on for the first time: the cloud receives the whole of every section, read back with the vault key.
 const vault=await createVault(),cloud=memoryCloud(vault.manifest),journal=new MemoryJournal();
 const result=await synchronize(cloud,journal,vault.key,vault.manifest,captured,()=>{},()=>{});await result.commit();
 expect((await cloudSnapshot(cloud,vault.key,vault.manifest)).data).toEqual(captured);
 expect(journal.state.base).toEqual(captured);
});
