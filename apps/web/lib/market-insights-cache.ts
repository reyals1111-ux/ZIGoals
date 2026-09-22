import {beginPendingWork,ownPendingWork,waitForPendingWork,workIsPending,type PendingWork} from './pending-work';
import {marketRequestKey,MARKET_RETRY_MS,uniqueMarketRequests,type MarketQuoteRequest} from './market-assets';
import {INSIGHTS_FRESH_MS,INSIGHTS_UNAVAILABLE,insightIsStale,verifiedMarketInsight,type MarketInsight,type MarketInsightsLoadResult,type MarketInsightsSnapshot} from './market-insights';
export const PUBLIC_INSIGHTS_KEY='zigoals:public-market-insights:v1';
export const MAX_INSIGHTS=2000;
export const MAX_INSIGHTS_BYTES=32*1024*1024;
/** Process/tab-local bounded public cache. No portfolio, wallet or private storage is accepted. */
export function createMarketInsightsCache(load:(requests:readonly MarketQuoteRequest[],force?:boolean)=>Promise<MarketInsightsLoadResult>,clock=()=>Date.now()){
 const rows=new Map<string,MarketInsight>(),attempts=new Map<string,number>(),errors=new Map<string,string|null>(),listeners=new Set<()=>void>();
 let state:MarketInsightsSnapshot={entries:[],results:{},loading:false,error:null,now:clock()},pending:PendingWork|null=null,storage:Pick<Storage,'getItem'|'setItem'>|undefined;
 function emit(){const results:MarketInsightsSnapshot['results']={};for(const key of new Set([...attempts.keys(),...rows.keys()])){const insight=rows.get(key)??null;results[key]={insight,error:errors.get(key)??null,stale:!insight||insightIsStale(insight,clock())};}state={...state,entries:[...rows.values()],results,now:clock()};for(const listener of listeners)listener();}
 function trim(){while(rows.size>MAX_INSIGHTS||JSON.stringify([...rows.values()]).length>MAX_INSIGHTS_BYTES)rows.delete(rows.keys().next().value!);while(attempts.size>MAX_INSIGHTS){const first=attempts.keys().next().value!;attempts.delete(first);errors.delete(first);}}
 function hydrate(store:Pick<Storage,'getItem'|'setItem'>){storage=store;try{const text=store.getItem(PUBLIC_INSIGHTS_KEY);if(!text||text.length>MAX_INSIGHTS_BYTES)return;const parsed:unknown=JSON.parse(text);if(!Array.isArray(parsed)||parsed.length>MAX_INSIGHTS)return;const verified=parsed.map(raw=>verifiedMarketInsight(raw,raw,clock()));if(new Set(verified.map(marketRequestKey)).size!==verified.length)return;for(const entry of verified)rows.set(marketRequestKey(entry),entry);emit();}catch{/* Invalid public caches are discarded. */}}
 async function refresh(raw:readonly MarketQuoteRequest[],force=false):Promise<void>{
 const requests=uniqueMarketRequests(raw);if(!requests.length)return;if(pending){if(!await waitForPendingWork(pending)){for(const request of requests)if(!rows.has(marketRequestKey(request)))errors.set(marketRequestKey(request),INSIGHTS_UNAVAILABLE);emit();return;}if(!workIsPending(pending)){pending=null;state={...state,loading:false};}return refresh(requests,force);}
 const now=clock(),needed=requests.filter(request=>{const key=marketRequestKey(request),entry=rows.get(key);return now>=(attempts.get(key)??0)&&(force||!entry||now-Date.parse(entry.fetchedAt)>=INSIGHTS_FRESH_MS);});if(!needed.length)return;
 for(const request of needed)attempts.set(marketRequestKey(request),now+MARKET_RETRY_MS);state={...state,loading:true};emit();
 const work=beginPendingWork();pending=work;await ownPendingWork(work,(async()=>{try{
 const result=await load(needed,force);if(result.entries.length>needed.length)throw Error('Invalid insight count.');const keys=new Set<string>();const valid=result.entries.map(rawEntry=>{const key=marketRequestKey(rawEntry),request=needed.find(r=>marketRequestKey(r)===key);if(!request||keys.has(key))throw Error('Invalid insight identity.');keys.add(key);return verifiedMarketInsight(rawEntry,request,clock());});
 if(keys.size!==needed.length&&!result.error)throw Error('Incomplete insights.');
 if(pending!==work)return;if(!workIsPending(work))throw Error('Market work expired.');
 for(const request of needed)errors.set(marketRequestKey(request),INSIGHTS_UNAVAILABLE);
 for(const entry of valid){const key=marketRequestKey(entry),previous=rows.get(key);if(previous&&Date.parse(entry.observedAt??entry.fetchedAt)<Date.parse(previous.observedAt??previous.fetchedAt))continue;rows.delete(key);rows.set(key,{...entry,logoUrl:entry.logoUrl??previous?.logoUrl??null});errors.set(key,result.errors?.[key]?INSIGHTS_UNAVAILABLE:null);}
 state={...state,error:[...errors.values()].some(Boolean)?INSIGHTS_UNAVAILABLE:null};trim();try{storage?.setItem(PUBLIC_INSIGHTS_KEY,JSON.stringify([...rows.values()]));}catch{/* Persistence is optional. */}
 }catch{if(pending!==work)return;for(const request of needed)errors.set(marketRequestKey(request),INSIGHTS_UNAVAILABLE);state={...state,error:INSIGHTS_UNAVAILABLE};}finally{work.done=true;if(pending===work){trim();state={...state,loading:false};pending=null;emit();}}})());
 }
 return {getSnapshot:()=>state,subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};},hydrate,refresh,tick:emit};
}
