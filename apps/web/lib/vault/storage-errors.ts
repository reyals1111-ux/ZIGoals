/**
 * Private-storage failures with stable codes (QA-02, QA-03). Interfaces map `storageErrorCode(error)` to their
 * own wording; the code is the contract, and the messages here are plain fallbacks that say what to do.
 * - STORAGE_FULL: the browser refused a write because this site's storage quota is used up.
 * - MODULE_LIMIT: one module would exceed its own size limit (2 MB in browser storage, 32 MB transactional).
 * - NEWER_VERSION: the stored module comes from a newer app build and cannot be replaced by this one.
 * - CONFLICT: the module changed in another tab or on another device while this change was prepared.
 * Every coded failure leaves the stored module as it was.
 */
export const STORAGE_ERROR_CODES=['STORAGE_FULL','MODULE_LIMIT','NEWER_VERSION','CONFLICT'] as const;
export type StorageErrorCode=typeof STORAGE_ERROR_CODES[number];
type Place={durable?:boolean};
export function storageErrorMessage(code:StorageErrorCode,{durable=false}:Place={}):string{
 switch(code){
  case 'STORAGE_FULL':return durable
   ?"Your browser storage is full (this site's storage quota is used up), so nothing was changed. Export your backups, free up space on this device, then try again."
   :"Your browser storage is full (this site's storage quota is used up), so nothing was changed. Export your backups, then move this module to transactional storage in Settings, which has more room, and try again.";
  case 'MODULE_LIMIT':return durable
   ?'This is more than the 32 MB this module can hold, so nothing was changed. Export a backup before continuing.'
   :'This is more than the 2 MB this module can hold in browser storage, so nothing was changed. Export a backup, then move the module to transactional storage in Settings (up to 32 MB) and try again.';
  case 'NEWER_VERSION':return 'This browser holds a newer version of this module than this app can replace, so nothing was changed. Reload to get the latest app, then try again.';
  case 'CONFLICT':return 'Data changed on another tab or device, so nothing was changed. Reload and review before saving.';
 }
}
export class PrivateStorageError extends Error{
 readonly code:StorageErrorCode;
 constructor(code:StorageErrorCode,options:Place&{message?:string;cause?:unknown}={}){
  super(options.message??storageErrorMessage(code,options),options.cause===undefined?undefined:{cause:options.cause});
  this.name='PrivateStorageError';this.code=code;
 }
}
const causes=function*(error:unknown){for(let e=error,depth=0;e&&depth<8;e=(e as {cause?:unknown}).cause,depth++)yield e as {name?:unknown;code?:unknown};};
/** QuotaExceededError (Chromium, WebKit, current Firefox), Firefox's older NS_ERROR_DOM_QUOTA_REACHED, or their legacy numeric codes, anywhere in the cause chain. */
export function isQuotaError(error:unknown):boolean{
 for(const e of causes(error))if(e.name==='QuotaExceededError'||e.name==='NS_ERROR_DOM_QUOTA_REACHED'||(typeof DOMException!=='undefined'&&e instanceof DOMException&&(e.code===22||e.code===1014)))return true;
 return false;
}
/** The stable code of a private-storage failure, or null when it is not one of the four. */
export function storageErrorCode(error:unknown):StorageErrorCode|null{
 for(const e of causes(error))if(typeof e.code==='string'&&(STORAGE_ERROR_CODES as readonly string[]).includes(e.code))return e.code as StorageErrorCode;
 return isQuotaError(error)?'STORAGE_FULL':null;
}
/** A refused write for lack of space becomes STORAGE_FULL; every other error is returned unchanged. */
export function asStorageError(error:unknown,place:Place={}):unknown{
 if(error instanceof PrivateStorageError||!isQuotaError(error))return error;
 return new PrivateStorageError('STORAGE_FULL',{...place,cause:error});
}
