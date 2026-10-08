import * as z from 'zod';
import {metadataKey,parseBackup} from '@zigoals/shared-types';
import {LOCAL_CHAIN,LOCAL_OWNER,parseLocalLedger} from '../local-ledger';
import {withStorageLock} from '../storage';
import {storageLockKey} from '../showcase-storage';
import {pruneRecoveryCopies} from './recovery-copies';
import {asStorageError} from './storage-errors';
// Legacy "Local simulation" Goals live outside the four private modules: the simulated ledger
// plus the plans saved for its demo owner. The backup carries both exact stored strings as one
// optional section so a restore brings these Goals back byte for byte.
export const LOCAL_LEDGER_KEY='zigoals:local-ledger:v1';
export const LOCAL_PLANS_KEY=metadataKey(LOCAL_CHAIN,LOCAL_OWNER);
const dataSection=z.object({schemaVersion:z.literal(1),kind:z.literal('zigoals-local-simulation'),ledger:z.string().min(1).nullable(),plans:z.string().min(1).nullable()}).strict().refine(v=>v.ledger!==null||v.plans!==null);
// Damaged local records are left out of the backup; this marker keeps the omission visible when restoring.
const omittedSection=z.object({schemaVersion:z.literal(1),kind:z.literal('zigoals-local-simulation'),omitted:z.literal('damaged')}).strict();
export const localSimulationSchema=z.union([dataSection,omittedSection]);
export type LocalSimulationSection=z.infer<typeof dataSection>;
export const LOCAL_SIMULATION_DAMAGED="Legacy simulation Goals couldn't be included because their stored data is damaged. The other modules are in this backup; the damaged local data was not changed.";
export const LOCAL_SIMULATION_OMITTED="Legacy simulation Goals were not included in this backup because their stored data was damaged when it was made. There is nothing to restore for them.";
function validate(section:LocalSimulationSection){
 const ledger=section.ledger===null?null:parseLocalLedger(section.ledger);
 const plans=section.plans===null?null:parseBackup(section.plans,LOCAL_CHAIN,LOCAL_OWNER);
 return {goals:ledger?.goals.length??0,activity:ledger?.activity.length??0,plans:plans?Object.keys(plans.goals).length:0};
}
/** Null when this browser holds no legacy simulation records. Damaged records are left out with a warning, never silently. */
export function exportLocalSimulation(storage:Storage):{section:string;warning:string|null}|null{
 const ledger=storage.getItem(LOCAL_LEDGER_KEY),plans=storage.getItem(LOCAL_PLANS_KEY);
 if(ledger===null&&plans===null)return null;
 const section={schemaVersion:1 as const,kind:'zigoals-local-simulation' as const,ledger,plans};
 try{validate(section);}catch{return {section:JSON.stringify({schemaVersion:1,kind:'zigoals-local-simulation',omitted:'damaged'}),warning:LOCAL_SIMULATION_DAMAGED};}
 return {section:JSON.stringify(section),warning:null};
}
export function isOmittedLocalSimulation(raw:string){return 'omitted' in localSimulationSchema.parse(JSON.parse(raw));}
export function summarizeLocalSimulation(raw:string){const section=localSimulationSchema.parse(JSON.parse(raw));return 'omitted' in section?{goals:0,activity:0,plans:0,warning:LOCAL_SIMULATION_OMITTED}:{...validate(section),warning:null};}
/** Readable and valid prior bytes; only then may older copies of that key be pruned (QA-02). */
function readable(key:string,raw:string){try{if(key===LOCAL_LEDGER_KEY)parseLocalLedger(raw);else parseBackup(raw,LOCAL_CHAIN,LOCAL_OWNER);return true;}catch{return false;}}
/** Replaces both legacy keys exactly as backed up. Prior bytes are retained beside each key; after success only that newest copy is kept per key. */
export async function restoreLocalSimulation(storage:Storage,raw:string){
 const parsed=localSimulationSchema.parse(JSON.parse(raw));if('omitted' in parsed)throw Error(LOCAL_SIMULATION_OMITTED);const section=parsed;validate(section);
 await withStorageLock(storageLockKey(storage,LOCAL_LEDGER_KEY),()=>withStorageLock(storageLockKey(storage,LOCAL_PLANS_KEY),()=>{
  // All or nothing: if the browser refuses any write (for example a full quota), put back
  // the exact prior bytes of both keys and drop this attempt's recovery copies.
  const written:{key:string;previous:string|null;copy:string|null}[]=[];let pendingCopy:string|null=null;
  const rollback=()=>{
   // The refused key was never changed; its copy is dropped first to free space for the rollback.
   if(pendingCopy)storage.removeItem(pendingCopy);
   for(const {key,previous,copy} of [...written].reverse()){
    try{if(previous===null)storage.removeItem(key);else storage.setItem(key,previous);}catch{continue;} // keep the copy if its rollback fails
    if(copy)storage.removeItem(copy);
   }
  };
  try{
   for(const [key,value] of [[LOCAL_LEDGER_KEY,section.ledger],[LOCAL_PLANS_KEY,section.plans]] as const){
    const previous=storage.getItem(key);pendingCopy=null;
    if(previous!==null&&previous!==value){pendingCopy=`${key}:recovery:${crypto.randomUUID()}`;storage.setItem(pendingCopy,previous);}
    if(value===null)storage.removeItem(key);else storage.setItem(key,value);
    written.push({key,previous,copy:pendingCopy});pendingCopy=null;
   }
  }catch(error){
   rollback();
   throw asStorageError(error);
  }
  // Both keys are written: only now are older copies of each changed key pruned (QA-02).
  for(const {key,previous,copy} of written)if(copy&&previous!==null&&readable(key,previous))pruneRecoveryCopies(storage,key,copy);
 }));
}
