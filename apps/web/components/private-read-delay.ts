"use client";
import {useSyncExternalStore} from "react";
import {localDatabase} from "../lib/vault/local";
/**
 * First reads of private stores that have not settled yet. A read is never cancelled or replaced by empty data here:
 * after PRIVATE_READ_SLOW_MS the Shell says it is taking longer and offers Retry, and a late result still renders
 * normally. Writes stay blocked until a read succeeds (usePrivateStore refuses them while not loaded).
 */
export const PRIVATE_READ_SLOW_MS=8000;
export const PRIVATE_READ_RETRY="zigoals:private-retry";
const waiting=new Map<object,ReturnType<typeof setTimeout>>(),overdue=new Set<object>(),listeners=new Set<()=>void>();
function notify(){for(const listener of listeners)listener();}
/** Starts the clock for one store instance's first read. A superseded or retried read keeps the original start. */
export function beginFirstRead(owner:object){
 if(waiting.has(owner)||overdue.has(owner))return;
 waiting.set(owner,setTimeout(()=>{waiting.delete(owner);overdue.add(owner);notify();},PRIVATE_READ_SLOW_MS));
}
/** The store instance loaded (data or a read error), unmounted or changed key. */
export function endFirstRead(owner:object){
 const timer=waiting.get(owner);if(timer!==undefined){clearTimeout(timer);waiting.delete(owner);}
 if(overdue.delete(owner))notify();
}
function subscribe(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener);};}
/** True while any first private read has been pending for PRIVATE_READ_SLOW_MS. Always false on the server. */
export function usePrivateReadDelay(){return useSyncExternalStore(subscribe,()=>overdue.size>0,()=>false);}
/** Starts one more database open for a stalled connection, then asks every store that has not loaded to read again. */
export function retryPrivateReads(){localDatabase.retryOpen();window.dispatchEvent(new Event(PRIVATE_READ_RETRY));}
