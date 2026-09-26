import type {z} from 'zod';
import {PLATFORM_KEY,platformSchema,emptyPlatform,type Platform} from '../positions';
import {assertFinancialEvidenceAppendOnly} from '../financial-events';
import {HABITS_KEY,habitDataSchema,emptyHabitData} from '../habits';
import {HEALTH_STORAGE_KEY,healthSchema,createEmptyHealth} from '../health';
import {DASHBOARD_SETTINGS_KEY,dashboardSettingsSchema,emptyDashboardSettings} from '../dashboard-settings';
import {withStorageLock} from '../storage';
import {storageLockKey} from '../showcase-storage';
import {isDurableMarker,enableDurableStore,exportDurableStore,localDatabase,durableSpace} from './local';
import type {Domain,PrivateData} from './cloud-sync';
export const modules:Record<Domain,{key:string;schema:z.ZodType;empty:()=>unknown}>={finance:{key:PLATFORM_KEY,schema:platformSchema,empty:emptyPlatform},habits:{key:HABITS_KEY,schema:habitDataSchema,empty:emptyHabitData},health:{key:HEALTH_STORAGE_KEY,schema:healthSchema,empty:createEmptyHealth},settings:{key:DASHBOARD_SETTINGS_KEY,schema:dashboardSettingsSchema,empty:emptyDashboardSettings}};
/** Sync cannot rewrite accepted immutable evidence. Explicit backup replacement is separate. */
function assertFinanceRetained(before:Platform,after:Platform){
 assertFinancialEvidenceAppendOnly(before,after);
 const retained=(prior:readonly {id:string}[],next:readonly {id:string}[])=>{const rows=new Map(next.map(e=>[e.id,e]));for(const event of prior)if(JSON.stringify(rows.get(event.id))!==JSON.stringify(event))throw Error('Accepted financial evidence is append-only. Both copies were preserved for review.');};
 for(const name of ['contributions','valuationSnapshots','goalHistory','assetEvents'] as const)retained(before[name],after[name]);
 const goals=new Map(after.goals.map(g=>[g.id,g]));for(const goal of before.goals)for(const name of ['planRevisions','lifecycle'] as const)retained(goal[name]??[],goals.get(goal.id)?.[name]??[]);
}
export function validateData(data:PrivateData,prior?:PrivateData){for(const [domain,raw]of Object.entries(data)){const m=modules[domain as Domain];if(!m||typeof raw!=='string'||new TextEncoder().encode(raw).length>32_000_000)throw Error('Unsupported private data.');m.schema.parse(JSON.parse(raw));}if(prior?.finance!==undefined){if(data.finance===undefined)throw Error('Accepted financial evidence cannot be removed by sync.');assertFinanceRetained(platformSchema.parse(JSON.parse(prior.finance)),platformSchema.parse(JSON.parse(data.finance)));}if(prior?.health!==undefined&&data.health!==undefined){const before=healthSchema.parse(JSON.parse(prior.health)),after=healthSchema.parse(JSON.parse(data.health));for(const row of before.measurements??[]){const next=after.measurements?.find(v=>v.id===row.id);if(!next)throw Error('Measurement history cannot be removed by sync.');const snapshot=(v:Record<string,unknown>)=>Object.fromEntries(Object.entries(v).filter(([k])=>!['id','createdAt','source','corrections'].includes(k)));const retained=[...next.corrections,snapshot(next)].map(v=>JSON.stringify(v));for(const value of [...row.corrections,snapshot(row)])if(!retained.includes(JSON.stringify(value)))throw Error('Measurement corrections must retain every original reading.');if(next.createdAt!==row.createdAt||next.source!==row.source)throw Error('Measurement identity changed.');}}}
export async function captureData(storage:Storage,domains:readonly Domain[]){const result:PrivateData={};for(const d of domains){const {key,schema,empty}=modules[d];if(storage.getItem(key)===null)continue;await enableDurableStore(storage,key,schema,empty);result[d]=await exportDurableStore(storage,key);}validateData(result);return result;}
/** Apply every validated section and its outbox atomically, after checking all captured revisions. */
export async function applyData(storage:Storage,before:PrivateData,after:PrivateData,fence:()=>void){
 validateData(after,before);
 const entries=Object.entries(after).sort(([a],[b])=>a.localeCompare(b));if(!entries.length)return;
 // Pointer migration may initialize an empty section, but never publishes copied records.
 for(const [domain]of entries){const {key,schema,empty}=modules[domain as Domain];fence();if(before[domain as Domain]===undefined&&storage.getItem(key)!==null)throw Error('Local records changed during sync. Retry; no record was overwritten.');if(storage.getItem(key)===null)await enableDurableStore(storage,key,schema,empty);}
 async function locked(index:number):Promise<void>{
  if(index<entries.length){const {key}=modules[entries[index]![0] as Domain];return withStorageLock(storageLockKey(storage,key),()=>locked(index+1));}
  const batch:{domain:string;base:number;data:unknown}[]=[];let space:string|undefined;
  for(const [domain,raw]of entries){
   const {key,schema,empty}=modules[domain as Domain];fence();if(!isDurableMarker(storage.getItem(key)))throw Error('Storage changed during sync.');
   const currentSpace=durableSpace(storage,key);if(space!==undefined&&currentSpace!==space)throw Error('Account selection changed.');space=currentSpace;
   const prior=await localDatabase.read(space,key);if(!prior)throw Error('Private records unavailable.');
   const expected=before[domain as Domain]??JSON.stringify(schema.parse(empty()));
   if(JSON.stringify(prior.data)!==expected&&JSON.stringify(prior.data)!==raw)throw Error('Local records changed during sync. Retry; no record was overwritten.');
   if(JSON.stringify(prior.data)!==raw)batch.push({domain:key,base:prior.revision,data:schema.parse(JSON.parse(raw))});
  }
  fence();if(batch.length)await localDatabase.commitBatch(space!,batch,fence);
 }
 await locked(0);
 for(const [domain]of entries){const {key}=modules[domain as Domain];window.dispatchEvent(new CustomEvent('zigoals:private-change',{detail:key}));if(typeof BroadcastChannel!=='undefined'){const c=new BroadcastChannel('zigoals:private-updates:v1');c.postMessage(key);c.close();}}
}
