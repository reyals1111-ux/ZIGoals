/** Admission and follower polls are at least this far apart (Session R1; they were 25 and 50 ms). */
export const MARKET_POLL_MS=250;
type Command=(command:{action:string;id:string})=>Promise<Record<string,unknown>>;
/** Resolves after `ms`, or at once when the signal aborts. */
export function marketPause(ms:number,signal?:AbortSignal){
 return new Promise<void>(resolve=>{
  const finish=()=>{clearTimeout(timer);signal?.removeEventListener('abort',finish);resolve();};
  const timer=setTimeout(finish,Math.max(0,ms));signal?.addEventListener('abort',finish,{once:true});if(signal?.aborted)finish();
 });
}
/** Waits for an admitted attempt that is not yet dispatched (a slot is busy, or another attempt is next in line).
 * Only its own reservation is held while waiting: each poll is one `admit` of the original attempt, at most every
 * 250 ms. Abort or expiry is returned to the caller, which cancels the undispatched attempt. It never creates a
 * replacement charged attempt. */
export async function waitForAdmission(command:Command,id:string,{signal,maxWaitMs=2000}:{signal?:AbortSignal;maxWaitMs?:number}={}){
 const wait=Math.min(2000,Math.max(0,maxWaitMs)),deadline=Date.now()+wait;
 // Bounded by count as well as by time (at most 8 polls), so a stopped clock cannot make it poll forever.
 for(let poll=0;poll<Math.ceil(wait/MARKET_POLL_MS);poll++){
  if(signal?.aborted)break;
  await marketPause(Math.min(MARKET_POLL_MS,deadline-Date.now()),signal);
  if(signal?.aborted)break;
  const admitted=await command({action:'admit',id});
  if(admitted.ok===true||!['CONCURRENT_LIMIT','QUEUE_WAIT'].includes(String(admitted.reason)))return admitted;
  if(Date.now()>=deadline)break;
 }
 return {ok:false,reason:signal?.aborted?'WAITER_CANCELLED':'QUEUE_WAIT_EXPIRED'};
}
