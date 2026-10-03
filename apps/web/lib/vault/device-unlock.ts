/**
 * Remember this device (ADR-008). At most one record, for the account this browser last remembered, in its own IndexedDB
 * database: the account, vault, epoch, manifest digest and server session it is bound to, whether Health sync was on,
 * and the sealed root with its non-extractable device key. Local only: nothing here is sent anywhere and nothing is
 * written to localStorage. Reading never creates the database and gives up after a time limit (a first open can hang
 * in Safari, see database.ts), so a browser that cannot answer simply counts as not remembered.
 */
import {z} from 'zod';
import {epochSchema,sealedRootSchema} from './crypto';

export const DEVICE_DATABASE='zigoals-device-unlock-v1';
const DEVICES='devices',STATE='state',FORGETS='forgets',LIMIT_MS=3000;
export const deviceRecordSchema=z.object({version:z.literal(1),account:z.uuid(),vault:z.uuid(),epoch:epochSchema,manifest:z.string().regex(/^[A-Za-z0-9_-]{43}$/),session:z.uuid(),health:z.boolean(),createdAt:z.iso.datetime(),sealed:sealedRootSchema}).strict();
export type DeviceBinding=z.infer<typeof deviceRecordSchema>;
export type DeviceRecord=DeviceBinding&{key:CryptoKey};

/** The device key must be what createDeviceKey makes: AES-GCM 256, not extractable, able to seal and unwrap only. */
function deviceKey(key:unknown):key is CryptoKey{
 if(typeof CryptoKey==='undefined'||!(key instanceof CryptoKey))return false;
 const algorithm=key.algorithm as AesKeyAlgorithm;
 return key.type==='secret'&&!key.extractable&&algorithm.name==='AES-GCM'&&algorithm.length===256&&[...key.usages].sort().join(',')==='encrypt,unwrapKey';
}
/** A stored value as a record, or null when this version cannot use it. */
export function deviceRecord(value:unknown):DeviceRecord|null{
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const {key,...meta}=value as Record<string,unknown>,parsed=deviceRecordSchema.safeParse(meta);
 return parsed.success&&deviceKey(key)&&parsed.data.account===parsed.data.account.toLowerCase()?{...parsed.data,key}:null;
}
/** What a record is bound to, without its key: kept by an open vault to recognise its own record later. */
export function bindingOf(record:DeviceRecord):DeviceBinding{const {key,...binding}=record;void key;return binding;}
/** Two records are the same remember when they hold the same seal (its IV is random for every seal). */
const sameSeal=(value:unknown,expected:Pick<DeviceBinding,'account'|'sealed'>)=>{const v=value as {account?:unknown;sealed?:{iv?:unknown;ciphertext?:unknown}}|undefined;return v?.account===expected.account&&v.sealed?.iv===expected.sealed.iv&&v.sealed?.ciphertext===expected.sealed.ciphertext;};

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
export async function dropDevice(expected:Pick<DeviceBinding,'account'|'sealed'>):Promise<void>{
 const db=await existing();if(!db)return;
 try{
  const t=db.transaction(DEVICES,'readwrite'),store=t.objectStore(DEVICES),current=store.get(expected.account);
  current.onsuccess=()=>{if(sameSeal(current.result,expected))store.delete(expected.account);};
  await finished(t);
 }finally{db.close();}
}
/** Updates the remembered Health choice of exactly this record (Health turned on or off on a remembered device). */
export async function rememberHealth(expected:Pick<DeviceBinding,'account'|'sealed'>,health:boolean):Promise<void>{
 const db=await existing();if(!db)return;
 try{
  const t=db.transaction(DEVICES,'readwrite'),store=t.objectStore(DEVICES),current=store.get(expected.account);
  current.onsuccess=()=>{if(sameSeal(current.result,expected))store.put({...(current.result as object),health},expected.account);};
  await finished(t);
 }finally{db.close();}
}
/** Whether this exact record is still stored (the idle check: another tab may have forgotten the device). */
export async function stillRemembered(expected:Pick<DeviceBinding,'account'|'sealed'>):Promise<boolean>{
 const db=await existing();if(!db)return false;
 try{return sameSeal(await answer(db.transaction(DEVICES,'readonly').objectStore(DEVICES).get(expected.account)),expected);}finally{db.close();}
}

const statusSchema=z.object({signedIn:z.literal(true),accountId:z.uuid()});
const sessionsSchema=z.object({sessions:z.array(z.object({id:z.uuid(),current:z.boolean()}))});
async function json(response:Response,limit:number):Promise<unknown>{const text=await response.text();if(text.length>limit)throw Error('Account response was not confirmed.');return JSON.parse(text);}
/**
 * The server-verified account, refreshing an expired access token the way Settings does; null when signed out or not
 * confirmed. One tab at a time (Web Locks, where available), so tabs restored together never spend one refresh token
 * twice; a tab that loses that race finds the new cookies on its next status read.
 */
export async function verifiedAccount(signal:AbortSignal):Promise<string|null>{
 const check=async()=>{
  try{
   const status=()=>fetch('/api/private-account?action=status',{cache:'no-store',signal});
   let response=await status();
   if(response.status===401){await response.body?.cancel();response=await fetch('/api/private-account',{method:'POST',headers:{'content-type':'application/json'},body:'{"action":"refresh"}',cache:'no-store',signal});if(!response.ok){await response.body?.cancel();response=await status();}}
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
