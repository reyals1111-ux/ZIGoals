import type {PublicMarketWork,WorkLease} from './market-coordinator';
import type {MarketCommand} from './market-charged-read';
import {validateWorkEvidence,workEvidenceStale} from './market-evidence';
import {waitForAdmission} from './market-dispatch-wait';
import {followMarketWorks} from './market-follow-work';
import type {ProviderFailureCategory} from './provider-failure';
/** One provider read of a request. `members` index the request's works; `fallback` marks the ZIG price read whose
 * failure starts the documented token fallback. */
export type MarketGroup={charge:'quote'|'catalog'|'history'|'insights';members:number[];fallback?:boolean};
/** What one provider read verified: the outcome to settle, and the values to publish by work index. */
/** `notFound` marks a provider 404 of the read (Session S): the account then refuses that coin's history briefly. */
export type MarketRead={outcome:'success'|'failure';category?:ProviderFailureCategory;pairFailures?:number[];notFound?:boolean;values:{index:number;value:unknown}[]};
/** A work's answer: the newest usable evidence (fresh or degraded), and whether this request verified or found it. */
export type MarketItem={work:PublicMarketWork;value:unknown;ok:boolean;fresh:boolean;category?:ProviderFailureCategory};
type Context={command:MarketCommand;signal?:AbortSignal;cancelToken?:string;client?:string;clock?:()=>number};
type Attempt={group:number;id:string;state:string};
/** Account refusals as the sanitized failure vocabulary. */
export function deniedCategory(reason:unknown):ProviderFailureCategory{
 return ['PAIR_BREAKER_OPEN','QUEUE_WAIT','QUEUE_WAIT_EXPIRED','WAITER_CANCELLED','BREAKER_OPEN','CONCURRENT_LIMIT','QUEUE_LIMIT','FENCED','RESERVATION_EXPIRED','OWNERSHIP_EXPIRED','FOLLOWER_LIMIT','FOLLOWER_EXPIRED'].includes(String(reason))?'LOCAL_QUEUE':['POLICY_UNAVAILABLE','POLICY_CHANGED','CLOCK_OR_PERIOD','MINUTE_LIMIT','MONTHLY_LIMIT','MONITORING_LIMIT','OPTIONAL_LIMIT','RETENTION_CAPACITY','CACHE_CAPACITY','CLIENT_LIMIT','DAILY_LIMIT','HISTORY_LIMIT'].includes(String(reason))?'LOCAL_BUDGET':['UNKNOWN_ASSET','NOT_FOUND_RECENTLY'].includes(String(reason))?'UNSUPPORTED':'UNKNOWN';
}
/** One HTTP request's market work in the batched protocol (Session R1). The account sees, at most:
 * - one `acquire-many`: cache hits, leases, followers and the first provider group's admission;
 * - per provider read, one `complete`: settlement and publication, plus the next group's (or the ZIG token
 *   fallback's) admission; a group whose chain broke starts with one `admit-group`;
 * - `admit` polls while a slot is busy, and `poll-many` for followers, each at most every 250 ms;
 * - `cancel` for an attempt that was never dispatched, `forget-many` for followers of an aborted request.
 * None of these grows with the number of pairs. Provider groups run one after another, in the given order. */
export async function runMarketBatch(works:PublicMarketWork[],groups:MarketGroup[],read:(group:MarketGroup,owners:number[],fallback:boolean)=>Promise<MarketRead>,c:Context):Promise<MarketItem[]>{
 const now=()=>c.clock?.()??Date.now(),start=Date.now();
 const items:MarketItem[]=works.map(work=>({work,value:null,ok:false,fresh:false}));
 if(!works.length)return items;
 const fail=(indexes:number[],category:ProviderFailureCategory)=>{for(const i of indexes){items[i]!.ok=false;items[i]!.category=category;}};
 const answer=(i:number,raw:unknown,ok:boolean,category:ProviderFailureCategory)=>{
  const item=items[i]!;
  if(raw!==null&&raw!==undefined)try{item.value=validateWorkEvidence(works[i]!,raw,now());}catch{ok=false;category='MALFORMED';}
  item.fresh=item.value!==null&&!workEvidenceStale(works[i]!,item.value,now());
  item.ok=ok&&item.value!==null;if(!item.ok)item.category=ok?'UNKNOWN':category;
 };
 let acquired:Record<string,unknown>;
 try{acquired=await c.command({action:'acquire-many',works,...(groups.length?{groups:groups.map(({charge,members})=>({charge,members}))}:{}),follow:{waitMs:1000,...(c.cancelToken?{cancelToken:c.cancelToken}:{})},...(c.client?{client:c.client}:{})});}
 catch{fail(works.map((_,i)=>i),'UNKNOWN');return items;}
 const rows=Array.isArray(acquired.results)?acquired.results as Record<string,unknown>[]:[];
 if(acquired.ok!==true||rows.length!==works.length){fail(works.map((_,i)=>i),deniedCategory(acquired.reason));return items;}
 const leases=new Map<number,WorkLease>(),followers:{index:number;id:string}[]=[];
 for(const [i,row] of rows.entries()){
  const evidence=row.quote??row.value;
  if(row.ok===true&&row.status==='CACHE_HIT')answer(i,evidence,true,'UNKNOWN');
  else if(row.ok===true&&row.status==='OWNER'&&row.lease){answer(i,evidence,false,'UNKNOWN');leases.set(i,row.lease as WorkLease);delete items[i]!.category;}
  else if(row.ok===true&&row.status==='WAITING'&&typeof row.follower==='string'){answer(i,evidence,false,'LOCAL_QUEUE');followers.push({index:i,id:row.follower});}
  else answer(i,evidence,false,row.ok===true?'LOCAL_QUEUE':deniedCategory(row.reason));
 }
 const following=followers.length?followMarketWorks(followers.map(({index,id})=>({id,work:works[index]!})),{command:c.command,signal:c.signal,cancelToken:c.cancelToken,start}).then(answers=>{
  for(const [n,{index}] of followers.entries()){const row=answers[n]!;answer(index,row.quote??row.value,row.ok===true&&row.status==='CACHE_HIT','LOCAL_QUEUE');}
 },()=>fail(followers.map(({index})=>index),'UNKNOWN')):Promise.resolve();
 const owned=(group:MarketGroup)=>group.members.filter(m=>leases.has(m));
 const associations=(members:number[])=>members.map(m=>({work:works[m]!,lease:leases.get(m)!}));
 const first=(Array.isArray(acquired.attempts)?acquired.attempts as Record<string,unknown>[]:[])[0];
 let chained:Attempt|undefined=first?.ok===true&&typeof first.id==='string'?{group:Number(first.group),id:first.id,state:String(first.state)}:undefined;
 const refused=new Set<number>();let lost=false;
 for(const [g,group] of groups.entries()){
  const owners=owned(group);if(!owners.length||refused.has(g))continue;
  // An unconfirmed `complete` may have started the next read already: never start a second attempt for its leases.
  if(lost){fail(owners,'UNKNOWN');continue;}
  let attempt=chained?.group===g?chained:undefined;chained=undefined;
  if(!attempt){
   if(c.signal?.aborted){fail(owners,'LOCAL_QUEUE');continue;}
   const admitted=await c.command({action:'admit-group',charge:group.charge,associations:associations(owners),...(c.client?{client:c.client}:{})}).catch(()=>null);
   if(admitted?.ok!==true||typeof admitted.id!=='string'){fail(owners,admitted?deniedCategory(admitted.reason):'UNKNOWN');continue;}
   attempt={group:g,id:admitted.id,state:String(admitted.state)};
  }
  for(let fallback=false;;){
   if(attempt.state!=='DISPATCHED'){
    const admission=await waitForAdmission(c.command,attempt.id,{signal:c.signal}).catch(()=>({ok:false,reason:'UNKNOWN'}));
    // Never dispatched, so never charged: the attempt is cancelled and its leases released.
    if(admission.ok!==true){await c.command({action:'cancel',id:attempt.id}).catch(()=>{});fail(owners,deniedCategory(admission.reason));break;}
   }
   let result:MarketRead;try{result=await read(group,owners,fallback);}catch{result={outcome:'failure',category:'UNKNOWN',values:[]};}
   // Only this read's owners can be settled or published by it.
   result={...result,values:result.values.filter(({index})=>owners.includes(index)),pairFailures:result.pairFailures?.filter(index=>owners.includes(index))};
   const later=groups.findIndex((entry,n)=>n>g&&!refused.has(n)&&owned(entry).length>0);
   const toFallback=!fallback&&!!group.fallback&&result.outcome==='failure'&&!['AUTHENTICATION','LOCAL_BUDGET','LOCAL_QUEUE'].includes(result.category??'UNKNOWN');
   const next=!toFallback&&later>=0&&!c.signal?.aborted?{charge:groups[later]!.charge,associations:associations(owned(groups[later]!))}:undefined;
   const done=await c.command({action:'complete',id:attempt.id,outcome:result.outcome,...(result.category?{category:result.category}:{}),...(result.pairFailures?.length?{pairFailures:result.pairFailures.map(m=>works[m]!)}:{}),publish:result.values.map(({index,value})=>({work:works[index]!,value})),...(toFallback?{fallback:true}:{}),...(result.outcome==='failure'&&result.notFound?{notFound:true}:{}),...(next?{next}:{})}).catch(()=>null);
   // No settlement in the reply (lost, or STORAGE_UNAVAILABLE after a commit whose acknowledgement failed): the
   // transaction may have committed, the next read's admission included.
   if(!done||done.settled===undefined){lost=true;fail(owners,result.outcome==='failure'?result.category??'UNKNOWN':'UNKNOWN');break;}
   const started=done.next as Record<string,unknown>|undefined;
   if(toFallback&&started?.ok===true&&typeof started.id==='string'){attempt={group:g,id:started.id,state:String(started.state)};fallback=true;continue;}
   if(result.outcome==='failure'||done.ok!==true)fail(owners,result.outcome==='failure'?toFallback&&started?deniedCategory(started.reason):result.category??'UNKNOWN':'UNKNOWN');
   else{
    const published=Array.isArray(done.published)?done.published as Record<string,unknown>[]:[];
    for(const m of owners){
     const k=result.values.findIndex(({index})=>index===m),publication=published[k];
     if(k<0||!publication)fail([m],'MALFORMED');
     else if(publication.ok===true)answer(m,result.values[k]!.value,true,'UNKNOWN');
     else fail([m],publication.reason==='MALFORMED'?'MALFORMED':'LOCAL_QUEUE');
    }
   }
   if(next&&started){
    if(started.ok===true&&typeof started.id==='string')chained={group:later,id:started.id,state:String(started.state)};
    else{refused.add(later);fail(owned(groups[later]!),deniedCategory(started.reason));}
   }
   break;
  }
 }
 await following;
 // A lease outside every group (a caller without provider reads) gets no answer from this request.
 for(const i of leases.keys())if(!items[i]!.ok&&!items[i]!.category)items[i]!.category='UNKNOWN';
 return items;
}
