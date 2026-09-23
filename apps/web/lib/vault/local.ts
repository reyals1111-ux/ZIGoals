import type {z} from 'zod';
import {withStorageLock} from '../storage';
import {storageLockKey} from '../showcase-storage';
import {parsePrivateData} from '../private-storage';
import {VaultDatabase} from './database';
export const localDatabase=new VaultDatabase();
const marker=JSON.stringify({schemaVersion:100,kind:'zigoals-indexeddb-pointer',database:'zigoals-private-vault-v1',protocol:1});
export function isDurableMarker(raw:string|null){return raw===marker;}
export async function enableDurableStore<T>(storage:Storage,key:string,schema:z.ZodType<T>,empty:()=>T,db=localDatabase){
 if(!['zigoals:platform:v1','zigoals:habits:v1','zigoals:health:v1','zigoals:settings:v1'].includes(key))throw Error('Unsupported domain.');
 if(storageLockKey(storage,key)!==key)throw Error('Showcase cannot migrate into a real private database.');
 await withStorageLock(storageLockKey(storage,key),async()=>{
  const raw=storage.getItem(key);if(isDurableMarker(raw)){await readDurableStore(storage,key,schema,db);return;}
  const data=raw===null?empty():parsePrivateData(raw,schema),existing=await db.read('local',key);
  if(existing){
   // A pointer write can fail after IndexedDB commits. Resume only if the old source
   // still matches the staged data; never overwrite changes made by an older tab.
   if(JSON.stringify(schema.parse(existing.data))!==JSON.stringify(data))throw Error('Migration source changed. Export both copies before resolving; neither was overwritten.');
  }else await db.commit('local',key,0,data,crypto.randomUUID(),raw??JSON.stringify(data));
  const verify=await db.read('local',key);if(!verify||JSON.stringify(schema.parse(verify.data))!==JSON.stringify(data))throw Error('Migration validation failed. Original data was preserved.');
  storage.setItem(key,marker); // Last publication step; old schema writers now fail closed.
 });
}
export async function readDurableStore<T>(storage:Storage,key:string,schema:z.ZodType<T>,db=localDatabase):Promise<T>{
 if(storageLockKey(storage,key)!==key)throw Error('Showcase cannot use the real private database.');
 if(!isDurableMarker(storage.getItem(key)))throw Error('Storage selection changed. Reload before continuing.');
 const value=await db.read('local',key);if(!value)throw Error('Private database missing. Restore from your private backup; do not reset.');return schema.parse(value.data);
}
export async function updateDurableStore<T>(storage:Storage,key:string,schema:z.ZodType<T>,updater:(value:T)=>T,db=localDatabase):Promise<T>{
 if(storageLockKey(storage,key)!==key)throw Error('Showcase cannot use the real private database.');
 return withStorageLock(storageLockKey(storage,key),async()=>{
  if(!isDurableMarker(storage.getItem(key)))throw Error('Storage changed. Reload.');
  const previous=await db.read('local',key);if(!previous)throw Error('Private database missing.');
  const latest=schema.parse(previous.data),next=updater(latest);if(next===latest)return latest;
  const validated=schema.parse(next);await db.commit('local',key,previous.revision,validated);return validated;
 });
}
export async function restoreDurableStore<T>(storage:Storage,key:string,schema:z.ZodType<T>,raw:string,db=localDatabase):Promise<T>{
 if(new TextEncoder().encode(raw).length>32_000_000)throw Error('Backup exceeds 32 MB.');
 const data=schema.parse(JSON.parse(raw));
 if(storageLockKey(storage,key)!==key)throw Error('Showcase cannot use the real private database.');
 return withStorageLock(storageLockKey(storage,key),async()=>{
  if(!isDurableMarker(storage.getItem(key)))throw Error('Storage changed. Reload.');
  const previous=await db.read('local',key);if(!previous)throw Error('Private database missing.');
  if(Number(previous.data.schemaVersion)>Number((data as {schemaVersion?:number}).schemaVersion))throw Error('Cannot replace a newer schema.');
  await db.commit('local',key,previous.revision,data,crypto.randomUUID(),JSON.stringify(previous.data));return data;
 });
}

/** Export stored durable values without schema coercion, including unsupported/corrupt application schemas. */
export async function exportDurableStore(storage:Storage,key:string,db=localDatabase):Promise<string>{
 if(storageLockKey(storage,key)!==key||!isDurableMarker(storage.getItem(key)))throw Error('Storage selection changed.');
 const value=await db.read('local',key);if(!value)throw Error('Private database unavailable. Original migration copies may require recovery assistance.');return JSON.stringify(value.data);
}
