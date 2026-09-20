/** Server adapter. Only API route modules import this module; never import it from a client component. */
import {CATALOG_FRESH_MS,MARKET_RETRY_MS,parseMarketCatalog,uniqueMarketRequests,type MarketQuoteRequest,type MarketCatalogAsset} from '../market-assets';
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
 // Admission is shared by catalogs and quote batches within this server process.
 const attempts:number[]=[];let inFlight=0;const waiting:Array<()=>void>=[];
 async function acquire(){if(inFlight<PROVIDER_MAX_IN_FLIGHT){inFlight++;return;}await new Promise<void>(resolve=>waiting.push(resolve));}
 function release(){const next=waiting.shift();if(next)next();else inFlight--;}
 async function read(url:string,limit:number):Promise<string>{
 if(typeof window!=='undefined')throw Error('CoinGecko is server-only.');const token=key();if(!token)throw Error('CoinGecko market data unavailable.');
 const now=clock();while(attempts.length&&attempts[0]!<=now-MARKET_RETRY_MS)attempts.shift();if(attempts.length>=PROVIDER_REQUESTS_PER_MINUTE)throw Error('CoinGecko market data unavailable.');attempts.push(now);await acquire();
 try{const response=await fetcher(url,{method:'GET',credentials:'omit',headers:{Accept:'application/json','x-cg-demo-api-key':token},redirect:'error',referrerPolicy:'no-referrer',cache:'no-store',signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('Unavailable');return await boundedQuoteText(response,limit);}catch{throw Error('CoinGecko market data unavailable.');}finally{release();}
 }
 async function quotes(requests:readonly MarketQuoteRequest[]):Promise<MarketQuote[]>{const result:MarketQuote[]=[];for(const batch of buildCoinGeckoRequests(requests)){const text=await read(batch.url,1024*1024);result.push(...(batch.kind==='coin'?parseCoinQuotes(text,batch.requests,clock()):parseRwaQuotes(text,batch.requests,clock())));}return result;}
 let assets:MarketCatalogAsset[]=[],fetchedAt=0,nextAttempt=0,error:string|null=null,pending:Promise<void>|null=null;
 async function catalog(){const now=clock();if(!pending&&now>=nextAttempt&&(!assets.length||now-fetchedAt>=CATALOG_FRESH_MS)){nextAttempt=now+MARKET_RETRY_MS;pending=(async()=>{try{const [coins,rwas]=await Promise.all([read('https://api.coingecko.com/api/v3/coins/list?include_platform=true',12*1024*1024),read('https://api.coingecko.com/api/v3/rwas/list',2*1024*1024)]);assets=[...parseMarketCatalog(coins,'coin'),...parseMarketCatalog(rwas,'rwa')];fetchedAt=clock();error=null;}catch{error='Market catalog unavailable. Last verified catalog is retained; manual valuation remains available.';}finally{pending=null;}})();}await pending;return {assets,error,fetchedAt:fetchedAt?new Date(fetchedAt).toISOString():null,stale:!fetchedAt||clock()-fetchedAt>=CATALOG_FRESH_MS};}
 return {quotes,catalog};
}
