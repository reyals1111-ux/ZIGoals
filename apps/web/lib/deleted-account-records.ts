import {getAccountScope,isAccountLocked} from './account-session';
import {isShowcase,registerStorageScope} from './showcase-storage';
/**
 * Session Z-Cloud Part 5 (A7, ADR-019 C37): after the server says an account's cloud copy was deleted, that account is
 * locked in this tab, and its records stay on this device. Export everything may still copy them: `deletedAccountRecords`
 * is a read-only view of exactly that account's records, only while it is the selected, locked account this tab learned
 * was deleted (from the server's answer or its own deletion; tab memory only, so the server's answer is asked again after
 * a reload). A manual lock or a revoked session never opens it.
 */
const cloudDeleted=new WeakMap<object,Set<string>>();
export function noteCloudDeleted(account:string):void{
 if(typeof window==='undefined')return;let set=cloudDeleted.get(window);if(!set){set=new Set();cloudDeleted.set(window,set);}set.add(account.toLowerCase());
}
export function deletedAccountRecords():Storage|null{
 if(typeof window==='undefined'||isShowcase())return null;
 const account=getAccountScope();if(!account||!isAccountLocked()||!cloudDeleted.get(window)?.has(account))return null;
 const prefix=`zigoals:account:v1:${account}:`,store=window.localStorage;
 const guard=()=>{if(getAccountScope()!==account||!isAccountLocked())throw Error('Account selection changed. Nothing was exported.');};
 const keys=()=>{guard();return Array.from({length:store.length},(_,i)=>store.key(i)!).filter(k=>k.startsWith(prefix));};
 const refuse=()=>{throw Error('These records are read-only here.');};
 const view:Storage={get length(){return keys().length;},key:i=>keys()[i]?.slice(prefix.length)??null,getItem:k=>{guard();return store.getItem(prefix+k);},setItem:refuse,removeItem:refuse,clear:refuse};
 registerStorageScope(view,prefix);return view;
}
