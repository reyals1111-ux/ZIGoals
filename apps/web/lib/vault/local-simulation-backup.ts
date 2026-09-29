import {z} from 'zod';
import {metadataKey,parseBackup} from '@zigoals/shared-types';
import {LOCAL_CHAIN,LOCAL_OWNER,parseLocalLedger} from '../local-ledger';
import {withStorageLock} from '../storage';
import {storageLockKey} from '../showcase-storage';
// Legacy "Local simulation" Goals live outside the four private modules: the simulated ledger
// plus the plans saved for its demo owner. The backup carries both exact stored strings as one
// optional section so a restore brings these Goals back byte for byte.
export const LOCAL_LEDGER_KEY='zigoals:local-ledger:v1';
export const LOCAL_PLANS_KEY=metadataKey(LOCAL_CHAIN,LOCAL_OWNER);
export const localSimulationSchema=z.object({schemaVersion:z.literal(1),kind:z.literal('zigoals-local-simulation'),ledger:z.string().min(1).nullable(),plans:z.string().min(1).nullable()}).strict().refine(v=>v.ledger!==null||v.plans!==null);
export type LocalSimulationSection=z.infer<typeof localSimulationSchema>;
function validate(section:LocalSimulationSection){
 const ledger=section.ledger===null?null:parseLocalLedger(section.ledger);
 const plans=section.plans===null?null:parseBackup(section.plans,LOCAL_CHAIN,LOCAL_OWNER);
 return {goals:ledger?.goals.length??0,activity:ledger?.activity.length??0,plans:plans?Object.keys(plans.goals).length:0};
}
/** Null when this browser holds no legacy simulation records. Damaged records refuse the backup. */
export function exportLocalSimulation(storage:Storage):string|null{
 const ledger=storage.getItem(LOCAL_LEDGER_KEY),plans=storage.getItem(LOCAL_PLANS_KEY);
 if(ledger===null&&plans===null)return null;
 const section={schemaVersion:1 as const,kind:'zigoals-local-simulation' as const,ledger,plans};
 try{validate(section);}catch{throw Error('Local simulation records are unreadable. Export your goal plans before backing up.');}
 return JSON.stringify(section);
}
export function summarizeLocalSimulation(raw:string){return validate(localSimulationSchema.parse(JSON.parse(raw)));}
/** Replaces both legacy keys exactly as backed up. Prior bytes are retained beside each key. */
export async function restoreLocalSimulation(storage:Storage,raw:string){
 const section=localSimulationSchema.parse(JSON.parse(raw));validate(section);
 await withStorageLock(storageLockKey(storage,LOCAL_LEDGER_KEY),()=>withStorageLock(storageLockKey(storage,LOCAL_PLANS_KEY),()=>{
  for(const [key,value] of [[LOCAL_LEDGER_KEY,section.ledger],[LOCAL_PLANS_KEY,section.plans]] as const){
   const previous=storage.getItem(key);if(previous!==null&&previous!==value)storage.setItem(`${key}:recovery:${crypto.randomUUID()}`,previous);
   if(value===null)storage.removeItem(key);else storage.setItem(key,value);
  }
 }));
}
