import {followMarketWork} from './market-follow-work';
import {waitForMarketDispatch} from './market-dispatch-wait';
import {marketRequestKey,uniqueMarketRequests,type MarketQuoteRequest} from '../market-assets';
import {boundedQuoteText,cleanupMarketBody,parseCoinQuoteResults,parseCoinTokenQuote,parseRwaQuoteResults,type MarketQuote} from '../market-quotes';
import {isJsonMediaType} from '../json-media-type';
import {ProviderTransportError,ProviderValidationError} from '../provider-validation';
import {marketPairEnvelope,type PairFailure} from './market-pair-result';
import {ProviderFailure,providerHttpFailure,parseProviderEvidence,type ProviderFailureCategory} from './provider-failure';
import {chargedMarketRead} from './market-charged-read';
import type {WorkLease} from './market-coordinator';
const ZIG_CONTRACT='0xb2617246d0c6c0087f18703d576831899ca94f01';
type Command=(command:unknown)=>Promise<Record<string,unknown>>;
const denied=(reason:unknown):ProviderFailureCategory=>['PAIR_BREAKER_OPEN','QUEUE_WAIT','QUEUE_WAIT_EXPIRED','WAITER_CANCELLED','BREAKER_OPEN','CONCURRENT_LIMIT','QUEUE_LIMIT','FENCED','RESERVATION_EXPIRED','OWNERSHIP_EXPIRED'].includes(String(reason))?'LOCAL_QUEUE':['POLICY_UNAVAILABLE','POLICY_CHANGED','CLOCK_OR_PERIOD','MINUTE_LIMIT','MONTHLY_LIMIT','MONITORING_LIMIT','OPTIONAL_LIMIT','RETENTION_CAPACITY','CACHE_CAPACITY'].includes(String(reason))?'LOCAL_BUDGET':'UNKNOWN';
/** Quote ownership/publication is durable. Every physical batch, reference read and
 * documented ZIG token fallback receives its own account-wide charged attempt. */
export async function dispatchDurableQuotes(raw:readonly MarketQuoteRequest[],{command,key,fetcher=fetch,clock=()=>Date.now(),signal,cancelToken}:{command:Command;key?:string;fetcher?:typeof fetch;clock?:()=>number;signal?:AbortSignal;cancelToken?:string}){
 const requests=uniqueMarketRequests(raw),quotes=new Map<string,MarketQuote>(),failures:PairFailure[]=[],followers:Promise<void>[]=[];
 const keyOf=marketRequestKey;
 const fail=(members:readonly MarketQuoteRequest[],category:ProviderFailureCategory)=>failures.push(...members.map(request=>({request,category})));
 if(requests.length>64){fail(requests,'LOCAL_QUEUE');return marketPairEnvelope(requests,[],failures,clock());}
 if(!key?.trim()){fail(requests,'AUTHENTICATION');return marketPairEnvelope(requests,[],failures,clock());}
 const owners:{request:MarketQuoteRequest;work:{operation:'quote';pair:MarketQuoteRequest};lease:WorkLease}[]=[];
 for(const request of requests){
  if(request.marketRef.kind==='rwa'&&request.currency!=='USD'){fail([request],'UNSUPPORTED');continue;}
  const work={operation:'quote' as const,pair:request};
  try{const acquired=await command({action:'acquire',work});
   if(acquired.quote){const evidence=marketPairEnvelope([request],[acquired.quote as MarketQuote],[],clock());quotes.set(keyOf(request),evidence.quotes[0]!);}
   if(acquired.ok!==true){fail([request],denied(acquired.reason));continue;}
   if(acquired.status==='CACHE_HIT')continue;
   if(acquired.status==='OWNER'){owners.push({request,work,lease:acquired.lease as WorkLease});continue;}
   followers.push(followMarketWork(work,acquired,{command,signal,cancelToken}).then(row=>{if(row.quote){const evidence=marketPairEnvelope([request],[row.quote as MarketQuote],[],clock());quotes.set(keyOf(request),evidence.quotes[0]!);}if(row.ok!==true||row.status!=='CACHE_HIT')fail([request],'LOCAL_QUEUE');}).catch(()=>{fail([request],'UNKNOWN');}));
  }catch{fail([request],'UNKNOWN');}
 }
 // ZIG has its own atomic response boundary, so its unavailable simple-price result
 // cannot erase independently verified non-ZIG evidence. Each group is charged once.
 for(const group of [owners.filter(o=>o.request.marketRef.kind==='coin'&&o.request.marketRef.id!=='zignaly'),owners.filter(o=>o.request.marketRef.kind==='coin'&&o.request.marketRef.id==='zignaly'),owners.filter(o=>o.request.marketRef.kind==='rwa')]){
  if(!group.length)continue;const members=group.map(o=>o.request);let operation:string|undefined,marked=false;
  try{
   const queued=await command({action:'enqueue',priority:'interactive',kind:'request',associations:group.map(({work,lease})=>({work,lease}))});
   if(queued.ok!==true||typeof queued.id!=='string')throw new ProviderFailure(denied(queued.reason));operation=queued.id;
   const admission=await waitForMarketDispatch(command,operation,{signal});if(admission.ok!==true)throw new ProviderFailure(denied(admission.reason));marked=true;
   const rwa=members[0]!.marketRef.kind==='rwa';const url=new URL(`https://api.coingecko.com/api/v3/${rwa?'rwas/markets':'simple/price'}`);url.searchParams.set('ids',[...new Set(members.map(r=>r.marketRef.id))].join(','));if(rwa){url.searchParams.set('per_page','250');url.searchParams.set('page','1');}else{url.searchParams.set('vs_currencies',[...new Set(members.map(r=>r.currency.toLowerCase()))].join(','));url.searchParams.set('include_last_updated_at','true');}url.searchParams.set('precision','full');
   let result:MarketQuote[]=[],invalidMembers:MarketQuoteRequest[]=[];
   try{
    const response=await fetcher(url.href,{method:'GET',headers:{Accept:'application/json','x-cg-demo-api-key':key},credentials:'omit',redirect:'manual',referrerPolicy:'no-referrer',cache:'no-store',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(8000)]):AbortSignal.timeout(8000)});
    const rejection=response.redirected?new ProviderFailure('UNKNOWN'):!response.ok?providerHttpFailure(response.status):!isJsonMediaType(response.headers.get('content-type'))?new ProviderFailure('MALFORMED'):null;
    if(rejection){await cleanupMarketBody(()=>response.body?.cancel()??Promise.resolve());throw rejection;}
    const text=await boundedQuoteText(response,1024*1024),parsed=parseProviderEvidence(()=>rwa?parseRwaQuoteResults(text,members,clock()):parseCoinQuoteResults(text,members,clock()));result=parsed.quotes;invalidMembers=parsed.failures;if(!result.length&&invalidMembers.length)throw new ProviderFailure('MALFORMED');
   }catch(error){
    // A failed/ambiguous send remains charged. If settlement itself is unconfirmed,
    // keep the durable DISPATCHED state; there is no cancellation or refund.
    const failure=signal?.aborted?new ProviderFailure('LOCAL_QUEUE'):error instanceof ProviderFailure?error:new ProviderFailure(error instanceof ProviderValidationError?'MALFORMED':error instanceof ProviderTransportError?error.category:error instanceof Error&&['TimeoutError','AbortError'].includes(error.name)?'TIMEOUT':error instanceof TypeError?'NETWORK':'UNKNOWN');
    await command({action:'settle',id:operation,outcome:'failure',category:failure.category,...(invalidMembers.length?{pairFailures:invalidMembers.map(pair=>({operation:'quote',pair}))}:{})}).catch(()=>{});
    if(!members.every(r=>r.marketRef.kind==='coin'&&r.marketRef.id==='zignaly')||['AUTHENTICATION','LOCAL_BUDGET','LOCAL_QUEUE'].includes(failure.category))throw failure;
    const fallbackUrl=new URL('https://api.coingecko.com/api/v3/simple/token_price/ethereum');fallbackUrl.searchParams.set('contract_addresses',ZIG_CONTRACT);fallbackUrl.searchParams.set('vs_currencies',[...new Set(members.map(r=>r.currency.toLowerCase()))].join(','));fallbackUrl.searchParams.set('include_last_updated_at','true');fallbackUrl.searchParams.set('precision','full');
    await chargedMarketRead(fallbackUrl,'token',64*1024,{command,key,fetcher,signal,validate:text=>{result=members.map(member=>parseCoinTokenQuote(text,member,ZIG_CONTRACT,clock()));},fallback:{parentId:operation!,associations:group.map(({work,lease})=>({work,lease})),onAttempt:id=>{operation=id;}}});invalidMembers=[];
   }
   const settled=await command({action:'settle',id:operation,outcome:'success',pairFailures:invalidMembers.map(pair=>({operation:'quote',pair}))});if(settled.ok!==true)throw new ProviderFailure('UNKNOWN');
   fail(invalidMembers,'MALFORMED');
   for(const quote of result){const member=group.find(o=>o.request.marketRef.id===quote.providerAssetId&&o.request.currency===quote.currency)!;const publication=await command({action:'publish',id:operation,work:member.work,quote});if(publication.ok===true)quotes.set(keyOf(member.request),quote);else fail([member.request],publication.reason==='MALFORMED'?'MALFORMED':'LOCAL_QUEUE');}
  }catch(error){if(operation&&!marked)await command({action:'cancel',id:operation}).catch(()=>{});fail(members,error instanceof ProviderFailure?error.category:'UNKNOWN');}
 }
 await Promise.all(followers);
 return marketPairEnvelope(requests,[...quotes.values()],failures,clock());
}
