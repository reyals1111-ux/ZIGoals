import {beginPendingWork,ownPendingWork,waitForPendingWork,workIsPending,createRequestAdmission,type PendingWork} from '../pending-work';
/** Server adapter. Only API route modules import this module; never import it from a client component. */
import {CATALOG_FRESH_MS,MARKET_RETRY_MS,parseMarketCatalog,uniqueMarketRequests,type MarketQuoteRequest,type MarketCatalogAsset} from '../market-assets';
import {HISTORY_DAYS,historyRequestSchema,parseCoinHistory,RWA_HISTORY_UNAVAILABLE,type MarketHistoryRequest} from '../market-history';
import {parseMarketInsights,INSIGHTS_UNAVAILABLE,type MarketInsightsLoadResult} from '../market-insights';
import {boundedQuoteText,parseCoinQuotes,parseRwaQuotes,type MarketQuote} from '../market-quotes';
export const PROVIDER_REQUESTS_PER_MINUTE=12;
export const PROVIDER_MAX_IN_FLIGHT=2;
export type ProviderBatch={url:string;requests:MarketQuoteRequest[];kind:'coin'|'rwa'};
export function buildCoinGeckoRequests(raw:readonly MarketQuoteRequest[]):ProviderBatch[]{
 const requests=uniqueMarketRequests(raw);if(requests.some(r=>r.marketRef.kind==='rwa'&&r.currency!=='USD'))throw Error('CoinGecko RWA references support USD only.');const batches:ProviderBatch[]=[];
 for(const kind of ['coin','rwa'] as const){const selected=requests.filter(r=>r.marketRef.kind===kind);const ids=[...new Set(selected.map(r=>r.marketRef.id))];const size=kind==='coin'?250:250;
 for(let i=0;i<ids.length;i+=size){const chunk=ids.slice(i,i+size),members=selected.filter(r=>chunk.includes(r.marketRef.id));const url=new URL(`https://api.coingecko.com/api/v3/${kind==='coin'?'simple/price':'rwas/markets'}`);url.searchParams.set('ids',chunk.join(','));if(kind==='coin'){url.searchParams.set('vs_currencies',[...new Set(members.map(r=>r.currency.toLowerCase()))].join(','));url.searchParams.set('include_last_updated_at','true');}else{url.searchParams.set('per_page','250');url.searchParams.set('page','1');}url.searchParams.set('precision','full');batches.push({url:url.toString(),requests:members,kind});}}
 return batches;
}
export function createCoinGeckoProvider({key,fetcher=fetch,clock=()=>Date.now()}:{key:()=>string|undefined;fetcher?:typeof fetch;clock?:()=>number}){
 // Admission is shared by catalogs, quotes, history and insights within this server process.
 const attempts:number[]=[];const admission=createRequestAdmission(PROVIDER_MAX_IN_FLIGHT,11000);
 async function read(url:string,limit:number):Promise<string>{
 if(typeof window!=='undefined')throw Error('CoinGecko is server-only.');const token=key();if(!token)throw Error('CoinGecko market data unavailable.');
 const now=clock();while(attempts.length&&attempts[0]!<=now-MARKET_RETRY_MS)attempts.shift();if(attempts.length>=PROVIDER_REQUESTS_PER_MINUTE)throw Error('CoinGecko market data unavailable.');attempts.push(now);const permit=await admission.acquire();
 // Workers supports manual redirects; every redirect is rejected before reading its body.
 try{const response=await fetcher(url,{method:'GET',credentials:'omit',headers:{Accept:'application/json','x-cg-demo-api-key':token},redirect:'manual',referrerPolicy:'no-referrer',cache:'no-store',signal:AbortSignal.timeout(10000)});if(!response.ok||response.redirected)throw Error('Unavailable');return await boundedQuoteText(response,limit);}catch{throw Error('CoinGecko market data unavailable.');}finally{admission.release(permit);}
 }
 async function quotes(requests:readonly MarketQuoteRequest[]):Promise<MarketQuote[]>{const result:MarketQuote[]=[];for(const batch of buildCoinGeckoRequests(requests)){const text=await read(batch.url,1024*1024);result.push(...(batch.kind==='coin'?parseCoinQuotes(text,batch.requests,clock()):parseRwaQuotes(text,batch.requests,clock())));}return result;}
 let assets:MarketCatalogAsset[]=[],fetchedAt=0,nextAttempt=0,error:string|null=null,pending:PendingWork|null=null;
 async function catalog(){
 if(pending){const waiting=pending;if(!await waitForPendingWork(waiting))return {assets,error:'Market catalog unavailable. Last verified catalog is retained; manual valuation remains available.',fetchedAt:fetchedAt?new Date(fetchedAt).toISOString():null,stale:!fetchedAt||clock()-fetchedAt>=CATALOG_FRESH_MS};if(pending===waiting)pending=null;}
 const now=clock();if(!pending&&now>=nextAttempt&&(!assets.length||now-fetchedAt>=CATALOG_FRESH_MS)){
 nextAttempt=now+MARKET_RETRY_MS;const work=beginPendingWork();pending=work;
 await ownPendingWork(work,(async()=>{try{
 const results=await Promise.allSettled([read('https://api.coingecko.com/api/v3/coins/list?include_platform=true',12*1024*1024),read('https://api.coingecko.com/api/v3/rwas/list',2*1024*1024)]);
 if(results[0].status!=='fulfilled'||results[1].status!=='fulfilled')throw Error('Unavailable');
 const verified=[...parseMarketCatalog(results[0].value,'coin'),...parseMarketCatalog(results[1].value,'rwa')];
 if(pending===work&&workIsPending(work)){assets=verified;fetchedAt=clock();error=null;}
 }catch{if(pending===work)error='Market catalog unavailable. Last verified catalog is retained; manual valuation remains available.';}
 finally{work.done=true;if(pending===work)pending=null;}})());}
 return {assets,error:error??(!assets.length?'Market catalog unavailable. Last verified catalog is retained; manual valuation remains available.':null),fetchedAt:fetchedAt?new Date(fetchedAt).toISOString():null,stale:!fetchedAt||clock()-fetchedAt>=CATALOG_FRESH_MS};
 }
 async function history(raw:MarketHistoryRequest){const request=historyRequestSchema.parse(raw);if(request.marketRef.kind!=='coin')throw Error(RWA_HISTORY_UNAVAILABLE);
 const url=new URL(`https://api.coingecko.com/api/v3/coins/${encodeURIComponent(request.marketRef.id)}/market_chart`);url.searchParams.set('vs_currency',request.currency.toLowerCase());url.searchParams.set('days',String(HISTORY_DAYS[request.range]));url.searchParams.set('precision','full');
 return parseCoinHistory(await read(url.toString(),1024*1024),request,clock());}
 async function insights(raw:readonly MarketQuoteRequest[]):Promise<MarketInsightsLoadResult>{
 const requests=uniqueMarketRequests(raw),result:MarketInsightsLoadResult={entries:[],error:null};
 for(const kind of ['coin','rwa'] as const)for(const currency of (kind==='coin'?['USD','EUR']:['USD']) as Array<'USD'|'EUR'>){
 const selected=requests.filter(r=>r.marketRef.kind===kind&&(kind==='rwa'||r.currency===currency));const ids=[...new Set(selected.map(r=>r.marketRef.id))];
 for(let offset=0;offset<ids.length;offset+=250){const chunk=ids.slice(offset,offset+250),members=selected.filter(r=>chunk.includes(r.marketRef.id));const url=new URL(`https://api.coingecko.com/api/v3/${kind==='coin'?'coins':'rwas'}/markets`);url.searchParams.set('ids',chunk.join(','));url.searchParams.set('per_page','250');url.searchParams.set('page','1');url.searchParams.set('sparkline','true');url.searchParams.set('price_change_percentage','24h');url.searchParams.set('precision','full');if(kind==='coin')url.searchParams.set('vs_currency',currency.toLowerCase());
 try{const entries=parseMarketInsights(await read(url.toString(),4*1024*1024),members,clock());result.entries.push(...entries);if(entries.length!==members.length)result.error=INSIGHTS_UNAVAILABLE;}catch{result.error=INSIGHTS_UNAVAILABLE;}
 }}return result;
 }
 return {quotes,catalog,history,insights};
}
