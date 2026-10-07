import {marketRequestKey,MARKET_RETRY_MS,uniqueMarketRequests,type MarketQuoteRequest} from './market-assets';
import {DETAIL_FRESH_MS,DETAIL_UNAVAILABLE,detailIsStale,type MarketDetail,type MarketDetailAnswer,type MarketDetailResult} from './market-detail';

export type MarketDetailSnapshot={results:Record<string,MarketDetailResult>;loading:boolean;now:number};
export const MAX_DETAILS=500;
/**
 * Session W Part 15: a tab- or process-local cache of public market details (no storage, no portfolio). One load at a
 * time; a pair is asked again only once its details are 15 minutes old (or on an explicit refresh), never sooner than a
 * minute after the last attempt. A newer observation replaces an older one, never the reverse.
 */
export function createMarketDetailCache(load:(requests:readonly MarketQuoteRequest[],force:boolean)=>Promise<MarketDetailAnswer>,clock=()=>Date.now()){
 const rows=new Map<string,MarketDetail>(),errors=new Map<string,string|null>(),attempts=new Map<string,number>(),listeners=new Set<()=>void>();
 let state:MarketDetailSnapshot={results:{},loading:false,now:clock()},inflight:Promise<void>|null=null;
 function emit(){
  const now=clock(),results:MarketDetailSnapshot['results']={};
  for(const key of new Set([...attempts.keys(),...rows.keys()])){const detail=rows.get(key)??null;results[key]={detail,error:errors.get(key)??null,stale:!detail||detailIsStale(detail,now)};}
  state={...state,results,now};for(const listener of listeners)listener();
 }
 function trim(){while(rows.size>MAX_DETAILS)rows.delete(rows.keys().next().value!);while(attempts.size>MAX_DETAILS){const first=attempts.keys().next().value!;attempts.delete(first);errors.delete(first);}}
 async function refresh(raw:readonly MarketQuoteRequest[],force=false):Promise<void>{
  const requests=uniqueMarketRequests(raw);if(!requests.length)return;
  while(inflight)await inflight;
  const now=clock(),needed=requests.filter(request=>{const key=marketRequestKey(request),row=rows.get(key);return now>=(attempts.get(key)??0)&&(force||!row||now-Date.parse(row.fetchedAt)>=DETAIL_FRESH_MS);});
  if(!needed.length)return;
  for(const request of needed)attempts.set(marketRequestKey(request),now+MARKET_RETRY_MS);
  state={...state,loading:true};emit();
  inflight=(async()=>{
   try{
    const answer=await load(needed,force);
    for(const request of needed){
     const key=marketRequestKey(request),result=answer.results[key],detail=result?.detail??null,previous=rows.get(key);
     if(detail&&(!previous||Date.parse(detail.observedAt??detail.fetchedAt)>=Date.parse(previous.observedAt??previous.fetchedAt))){rows.delete(key);rows.set(key,detail);}
     errors.set(key,result?result.error:DETAIL_UNAVAILABLE);
    }
    trim();
   }catch{for(const request of needed)errors.set(marketRequestKey(request),DETAIL_UNAVAILABLE);}
   finally{inflight=null;state={...state,loading:false};emit();}
  })();
  await inflight;
 }
 return {getSnapshot:()=>state,subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};},refresh,tick:emit};
}
