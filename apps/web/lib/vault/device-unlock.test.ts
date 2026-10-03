import 'fake-indexeddb/auto';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {createDeviceKey,createVault,unlockVaultForDevice,manifestDigest} from './crypto';
import {DEVICE_DATABASE,bindingOf,dropDevice,forgetCount,forgetDevices,readDevices,rememberDevice,rememberHealth,stillRemembered,type DeviceRecord} from './device-unlock';

// Session M, Part B2 (ADR-008): the remembered record lives in its own IndexedDB database, local only. Reading never
// creates the database; anything this version cannot use is deleted; a forget always wins over a remember in flight.
const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',SESSION='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
async function record(account=A,health=false):Promise<DeviceRecord>{
 const vault=await createVault(),key=await createDeviceKey(),{sealed}=await unlockVaultForDevice(vault.manifest,vault.recovery,account,key);
 return {version:1,account,vault:vault.manifest.vault,epoch:vault.manifest.epoch,manifest:await manifestDigest(vault.manifest),session:SESSION,health,createdAt:new Date().toISOString(),sealed,key};
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
  expect(read!.key.extractable).toBe(false);expect(await stillRemembered(bindingOf(first))).toBe(true);
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
