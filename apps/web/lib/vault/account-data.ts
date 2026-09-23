import type {z} from 'zod';
import {PLATFORM_KEY,platformSchema,emptyPlatform} from '../positions';
import {HABITS_KEY,habitDataSchema,emptyHabitData} from '../habits';
import {HEALTH_STORAGE_KEY,healthSchema,createEmptyHealth} from '../health';
import {DASHBOARD_SETTINGS_KEY,dashboardSettingsSchema,emptyDashboardSettings} from '../dashboard-settings';
import {withStorageLock} from '../storage';
import {storageLockKey} from '../showcase-storage';
import {isDurableMarker,enableDurableStore,exportDurableStore,localDatabase,durableSpace} from './local';
import type {Domain,PrivateData} from './cloud-sync';
export const modules:Record<Domain,{key:string;schema:z.ZodType;empty:()=>unknown}>={finance:{key:PLATFORM_KEY,schema:platformSchema,empty:emptyPlatform},habits:{key:HABITS_KEY,schema:habitDataSchema,empty:emptyHabitData},health:{key:HEALTH_STORAGE_KEY,schema:healthSchema,empty:createEmptyHealth},settings:{key:DASHBOARD_SETTINGS_KEY,schema:dashboardSettingsSchema,empty:emptyDashboardSettings}};
export function validateData(data:PrivateData){for(const [domain,raw]of Object.entries(data)){const m=modules[domain as Domain];if(!m||typeof raw!=='string'||new TextEncoder().encode(raw).length>32_000_000)throw Error('Unsupported private data.');m.schema.parse(JSON.parse(raw));}}
export async function captureData(storage:Storage,domains:readonly Domain[]){const result:PrivateData={};for(const d of domains){const {key,schema,empty}=modules[d];if(storage.getItem(key)===null)continue;await enableDurableStore(storage,key,schema,empty);result[d]=await exportDurableStore(storage,key);}validateData(result);return result;}
/** Each domain commits atomically; finances are one aggregate. Refuse edits made since capture. */
export async function applyData(storage:Storage,before:PrivateData,after:PrivateData,fence:()=>void){
 validateData(after);
 for(const [domain,raw] of Object.entries(after)){
  const {key,schema,empty}=modules[domain as Domain];fence();
  if(before[domain as Domain]===undefined&&storage.getItem(key)!==null)throw Error('Local records changed during sync. Retry; no record was overwritten.');
  if(storage.getItem(key)===null)await enableDurableStore(storage,key,schema,empty);
  await withStorageLock(storageLockKey(storage,key),async()=>{
   fence();if(!isDurableMarker(storage.getItem(key)))throw Error('Storage changed during sync.');
   const space=durableSpace(storage,key),prior=await localDatabase.read(space,key);if(!prior)throw Error('Private records unavailable.');
   const expected=before[domain as Domain]??JSON.stringify(schema.parse(empty()));
   if(JSON.stringify(prior.data)!==expected&&JSON.stringify(prior.data)!==raw)throw Error('Local records changed during sync. Retry; no record was overwritten.');
   fence();if(JSON.stringify(prior.data)!==raw)await localDatabase.commit(space,key,prior.revision,schema.parse(JSON.parse(raw)));
  });
  window.dispatchEvent(new CustomEvent('zigoals:private-change',{detail:key}));
  if(typeof BroadcastChannel!=='undefined'){const c=new BroadcastChannel('zigoals:private-updates:v1');c.postMessage(key);c.close();}
 }
}
