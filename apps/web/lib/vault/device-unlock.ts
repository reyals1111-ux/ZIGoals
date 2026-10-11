/**
 * Remember this device (ADR-008). At most one record, for the account this browser last remembered, in its own IndexedDB
 * database: the account, vault, epoch, manifest digest and server session it is bound to, whether Health sync was on,
 * and the root: version 2 (Session U Part 5, B1) stores the root itself as a non-extractable HKDF key with its commitment;
 * version 1 stored the sealed root with a device key that could unwrap it, and is migrated on its next open. Local only:
 * nothing here is sent anywhere and nothing is written to localStorage. Reading never creates the database and gives up
 * after a time limit (a first open can hang in Safari, see database.ts), so a browser that cannot answer simply counts as
 * not remembered. The database and its stores keep version 1: a build before this one deletes a version 2 record as one
 * it cannot use, and then asks for the recovery secret once.
 */
import * as z from 'zod';
import {deviceCommitmentMatches,epochSchema,sealDigest,sealedRootSchema} from './crypto';

export const DEVICE_DATABASE='zigoals-device-unlock-v1';
const DEVICES='devices',STATE='state',FORGETS='forgets',LIMIT_MS=3000;
const digest=z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const deviceRecordSchema=z.object({version:z.literal(1),account:z.uuid(),vault:z.uuid(),epoch:epochSchema,manifest:digest,session:z.uuid(),health:z.boolean(),createdAt:z.iso.datetime(),sealed:sealedRootSchema}).strict();
/** Version 2: the same bindings, a random id, the root's commitment and, when migrated, the version 1 seal's digest. */
export const deviceRecordV2Schema=z.object({version:z.literal(2),id:z.uuid(),account:z.uuid(),vault:z.uuid(),epoch:epochSchema,manifest:digest,session:z.uuid(),health:z.boolean(),createdAt:z.iso.datetime(),commitment:digest,migratedFrom:digest.optional()}).strict();
export type DeviceBindingV1=z.infer<typeof deviceRecordSchema>;
export type DeviceBindingV2=z.infer<typeof deviceRecordV2Schema>;
export type DeviceBinding=DeviceBindingV1|DeviceBindingV2;
export type DeviceRecordV1=DeviceBindingV1&{key:CryptoKey};
export type DeviceRecordV2=DeviceBindingV2&{root:CryptoKey};
export type DeviceRecord=DeviceRecordV1|DeviceRecordV2;
/** What names one remember: its seal (version 1; a version 2 record migrated from that seal counts too) or its id. */
export type DeviceIdentity=Pick<DeviceBindingV1,'account'|'sealed'>|Pick<DeviceBindingV2,'account'|'id'>;

/** The device key must be what createDeviceKey makes: AES-GCM 256, not extractable, able to seal and unwrap only. */
function deviceKey(key:unknown):key is CryptoKey{
 if(typeof CryptoKey==='undefined'||!(key instanceof CryptoKey))return false;
 const algorithm=key.algorithm as AesKeyAlgorithm;
 return key.type==='secret'&&!key.extractable&&algorithm.name==='AES-GCM'&&algorithm.length===256&&[...key.usages].sort().join(',')==='encrypt,unwrapKey';
}
/** A version 2 root must be what opening the vault makes: HKDF, not extractable, deriveKey only. */
function storedRoot(key:unknown):key is CryptoKey{
 if(typeof CryptoKey==='undefined'||!(key instanceof CryptoKey))return false;
 return key.type==='secret'&&!key.extractable&&key.algorithm.name==='HKDF'&&[...key.usages].join(',')==='deriveKey';
}
/** A stored value as a record, or null when this version cannot use it. */
export function deviceRecord(value:unknown):DeviceRecord|null{
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 if((value as {version?:unknown}).version===2){
  const {root,...meta}=value as Record<string,unknown>,parsed=deviceRecordV2Schema.safeParse(meta);
  return parsed.success&&storedRoot(root)&&parsed.data.account===parsed.data.account.toLowerCase()?{...parsed.data,root}:null;
 }
 const {key,...meta}=value as Record<string,unknown>,parsed=deviceRecordSchema.safeParse(meta);
 return parsed.success&&deviceKey(key)&&parsed.data.account===parsed.data.account.toLowerCase()?{...parsed.data,key}:null;
}
/** What a record is bound to, without its key: kept by an open vault to recognise its own record later. */
export function bindingOf(record:DeviceRecord):DeviceBinding{
 if(record.version===2){const {root,...binding}=record;void root;return binding;}
 const {key,...binding}=record;void key;return binding;
}
/** The seal digest of a version 1 identity, computed before a transaction opens (an await inside one would end it). */
const sealOf=async(expected:DeviceIdentity)=>'sealed' in expected?sealDigest(expected.sealed).catch(()=>null):null;
/**
 * Whether a stored value is this remember: the same version 2 id; or the same seal (its IV is random for every seal), or
 * the version 2 record migrated from that seal, so a tab that opened with the version 1 record still finds it.
 */
const sameRemember=(value:unknown,expected:DeviceIdentity,seal:string|null)=>{
 const v=value as {account?:unknown;version?:unknown;id?:unknown;migratedFrom?:unknown;sealed?:{iv?:unknown;ciphertext?:unknown}}|undefined;
 if(v?.account!==expected.account)return false;
 if('id' in expected)return v.version===2&&v.id===expected.id;
 return v.sealed?.iv===expected.sealed.iv&&v.sealed?.ciphertext===expected.sealed.ciphertext||seal!==null&&v.version===2&&v.migratedFrom===seal;
};

function limited<T>(work:Promise<T>,late:(value:T)=>void):Promise<T>{
 return new Promise((resolve,reject)=>{
  let settled=false;const timer=setTimeout(()=>{settled=true;reject(Error('Device storage did not answer in time.'));},LIMIT_MS);
  work.then(value=>{clearTimeout(timer);if(settled)late(value);else{settled=true;resolve(value);}},error=>{clearTimeout(timer);if(!settled){settled=true;reject(error);}});
 });
}
const answer=<T>(r:IDBRequest<T>)=>new Promise<T>((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
const finished=(t:IDBTransaction)=>new Promise<void>((resolve,reject)=>{t.oncomplete=()=>resolve();t.onabort=()=>reject(t.error??Error('Device storage refused the change.'));t.onerror=()=>{};});
const available=()=>typeof indexedDB!=='undefined'&&!!indexedDB;

/** The database if it already exists, never creating it: null when this browser has never remembered a device. */
async function existing():Promise<IDBDatabase|null>{
 if(!available())return null;
 if(typeof indexedDB.databases==='function'&&!(await limited(indexedDB.databases(),()=>{})).some(d=>d.name===DEVICE_DATABASE))return null;
 return limited(new Promise<IDBDatabase|null>((resolve,reject)=>{
  let missing=false,request:IDBOpenDBRequest;
  try{request=indexedDB.open(DEVICE_DATABASE);}catch(error){reject(error);return;}
  // Where the list of databases is unavailable, an open that would create the database is abandoned instead.
  request.onupgradeneeded=event=>{if(event.oldVersion===0){missing=true;request.transaction?.abort();}};
  request.onerror=event=>{if(missing){event.preventDefault();resolve(null);}else reject(request.error);};
  request.onsuccess=()=>{const db=request.result;if(!db.objectStoreNames.contains(DEVICES)||!db.objectStoreNames.contains(STATE)){db.close();resolve(null);return;}db.onversionchange=()=>db.close();resolve(db);};
 }),db=>db?.close());
}
function writable():Promise<IDBDatabase>{
 if(!available())return Promise.reject(Error('Device storage is unavailable in this browser.'));
 return limited(new Promise<IDBDatabase>((resolve,reject)=>{
  let request:IDBOpenDBRequest;
  try{request=indexedDB.open(DEVICE_DATABASE,1);}catch(error){reject(error);return;}
  request.onupgradeneeded=()=>{const db=request.result;for(const name of [DEVICES,STATE])if(!db.objectStoreNames.contains(name))db.createObjectStore(name);};
  request.onerror=()=>reject(request.error);
  request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>db.close();resolve(db);};
 }),db=>db.close());
}

/** The usable remembered records (at most one is expected). A record this version cannot use is deleted. */
export async function readDevices():Promise<DeviceRecord[]>{
 const db=await existing();if(!db)return [];
 try{
  const store=db.transaction(DEVICES,'readonly').objectStore(DEVICES),[keys,values]=await Promise.all([answer(store.getAllKeys()),answer(store.getAll())]);
  const records:DeviceRecord[]=[],unusable:IDBValidKey[]=[];
  values.forEach((value,index)=>{const record=deviceRecord(value);if(record&&record.account===keys[index])records.push(record);else unusable.push(keys[index]!);});
  if(unusable.length){
   // Removed only if still unusable when deleted: a remember that landed meanwhile stays.
   const t=db.transaction(DEVICES,'readwrite'),writer=t.objectStore(DEVICES);
   for(const key of unusable){const current=writer.get(key);current.onsuccess=()=>{if(!deviceRecord(current.result))writer.delete(key);};}
   await finished(t).catch(()=>{});
  }
  return records;
 }finally{db.close();}
}
/** How many forgets this browser recorded. Read before sealing, so a forget that runs meanwhile wins. */
export async function forgetCount():Promise<number>{
 const db=await existing();if(!db)return 0;
 try{const value=await answer(db.transaction(STATE,'readonly').objectStore(STATE).get(FORGETS));return typeof value==='number'?value:0;}finally{db.close();}
}
/** Stores this device's record in place of any other. Refused (false) when a forget ran since `forgets` was read. */
export async function rememberDevice(record:DeviceRecord,forgets:number):Promise<boolean>{
 if(!deviceRecord(record))throw Error('This device could not be remembered.');
 const db=await writable();
 try{
  const t=db.transaction([DEVICES,STATE],'readwrite'),devices=t.objectStore(DEVICES),counter=t.objectStore(STATE).get(FORGETS);let refused=false;
  counter.onsuccess=()=>{if((typeof counter.result==='number'?counter.result:0)!==forgets){refused=true;return;}devices.clear();devices.put(record,record.account);};
  await finished(t);return !refused;
 }finally{db.close();}
}
/** Forgets every remembered record on this browser: sign-out, another account, Lock now, Forget this device. */
export async function forgetDevices():Promise<void>{
 const db=await existing();if(!db)return;
 try{
  const t=db.transaction([DEVICES,STATE],'readwrite'),state=t.objectStore(STATE),counter=state.get(FORGETS);
  counter.onsuccess=()=>{state.put((typeof counter.result==='number'?counter.result:0)+1,FORGETS);};t.objectStore(DEVICES).clear();
  await finished(t);
 }finally{db.close();}
}
/** Deletes exactly this record if it is still the stored one, so a late answer never removes a newer remember. */
export async function dropDevice(expected:DeviceIdentity):Promise<void>{
 const seal=await sealOf(expected),db=await existing();if(!db)return;
 try{
  const t=db.transaction(DEVICES,'readwrite'),store=t.objectStore(DEVICES),current=store.get(expected.account);
  current.onsuccess=()=>{if(sameRemember(current.result,expected,seal))store.delete(expected.account);};
  await finished(t);
 }finally{db.close();}
}
/** Updates the remembered Health choice of exactly this record (Health turned on or off on a remembered device). */
export async function rememberHealth(expected:DeviceIdentity,health:boolean):Promise<void>{
 const seal=await sealOf(expected),db=await existing();if(!db)return;
 try{
  const t=db.transaction(DEVICES,'readwrite'),store=t.objectStore(DEVICES),current=store.get(expected.account);
  current.onsuccess=()=>{if(sameRemember(current.result,expected,seal))store.put({...(current.result as object),health},expected.account);};
  await finished(t);
 }finally{db.close();}
}
/** Whether this exact record is still stored (the idle check: another tab may have forgotten the device). */
export async function stillRemembered(expected:DeviceIdentity):Promise<boolean>{
 const seal=await sealOf(expected),db=await existing();if(!db)return false;
 try{return sameRemember(await answer(db.transaction(DEVICES,'readonly').objectStore(DEVICES).get(expected.account)),expected,seal);}finally{db.close();}
}
/**
 * Session U Part 5 (B1): stores `next` in place of exactly `expected` (compare-and-swap), for the migration of a version 1
 * record and for taking it back. False when a forget, another remember or a change landed first; an error (for example
 * a browser that cannot store the key object) aborts the transaction, so the stored record stays as it was.
 */
export async function replaceDevice(expected:DeviceIdentity,next:DeviceRecord):Promise<boolean>{
 if(!deviceRecord(next)||next.account!==expected.account)throw Error('This device could not be remembered.');
 const seal=await sealOf(expected),db=await existing();if(!db)return false;
 try{
  const t=db.transaction(DEVICES,'readwrite'),store=t.objectStore(DEVICES),current=store.get(expected.account);let replaced=false;
  current.onsuccess=()=>{if(sameRemember(current.result,expected,seal)){store.put(next,next.account);replaced=true;}};
  await finished(t);return replaced;
 }finally{db.close();}
}
/**
 * Session U Part 5 (B1): stores a new remember as version 2 where this browser keeps the key object and reads it back
 * intact; otherwise as version 1 (owner decision: such a browser keeps version 1). Both are refused (null) when a forget
 * ran since `forgets` was read. Answers the record that is stored.
 */
export async function rememberDeviceRecord(v2:DeviceRecordV2,v1:DeviceRecordV1,forgets:number):Promise<DeviceRecord|null>{
 const stored=await rememberDevice(v2,forgets).catch(()=>false);
 if(stored&&await confirmDevice(v2).catch(()=>false))return v2;
 return await rememberDevice(v1,forgets)?v1:null;
}
/** Reads back exactly this version 2 record: still stored, still valid, and its stored root derives its commitment. */
export async function confirmDevice(expected:Pick<DeviceBindingV2,'account'|'id'>):Promise<boolean>{
 const db=await existing();if(!db)return false;
 let value:unknown;try{value=await answer(db.transaction(DEVICES,'readonly').objectStore(DEVICES).get(expected.account));}finally{db.close();}
 const record=deviceRecord(value);
 return record?.version===2&&record.id===expected.id&&await deviceCommitmentMatches(record.root,record.account,record.manifest,record.commitment);
}

const statusSchema=z.object({signedIn:z.literal(true),accountId:z.uuid()});
const sessionsSchema=z.object({sessions:z.array(z.object({id:z.uuid(),current:z.boolean()}))});
async function json(response:Response,limit:number):Promise<unknown>{const text=await response.text();if(text.length>limit)throw Error('Account response was not confirmed.');return JSON.parse(text);}
/**
 * The server-verified account, refreshing an expired access token the way Settings does; null when signed out or not
 * confirmed. One tab at a time (Web Locks, where available), so tabs restored together never spend one refresh token
 * twice; a tab that loses that race finds the new cookies on its next status read.
 */
export async function verifiedAccount(signal:AbortSignal):Promise<string|null>{const status=await accountStatus(signal);return typeof status==='string'?status:null;}
/** Session Y Part 5, FIX_PLAN A7 (Q-SYNC-05): the two answers that end a remembered device's record. */
export type AccountDenial={denied:'SESSION_REVOKED'|'ACCOUNT_DELETED'};
const deniedSchema=z.object({signedIn:z.literal(false),error:z.enum(['SESSION_REVOKED','ACCOUNT_DELETED'])});
async function denialOf(response:Response):Promise<AccountDenial|null>{try{const parsed=deniedSchema.safeParse(await json(response,4096));return parsed.success?{denied:parsed.data.error}:null;}catch{return null;}}
/**
 * verifiedAccount, and also why not when the server says this session was revoked or the account deleted: those answers
 * come back as {denied}, read from the first status reply (a refresh is not spent on them; the next status call would no
 * longer name them). Anything else that is not a confirmed account, a routine sign-in requirement or a failed request
 * included, is null, as before.
 */
export async function accountStatus(signal:AbortSignal):Promise<string|AccountDenial|null>{
 const check=async():Promise<string|AccountDenial|null>=>{
  try{
   const status=()=>fetch('/api/private-account?action=status',{cache:'no-store',signal});
   let response=await status();
   if(response.status===401){const denial=await denialOf(response);if(denial)return denial;response=await fetch('/api/private-account',{method:'POST',headers:{'content-type':'application/json'},body:'{"action":"refresh"}',cache:'no-store',signal});if(!response.ok){await response.body?.cancel();response=await status();if(response.status===401){const late=await denialOf(response);if(late)return late;return null;}}}
   if(!response.ok){await response.body?.cancel();return null;}
   const parsed=statusSchema.safeParse(await json(response,32768));return parsed.success?parsed.data.accountId.toLowerCase():null;
  }catch(error){if(signal.aborted)throw error;return null;}
 };
 return typeof globalThis.navigator?.locks?.request==='function'?navigator.locks.request('zigoals:account-status',check):check();
}
/** This browser's server session id: it survives token refreshes but not a new sign-in. Null when not confirmed. */
export async function currentSession(account:string,signal:AbortSignal):Promise<string|null>{
 try{
  const response=await fetch('/api/private-account?action=sessions',{headers:{'X-Zigoals-Account':account},cache:'no-store',signal});
  if(!response.ok){await response.body?.cancel();return null;}
  const parsed=sessionsSchema.safeParse(await json(response,1_000_000)),current=parsed.success?parsed.data.sessions.filter(s=>s.current):[];
  return current.length===1?current[0]!.id.toLowerCase():null;
 }catch(error){if(signal.aborted)throw error;return null;}
}
