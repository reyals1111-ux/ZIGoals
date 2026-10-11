import {isQuotaError} from './storage-errors';
/**
 * Recovery copies of private modules in browser storage, `<key>:recovery:<uuid>` (QA-02).
 * Owner decision (2026-10-01): after a successful restore keep only the newest copy per module. The newest is
 * the copy the restore itself just wrote; existing keys carry no order, so nothing older is ever ranked.
 * Copies are listed through the given Storage view, so an account or Showcase view sees only its own keys and
 * every module and space is pruned independently.
 */
export const recoveryCopyPrefix=(key:string)=>`${key}:recovery:`;
export function recoveryCopyKeys(storage:Storage,key:string):string[]{
 const prefix=recoveryCopyPrefix(key),keys:string[]=[];
 for(let i=0;i<storage.length;i++){const k=storage.key(i);if(k?.startsWith(prefix))keys.push(k);}
 return keys;
}
/** After a confirmed success only. Best effort: a copy the browser refuses to remove stays, and the restore remains done. */
export function pruneRecoveryCopies(storage:Storage,key:string,keep:string):number{
 let removed=0;
 for(const k of recoveryCopyKeys(storage,key))if(k!==keep)try{storage.removeItem(k);removed++;}catch{/* kept */}
 return removed;
}
/**
 * Replaces one module, keeping a recovery copy of the exact bytes it replaces. Write the copy, then the module; a
 * refused module write removes this attempt's copy again (the module is unchanged). Only after both writes
 * succeed, and only when the replaced store was readable and valid (`prunable`), this module's older copies
 * are removed.
 * When the browser refuses for lack of space and older copies exist, they would be removed by this restore's
 * success anyway: they are held in memory, removed, and the writes retried once. If that still fails, the held
 * copies are written back byte for byte, so a failed restore keeps every copy. The caller holds the module's
 * storage lock and this runs synchronously, so no other writer of this module interleaves.
 */
export function replaceWithRecoveryCopy(storage:Storage,key:string,previous:string,next:string,prunable:boolean):void{
 const copy=recoveryCopyPrefix(key)+crypto.randomUUID(),older=prunable?recoveryCopyKeys(storage,key):[];
 const write=()=>{storage.setItem(copy,previous);try{storage.setItem(key,next);}catch(error){storage.removeItem(copy);throw error;}};
 try{write();}
 catch(error){
  if(!isQuotaError(error)||!older.length)throw error;
  const held:[string,string][]=[];
  try{
   for(const k of older){const value=storage.getItem(k);if(value===null)continue;storage.removeItem(k);held.push([k,value]);}
   write();
  }catch(retryError){
   for(const [k,value] of held)try{storage.setItem(k,value);}catch{/* the space it used is free again; nothing else wrote to this module */}
   throw retryError;
  }
  return;
 }
 if(prunable)pruneRecoveryCopies(storage,key,copy);
}
