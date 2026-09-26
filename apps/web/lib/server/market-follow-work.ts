import type {PublicMarketWork} from './market-coordinator';
import type {MarketCommand} from './market-charged-read';
/** The follower owns only its registration. Its deadline/cancellation cannot cancel
 * a shared provider attempt or extend the owner's publication lease. */
export async function followMarketWork(work:PublicMarketWork,initial:Record<string,unknown>,{command,signal,waitMs=1000}:{command:MarketCommand;signal?:AbortSignal;waitMs?:number}){
 if(initial.status!=='WAITING'||signal?.aborted)return initial;
 let id:string|undefined,last=initial;const deadline=Date.now()+Math.min(1000,Math.max(0,waitMs));
 try{
  if(Date.now()>=deadline)return initial;
  const registered=await command({action:'follow',work,waitMs:Math.max(1,Math.floor(deadline-Date.now()))});last={...last,...registered};if(registered.status!=='WAITING'||typeof registered.id!=='string')return last;id=registered.id;
  while(!signal?.aborted&&Date.now()<deadline){
   await new Promise<void>(resolve=>{const done=()=>{clearTimeout(timer);signal?.removeEventListener('abort',done);resolve();};const timer=setTimeout(done,Math.min(50,Math.max(0,deadline-Date.now())));signal?.addEventListener('abort',done,{once:true});if(signal?.aborted)done();});
   if(signal?.aborted||Date.now()>=deadline)break;
   const current=await command({action:'poll',id});last={...last,...current};if(current.ok!==true||current.status!=='WAITING')return last;
  }
  return {...last,ok:false,reason:signal?.aborted?'WAITER_CANCELLED':'FOLLOWER_EXPIRED',status:'WAITING'};
 }finally{if(id)await command({action:'forget',id}).catch(()=>{});}
}
