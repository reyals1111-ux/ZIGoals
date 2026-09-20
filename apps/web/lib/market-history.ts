import {z} from 'zod';
import {marketAssetRefSchema,marketRequestKey,MARKET_RETRY_MS} from './market-assets';
import {boundedQuoteText,QUOTE_FRESH_MS} from './market-quotes';
import {decimalLexeme,exactMarketJson,JsonNumber} from './exact-market-json';

export const HISTORY_DAYS={'1d':1,'7d':7,'30d':30,'90d':90,'1y':365} as const;
export type HistoryRange=keyof typeof HISTORY_DAYS;
export type ChartHistoryRange=HistoryRange|'all';
export const historyRequestSchema=z.object({marketRef:marketAssetRefSchema,currency:z.enum(['USD','EUR']),range:z.enum(['1d','7d','30d','90d','1y'])}).strict();
export type MarketHistoryRequest=z.infer<typeof historyRequestSchema>;
export const historyPointSchema=z.object({at:z.iso.datetime(),value:z.string().regex(/^(0|[1-9]\d{0,77})$/),decimals:z.number().int().min(0).max(30)}).strict();
export type HistoryPoint=z.infer<typeof historyPointSchema>;
export const MAX_HISTORY_POINTS=2500;
export const MAX_HISTORY_CACHE_ENTRIES=24;
export const MAX_HISTORY_CACHE_BYTES=2*1024*1024;
const DAY_MS=86400000;
const historySchema=historyRequestSchema.extend({source:z.literal('CoinGecko'),fetchedAt:z.iso.datetime(),points:z.array(historyPointSchema).max(MAX_HISTORY_POINTS)}).strict();
export type MarketHistory=z.infer<typeof historySchema>;
export type MarketHistoryResult={history:MarketHistory|null;error:string|null;stale:boolean;nextAttemptAt:number};
export const HISTORY_UNAVAILABLE='Market history is unavailable. Saved local observations remain available.';
export const RWA_HISTORY_UNAVAILABLE='CoinGecko tokenized RWA reference: this chart uses saved local price observations. Earlier market history is unavailable.';
export const historyRequestKey=(request:MarketHistoryRequest)=>`${marketRequestKey(request)}:${request.range}`;
export function historyIsStale(history:MarketHistory,now=Date.now()){
 const fetched=Date.parse(history.fetchedAt);return !Number.isFinite(now)||fetched>now+60000||now-fetched>=QUOTE_FRESH_MS;
}
export function verifiedMarketHistory(raw:unknown,request:MarketHistoryRequest,now=Date.now()):MarketHistory{
 const history=historySchema.parse(raw);
 if(history.marketRef.kind!=='coin'||historyRequestKey(history)!==historyRequestKey(request)||Date.parse(history.fetchedAt)>now+60000)throw Error('Invalid market history identity or time.');
 let previous=0;
 for(const point of history.points){const at=Date.parse(point.at);if(at<=previous||at>now+60000||at<Date.parse(history.fetchedAt)-(HISTORY_DAYS[request.range]+1)*DAY_MS||point.value==='0')throw Error('Invalid history observation.');previous=at;}
 return history;
}
/** Demo endpoint: https://docs.coingecko.com/demo/reference/coins-id-market-chart
 * Numeric tokens are parsed before JavaScript can round them. Prices only; unused market metrics stay public and are discarded. */
export function parseCoinHistory(text:string,raw:MarketHistoryRequest,now=Date.now()):MarketHistory{
 const request=historyRequestSchema.parse(raw);if(request.marketRef.kind!=='coin')throw Error(RWA_HISTORY_UNAVAILABLE);
 const data=exactMarketJson(text,1024*1024,30000);
 if(!data||typeof data!=='object'||Array.isArray(data)||data instanceof JsonNumber)throw Error('Invalid history response.');
 const prices=(data as Record<string,unknown>).prices;
 if(!Array.isArray(prices)||prices.length>MAX_HISTORY_POINTS)throw Error('Invalid history observations.');
 const points=prices.map(row=>{
  if(!Array.isArray(row)||row.length!==2||!(row[0] instanceof JsonNumber)||!/^\d+$/.test(row[0].lexeme))throw Error('Invalid history observation.');
  const at=Number(row[0].lexeme);if(!Number.isSafeInteger(at)||at<=0||at>now+60000)throw Error('Invalid history time.');
  const exact=decimalLexeme(row[1]);return {at:new Date(at).toISOString(),value:exact.price,decimals:exact.priceDecimals};
 });
 return verifiedMarketHistory({...request,source:'CoinGecko',fetchedAt:new Date(now).toISOString(),points},request,now);
}
/** Local observations never enter the public cache or transport. Invalid local input is ignored as a whole. */
export function validLocalHistory(raw:readonly HistoryPoint[],now=Date.now()):HistoryPoint[]{
 const parsed=z.array(historyPointSchema).max(MAX_HISTORY_POINTS).safeParse(raw);if(!parsed.success)return [];
 const points=parsed.data.filter(p=>Date.parse(p.at)>0&&Date.parse(p.at)<=now+60000).sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
 return [...new Map(points.map(p=>[Date.parse(p.at),p])).values()];
}
export function formatHistoryValue(raw:HistoryPoint):string{
 const point=historyPointSchema.parse(raw);if(!point.decimals)return point.value;
 const padded=point.value.padStart(point.decimals+1,'0');return `${padded.slice(0,-point.decimals)}.${padded.slice(-point.decimals)}`;
}
export function historyPointsForRange(points:readonly HistoryPoint[],range:ChartHistoryRange):HistoryPoint[]{
 if(!points.length||range==='all')return [...points];const end=Date.parse(points[points.length-1]!.at);return points.filter(p=>Date.parse(p.at)>=end-HISTORY_DAYS[range]*DAY_MS);
}
export function availableHistoryRanges(points:readonly HistoryPoint[]):ChartHistoryRange[]{
 if(points.length<2)return [];const span=Date.parse(points[points.length-1]!.at)-Date.parse(points[0]!.at);
 return [...(Object.keys(HISTORY_DAYS) as HistoryRange[]).filter(range=>span>=HISTORY_DAYS[range]*DAY_MS&&historyPointsForRange(points,range).length>=2),'all'];
}
/** Small process/tab-local LRU, shared pending work and retry gating. No persistent or private storage. */
export function createMarketHistoryCache(loader:(request:MarketHistoryRequest,refresh:boolean)=>Promise<MarketHistory|MarketHistoryResult>,clock=()=>Date.now()){
 type Entry={history:MarketHistory|null;error:string|null;nextAttemptAt:number;pending?:Promise<void>};
 const entries=new Map<string,Entry>();
 const bytes=()=>[...entries.values()].reduce((sum,e)=>sum+(e.history?JSON.stringify(e.history).length:0),0);
 function trim(keep:string){
  while(entries.size>MAX_HISTORY_CACHE_ENTRIES||bytes()>MAX_HISTORY_CACHE_BYTES){const oldest=[...entries.keys()].find(key=>key!==keep&&!entries.get(key)?.pending);if(!oldest)break;entries.delete(oldest);}
 }
 async function load(raw:MarketHistoryRequest,refresh=false):Promise<MarketHistoryResult>{
  const request=historyRequestSchema.parse(raw),now=clock(),key=historyRequestKey(request);
  if(request.marketRef.kind==='rwa')return {history:null,error:RWA_HISTORY_UNAVAILABLE,stale:true,nextAttemptAt:now+MARKET_RETRY_MS};
  let entry=entries.get(key);
  if(!entry){
   if(entries.size>=MAX_HISTORY_CACHE_ENTRIES){const oldest=[...entries.keys()].find(k=>!entries.get(k)?.pending);if(oldest)entries.delete(oldest);else return {history:null,error:HISTORY_UNAVAILABLE,stale:true,nextAttemptAt:now+MARKET_RETRY_MS};}
   entry={history:null,error:null,nextAttemptAt:0};entries.set(key,entry);
  }else{entries.delete(key);entries.set(key,entry);}
  const target=entry;
  if(!target.pending&&now>=target.nextAttemptAt&&(refresh||!target.history||historyIsStale(target.history,now))){
   target.nextAttemptAt=now+MARKET_RETRY_MS;
   target.pending=(async()=>{
    try{
     const loaded=await loader(request,refresh),result='history' in loaded?loaded:{history:loaded,error:null};
     if(!result.history)throw Error('Unavailable');
     const history=verifiedMarketHistory(result.history,request,clock());
     if(!history.points.length)throw Error('Unavailable');
     if(target.history&&Date.parse(history.fetchedAt)<Date.parse(target.history.fetchedAt))throw Error('Older history');
     target.history=history;target.error=result.error?HISTORY_UNAVAILABLE:null;
    }catch{target.error=target.history?'Market history refresh is unavailable. Last verified observations are retained.':HISTORY_UNAVAILABLE;}
    finally{target.pending=undefined;trim(key);}
   })();
  }
  await target.pending;
  return {history:target.history,error:target.error,stale:!target.history||historyIsStale(target.history,clock()),nextAttemptAt:target.nextAttemptAt};
 }
 return {load};
}
export async function fetchPublicMarketHistory(raw:MarketHistoryRequest,refresh=false,fetcher:typeof fetch=fetch,now=Date.now()):Promise<MarketHistoryResult>{
 const request=historyRequestSchema.parse(raw);
 const response=await fetcher('/api/market-history',{method:'POST',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',headers:{'Content-Type':'application/json'},body:JSON.stringify({request,refresh}),signal:AbortSignal.timeout(15000)});
 const body=z.object({history:historySchema.nullable(),error:z.string().max(300).nullable(),stale:z.boolean(),nextAttemptAt:z.number().int().nonnegative().safe()}).strict().parse(JSON.parse(await boundedQuoteText(response,1024*1024)));
 if(!response.ok&&!body.history)throw Error(HISTORY_UNAVAILABLE);
 return {...body,history:body.history?verifiedMarketHistory(body.history,request,now):null,error:body.error?HISTORY_UNAVAILABLE:null};
}
