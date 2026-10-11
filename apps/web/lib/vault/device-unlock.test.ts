import 'fake-indexeddb/auto';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {createDeviceKey,createVault,deviceCommitment,unlockVaultForDevice,manifestDigest,sealDigest} from './crypto';
import {DEVICE_DATABASE,bindingOf,confirmDevice,dropDevice,forgetCount,forgetDevices,readDevices,rememberDevice,rememberDeviceRecord,rememberHealth,replaceDevice,stillRemembered,type DeviceRecordV1,type DeviceRecordV2} from './device-unlock';

// Session M, Part B2 (ADR-008): the remembered record lives in its own IndexedDB database, local only. Reading never
// creates the database; anything this version cannot use is deleted; a forget always wins over a remember in flight.
const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',SESSION='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
async function record(account=A,health=false):Promise<DeviceRecordV1>{
 const vault=await createVault(),key=await createDeviceKey(),{sealed}=await unlockVaultForDevice(vault.manifest,vault.recovery,account,key);
 return {version:1,account,vault:vault.manifest.vault,epoch:vault.manifest.epoch,manifest:await manifestDigest(vault.manifest),session:SESSION,health,createdAt:new Date().toISOString(),sealed,key};
}
/** Session U Part 5 (B1): a version 2 record, the root itself; `from` makes it the migration of a version 1 record. */
async function recordV2(account=A,health=false,from?:DeviceRecordV1):Promise<DeviceRecordV2>{
 const vault=await createVault(),manifest=from?.manifest??await manifestDigest(vault.manifest);
 return {version:2,id:crypto.randomUUID(),account,vault:from?.vault??vault.manifest.vault,epoch:from?.epoch??vault.manifest.epoch,manifest,session:SESSION,health,createdAt:new Date().toISOString(),commitment:await deviceCommitment(vault.key,account,manifest),...(from?{migratedFrom:await sealDigest(from.sealed)}:{}),root:vault.key};
}
const listed=async()=>(await indexedDB.databases()).some(db=>db.name===DEVICE_DATABASE);
async function raw(write?:(store:IDBObjectStore)=>void){
 const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open(DEVICE_DATABASE,1);r.onupgradeneeded=()=>{r.result.createObjectStore('devices');r.result.createObjectStore('state');};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 if(write)await new Promise<void>((resolve,reject)=>{const t=db.transaction('devices','readwrite');write(t.objectStore('devices'));t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error);});
 db.close();
}
afterEach(async()=>{vi.restoreAllMocks();await new Promise<void>(resolve=>{const r=indexedDB.deleteDatabase(DEVICE_DATABASE);r.onsuccess=r.onerror=r.onblocked=()=>resolve();});});

describe('remembered device records',()=>{
 it('reading, counting and forgetting on a browser that never remembered creates nothing',async()=>{
  expect(await readDevices()).toEqual([]);expect(await forgetCount()).toBe(0);await forgetDevices();
  expect(await stillRemembered({account:A,sealed:{iv:'A'.repeat(16),ciphertext:'A'.repeat(64)}})).toBe(false);
  expect(await listed()).toBe(false);
 });
 it('without a list of databases, an open that would create the database is abandoned',async()=>{
  Object.defineProperty(indexedDB,'databases',{value:undefined,configurable:true});
  try{expect(await readDevices()).toEqual([]);expect(await forgetCount()).toBe(0);}
  finally{delete (indexedDB as {databases?:unknown}).databases;}
  expect(await listed()).toBe(false);
 });
 it('stores one record, reads it back with a usable key, and keeps one account at most',async()=>{
  const first=await record(A);expect(await rememberDevice(first,0)).toBe(true);
  const [read]=await readDevices();expect(bindingOf(read!)).toEqual(bindingOf(first));
  if(!read||read.version!==1)throw Error('expected version 1');
  expect(read.key.extractable).toBe(false);expect(await stillRemembered(bindingOf(first))).toBe(true);
  const second=await record(B);expect(await rememberDevice(second,0)).toBe(true);
  expect((await readDevices()).map(r=>r.account)).toEqual([B]);
  expect(await stillRemembered(bindingOf(first))).toBe(false);
 });
 it('a forget wins over a remember that read the count before it',async()=>{
  const before=await forgetCount(),item=await record();
  await rememberDevice(await record(),before);await forgetDevices();
  expect(await forgetCount()).toBe(before+1);expect(await readDevices()).toEqual([]);
  // The remember that started before the forget is refused and stores nothing.
  expect(await rememberDevice(item,before)).toBe(false);expect(await readDevices()).toEqual([]);
  expect(await rememberDevice(item,before+1)).toBe(true);expect(await readDevices()).toHaveLength(1);
 });
 it('deletes only the exact record it was asked to, and updates the Health choice of that record only',async()=>{
  const item=await record(A,true),other=await record(A,true);await rememberDevice(item,0);
  await dropDevice(bindingOf(other));expect(await readDevices()).toHaveLength(1);
  await rememberHealth(bindingOf(other),false);expect((await readDevices())[0]!.health).toBe(true);
  await rememberHealth(bindingOf(item),false);expect((await readDevices())[0]!.health).toBe(false);
  await dropDevice(bindingOf(item));expect(await readDevices()).toEqual([]);
 });
 it('deletes what this version cannot use: another version, a bad field, or a key that could be exported or decrypt',async()=>{
  const good=await record(A),extractable=await crypto.subtle.generateKey({name:'AES-GCM',length:256},true,['encrypt','unwrapKey']),decrypts=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt','unwrapKey']);
  for(const bad of [{...good,version:2},{...good,epoch:0},{...good,session:'not-a-session'},{...good,key:extractable},{...good,key:decrypts},{...good,key:'raw bytes'},{...good,extra:true},{...good,account:A.toUpperCase()}]){
   await raw(store=>store.put(bad,A));
   expect(await readDevices()).toEqual([]);
   await raw(store=>expect(store).toBeTruthy());
   const left=await new Promise<unknown>(resolve=>{const r=indexedDB.open(DEVICE_DATABASE);r.onsuccess=()=>{const g=r.result.transaction('devices').objectStore('devices').get(A);g.onsuccess=()=>{r.result.close();resolve(g.result);};};});
   expect(left).toBeUndefined();
  }
  // A record stored under another account's key is not used either.
  await raw(store=>store.put(good,B));expect(await readDevices()).toEqual([]);
 });
 it('refuses to store a record that does not validate',async()=>{
  const item=await record();
  await expect(rememberDevice({...item,session:'nope'},0)).rejects.toThrow('This device could not be remembered.');
  expect(await listed()).toBe(false);
 });
});

// Session U Part 5 (B1, FINDINGS Q-SYNC-01): version 2 records keep the root itself; a version 1 record is replaced by
// compare-and-swap, and a tab that opened with the version 1 record still recognises the record migrated from it.
describe('remembered device records, version 2',()=>{
 it('stores the root key itself: not extractable, deriveKey only, with no key that can unwrap anything',async()=>{
  const item=await recordV2(A);expect(await rememberDevice(item,0)).toBe(true);
  const [read]=await readDevices();expect(read!.version).toBe(2);expect(bindingOf(read!)).toEqual(bindingOf(item));
  if(!read||read.version!==2)throw Error('expected version 2');
  expect(read.root.extractable).toBe(false);expect(read.root.algorithm.name).toBe('HKDF');expect([...read.root.usages]).toEqual(['deriveKey']);
  await expect(crypto.subtle.exportKey('raw',read.root)).rejects.toThrow();
  expect(Object.keys(read).sort()).toEqual(['account','commitment','createdAt','epoch','health','id','manifest','root','session','vault','version']);
  expect(await confirmDevice(item)).toBe(true);expect(await stillRemembered(bindingOf(item))).toBe(true);
 });
 it('deletes a version 2 record it cannot use: an exportable or wrong root, a bad field, a missing commitment',async()=>{
  const good=await recordV2(A),aes=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  const {commitment:_commitment,...uncommitted}=good;void _commitment;
  for(const bad of [{...good,root:aes},{...good,root:'raw bytes'},{...good,id:'not-an-id'},uncommitted,{...good,extra:true},{...good,sealed:{iv:'A'.repeat(16),ciphertext:'A'.repeat(64)}},{...good,account:A.toUpperCase()}]){
   await raw(store=>store.put(bad,A));expect(await readDevices()).toEqual([]);
  }
  // An HKDF root imported as usable for more than deriveKey is not what an open makes either.
  const wider=await crypto.subtle.importKey('raw',new Uint8Array(32),'HKDF',false,['deriveKey','deriveBits']);
  await raw(store=>store.put({...good,root:wider},A));expect(await readDevices()).toEqual([]);
 });
 it('confirms only a root that still derives its commitment',async()=>{
  const item=await recordV2(A),other=await createVault();
  await raw(store=>store.put({...item,root:other.key},A));
  expect((await readDevices())).toHaveLength(1);expect(await confirmDevice(item)).toBe(false);
 });
 it('migration: compare-and-swap from exactly that version 1 record; the version 1 binding still finds the new record',async()=>{
  const v1=await record(A,true);await rememberDevice(v1,0);
  const v2=await recordV2(A,true,v1);
  // Another record in between wins: nothing is replaced.
  expect(await replaceDevice(bindingOf(await record(A)) as DeviceRecordV1,v2)).toBe(false);expect((await readDevices())[0]!.version).toBe(1);
  expect(await replaceDevice(bindingOf(v1) as DeviceRecordV1,v2)).toBe(true);expect(await confirmDevice(v2)).toBe(true);
  const [read]=await readDevices();expect(read!.version).toBe(2);
  // A tab that opened with the version 1 record: its binding (the seal) still finds and updates the migrated record.
  expect(await stillRemembered(bindingOf(v1))).toBe(true);
  await rememberHealth(bindingOf(v1),false);expect((await readDevices())[0]!.health).toBe(false);
  await dropDevice(bindingOf(v1));expect(await readDevices()).toEqual([]);
  // After a forget, a late migration replaces nothing.
  await rememberDevice(v1,await forgetCount());await forgetDevices();expect(await replaceDevice(bindingOf(v1) as DeviceRecordV1,v2)).toBe(false);expect(await readDevices()).toEqual([]);
 });
 it('a failed write keeps the record that was there, and taking a migration back restores version 1 exactly',async()=>{
  const v1=await record(A);await rememberDevice(v1,0);const v2=await recordV2(A,false,v1);
  const put=IDBObjectStore.prototype.put;
  vi.spyOn(IDBObjectStore.prototype,'put').mockImplementation(function(this:IDBObjectStore,...args:Parameters<IDBObjectStore['put']>){if((args[0] as {version?:number})?.version===2)throw new DOMException('The object could not be cloned.','DataCloneError');return put.apply(this,args);});
  // The browser refuses to store the key object: the transaction aborts (or the put never happens), so nothing changes.
  expect([false,'refused']).toContain(await replaceDevice(bindingOf(v1) as DeviceRecordV1,v2).then(value=>value,()=>'refused'));
  vi.restoreAllMocks();
  const [kept]=await readDevices();expect(kept!.version).toBe(1);expect(bindingOf(kept!)).toEqual(bindingOf(v1));
  expect(await replaceDevice(bindingOf(v1) as DeviceRecordV1,v2)).toBe(true);
  expect(await replaceDevice(v2,v1)).toBe(true);expect(bindingOf((await readDevices())[0]!)).toEqual(bindingOf(v1));
 });
 it('a version 2 binding matches by id only, never by account alone',async()=>{
  const first=await recordV2(A),second=await recordV2(A);await rememberDevice(first,0);
  expect(await stillRemembered(bindingOf(second))).toBe(false);await dropDevice(bindingOf(second));expect(await readDevices()).toHaveLength(1);
  await rememberHealth(bindingOf(second),true);expect((await readDevices())[0]!.health).toBe(false);
  expect(await stillRemembered(bindingOf(first))).toBe(true);
 });
});
describe('a new remember (B1)',()=>{
 it('is version 2 where the browser keeps the key object, version 1 where it does not, and nothing after a forget',async()=>{
  const v1=await record(A),v2=await recordV2(A);
  expect(await rememberDeviceRecord(v2,v1,0)).toBe(v2);expect((await readDevices())[0]!.version).toBe(2);
  await forgetDevices();
  const put=IDBObjectStore.prototype.put;
  vi.spyOn(IDBObjectStore.prototype,'put').mockImplementation(function(this:IDBObjectStore,...args:Parameters<IDBObjectStore['put']>){if((args[0] as {version?:number})?.version===2)throw new DOMException('The object could not be cloned.','DataCloneError');return put.apply(this,args);});
  expect(await rememberDeviceRecord(v2,v1,1)).toBe(v1);vi.restoreAllMocks();
  const [kept]=await readDevices();expect(kept!.version).toBe(1);expect(bindingOf(kept!)).toEqual(bindingOf(v1));
  // A forget that ran after the count was read wins over both versions.
  expect(await rememberDeviceRecord(v2,v1,0)).toBeNull();expect(bindingOf((await readDevices())[0]!)).toEqual(bindingOf(v1));
 });
});
