import type {PublicMarketWork} from './market-coordinator';
import type {MarketCommand} from './market-charged-read';
import {MARKET_POLL_MS,marketPause} from './market-dispatch-wait';
/** A request's followers, polled together with one `poll-many` at most every 250 ms until each is answered or
 * `waitMs` (at most 1 s from `start`) has passed. The last poll lands at the deadline, so a publication made just
 * before it is not reported as a timeout. Abort forgets the registrations still open. A follower owns only its
 * registration: it never cancels a shared provider attempt or extends the owner's publication lease. */
export async function followMarketWorks(items:{id:string;work:PublicMarketWork}[],{command,signal,cancelToken,waitMs=1000,start=Date.now()}:{command:MarketCommand;signal?:AbortSignal;cancelToken?:string;waitMs?:number;start?:number}){
 const results:(Record<string,unknown>|undefined)[]=items.map(()=>undefined),deadline=start+Math.min(1000,Math.max(0,waitMs));
 const open=()=>items.flatMap((item,index)=>results[index]?[]:[{...item,index}]);
 // Bounded by count as well as by time (at most 4 polls), so a stopped clock cannot make it poll forever.
 const polls=Math.max(1,Math.ceil((deadline-Date.now())/MARKET_POLL_MS));
 try{
  for(let poll=1;poll<=polls&&open().length&&!signal?.aborted;poll++){
   await marketPause(Math.min(MARKET_POLL_MS,deadline-Date.now()),signal);if(signal?.aborted)break;
   const pending=open(),last=poll===polls||Date.now()>=deadline;
   const polled=await command({action:'poll-many',followers:pending.map(({id,work})=>({id,work})),...(cancelToken?{cancelToken}:{})});
   const rows=Array.isArray(polled.followers)?polled.followers as Record<string,unknown>[]:[];
   for(const [n,{index}] of pending.entries()){
    const row=rows[n];
    if(polled.ok!==true||!row)results[index]={ok:false,reason:typeof polled.reason==='string'?polled.reason:'UNKNOWN'};
    else if(row.ok!==true||row.status!=='WAITING')results[index]=row;
    // The account may not have reached the registration's deadline yet; the registration lapses there by itself.
    else if(last)results[index]={...row,ok:false,reason:'FOLLOWER_EXPIRED'};
   }
   if(last)break;
  }
 }finally{
  const left=open();
  if(left.length&&signal?.aborted)await command({action:'forget-many',ids:left.map(({id})=>id)}).catch(()=>{});
 }
 return items.map((_,index)=>results[index]??{ok:false,reason:signal?.aborted?'WAITER_CANCELLED':'FOLLOWER_EXPIRED',status:'WAITING'});
}
