type Command=(command:{action:string;id:string})=>Promise<Record<string,unknown>>;
/** Only a reservation is held while waiting. A waiter has a separate bounded
 * lifetime; abort/expiry is returned to its caller, which cancels the original
 * undispatched reservation. It never creates a replacement charged attempt. */
export async function waitForMarketDispatch(command:Command,id:string,{signal,maxWaitMs=2000}:{signal?:AbortSignal;maxWaitMs?:number}={}){
 const deadline=Date.now()+Math.min(2000,Math.max(0,maxWaitMs));
 const stopped=()=>signal?.aborted?'WAITER_CANCELLED':Date.now()>=deadline?'QUEUE_WAIT_EXPIRED':null;
 let reason=stopped();if(reason)return {ok:false,reason};
 const reserved=await command({action:'reserve',id});if(reserved.ok!==true)return reserved;
 for(;;){
  reason=stopped();if(reason)return {ok:false,reason};
  const owned=await command({action:'own',id});
  if(owned.ok===true){reason=stopped();return reason?{ok:false,reason}:command({action:'dispatch',id});}
  if(!['CONCURRENT_LIMIT','QUEUE_WAIT'].includes(String(owned.reason)))return owned;
  await new Promise<void>(resolve=>{
   const finish=()=>{clearTimeout(timer);signal?.removeEventListener('abort',finish);resolve();};
   const timer=setTimeout(finish,Math.min(25,Math.max(0,deadline-Date.now())));signal?.addEventListener('abort',finish,{once:true});if(signal?.aborted)finish();
  });
 }
}
