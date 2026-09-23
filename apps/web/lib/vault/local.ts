import type {z} from 'zod';
import {withStorageLock} from '../storage';
import {storageLockKey} from '../showcase-storage';
import {parsePrivateData} from '../private-storage';
import {VaultDatabase} from './database';
export const localDatabase=new VaultDatabase();
const marker=JSON.stringify({schemaVersion:100,kind:'zigoals-indexeddb-pointer',database:'zigoals-private-vault-v1',protocol:1});
export function isDurableMarker(raw:string|null){return raw===marker;}
export function durableSpace(storage:Storage,key:string):string{
 const physical=storageLockKey(storage,key);if(physical===key)return 'local';
 const match=physical.match(/^zigoals:account:v1:([0-9a-f-]{36}):/);
 if(!match||physical!==`zigoals:account:v1:${match[1]}:${key}`)throw Error('Showcase cannot use a real private database.');
 storage.getItem(key);return `account:${match[1]}`;
}
function fence(storage:Storage,key:string){if(!isDurableMarker(storage.getItem(key)))throw Error('Storage selection changed.');}
export async function enableDurableStore<T>(storage:Storage,key:string,schema:z.ZodType<T>,empty:()=>T,db=localDatabase){
 if(!['zigoals:platform:v1','zigoals:habits:v1','zigoals:health:v1','zigoals:settings:v1'].includes(key))throw Error('Unsupported domain.');
 const space=durableSpace(storage,key);
 await withStorageLock(storageLockKey(storage,key),async()=>{
  const raw=storage.getItem(key);if(isDurableMarker(raw)){await readDurableStore(storage,key,schema,db);return;}
  const data=raw===null?empty():parsePrivateData(raw,schema),existing=await db.read(space,key);
  if(existing){
   // A pointer write can fail after IndexedDB commits. Resume only if the old source
   // still matches the staged data; never overwrite changes made by an older tab.
   if(JSON.stringify(schema.parse(existing.data))!==JSON.stringify(data))throw Error('Migration source changed. Export both copies before resolving; neither was overwritten.');
  }else await db.commit(space,key,0,data,crypto.randomUUID(),raw??JSON.stringify(data));
  const verify=await db.read(space,key);if(!verify||JSON.stringify(schema.parse(verify.data))!==JSON.stringify(data))throw Error('Migration validation failed. Original data was preserved.');
  storage.setItem(key,marker); // Last publication step; old schema writers now fail closed.
 });
}
export async function readDurableStore<T>(storage:Storage,key:string,schema:z.ZodType<T>,db=localDatabase):Promise<T>{
 const space=durableSpace(storage,key);
 if(!isDurableMarker(storage.getItem(key)))throw Error('Storage selection changed. Reload before continuing.');
 const value=await db.read(space,key);if(!value)throw Error('Private database missing. Restore from your private backup; do not reset.');fence(storage,key);return schema.parse(value.data);
}
export async function updateDurableStore<T>(storage:Storage,key:string,schema:z.ZodType<T>,updater:(value:T)=>T,db=localDatabase):Promise<T>{
 const space=durableSpace(storage,key);
 return withStorageLock(storageLockKey(storage,key),async()=>{
  if(!isDurableMarker(storage.getItem(key)))throw Error('Storage changed. Reload.');
  const previous=await db.read(space,key);if(!previous)throw Error('Private database missing.');
  const latest=schema.parse(previous.data),next=updater(latest);if(next===latest)return latest;
  const validated=schema.parse(next);fence(storage,key);await db.commit(space,key,previous.revision,validated);return validated;
 });
}
export async function restoreDurableStore<T>(storage:Storage,key:string,schema:z.ZodType<T>,raw:string,db=localDatabase):Promise<T>{
 if(new TextEncoder().encode(raw).length>32_000_000)throw Error('Backup exceeds 32 MB.');
 const data=schema.parse(JSON.parse(raw));
 const space=durableSpace(storage,key);
 return withStorageLock(storageLockKey(storage,key),async()=>{
  if(!isDurableMarker(storage.getItem(key)))throw Error('Storage changed. Reload.');
  const previous=await db.read(space,key);if(!previous)throw Error('Private database missing.');
  if(Number(previous.data.schemaVersion)>Number((data as {schemaVersion?:number}).schemaVersion))throw Error('Cannot replace a newer schema.');
  fence(storage,key);await db.commit(space,key,previous.revision,data,crypto.randomUUID(),JSON.stringify(previous.data));return data;
 });
}

/** Export stored durable values without schema coercion, including unsupported/corrupt application schemas. */
export async function exportDurableStore(storage:Storage,key:string,db=localDatabase):Promise<string>{
 const space=durableSpace(storage,key);if(!isDurableMarker(storage.getItem(key)))throw Error('Storage selection changed.');
 const value=await db.read(space,key);if(!value)throw Error('Private database unavailable. Original migration copies may require recovery assistance.');fence(storage,key);return JSON.stringify(value.data);
}
