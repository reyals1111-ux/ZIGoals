/** Only browser callers share a Promise. Workers share primitive completion/expiry state;
 * each waiting HTTP request creates and awaits its own timer in its own I/O context. */
export type PendingWork={done:boolean;deadline:number;promise?:Promise<void>};
export function beginPendingWork(timeout=60000):PendingWork{return {done:false,deadline:typeof window==='undefined'?Date.now()+timeout:Infinity};}
export function workIsPending(work:PendingWork|undefined|null):work is PendingWork{return !!work&&!work.done&&Date.now()<work.deadline;}
export function ownPendingWork(work:PendingWork,promise:Promise<void>):Promise<void>{if(typeof window!=='undefined')work.promise=promise;return promise;}
export async function waitForPendingWork(work:PendingWork):Promise<boolean>{
 if(work.promise){await work.promise;return true;}
 // A follower must respond before the shortest public client timeout (15 seconds),
 // even when the abandoned owner's longer lease has not expired yet.
 const until=Date.now()+10000;
 while(workIsPending(work)&&Date.now()<until)await new Promise<void>(resolve=>setTimeout(resolve,25));
 return !workIsPending(work);
}
/** Expiry recovers a slot whose owning request was canceled before finally could run.
 * holdMs must exceed the caller's enforced fetch/body AbortSignal timeout. */
export function createRequestAdmission(max:number,holdMs:number,waitMs=12000){
 const slots=new Map<symbol,number>();
 async function acquire(){const deadline=Date.now()+waitMs;
  while(true){const now=Date.now();for(const [token,until] of slots)if(until<=now)slots.delete(token);
   if(slots.size<max){const token=Symbol();slots.set(token,now+holdMs);return token;}
   if(now>=deadline)throw Error('Public provider is busy.');
   await new Promise<void>(resolve=>setTimeout(resolve,25));
  }
 }
 return {acquire,release:(token:symbol)=>{slots.delete(token);}};
}
