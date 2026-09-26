import {z} from 'zod';
import {marketRequestsSchema,marketRequestKey,parseMarketCatalog,uniqueMarketRequests,type MarketQuoteRequest,type MarketCatalogAsset} from '../market-assets';
import {historyRequestSchema,HISTORY_DAYS,HISTORY_UNAVAILABLE,RWA_HISTORY_UNAVAILABLE,parseCoinHistory,type MarketHistoryRequest} from '../market-history';
import {parseMarketInsights,INSIGHTS_UNAVAILABLE,type MarketInsight} from '../market-insights';
import {chargedMarketRead,type MarketCommand} from './market-charged-read';
type Context={command:MarketCommand;key?:string;fetcher?:typeof fetch};
const catalogError='Market catalog unavailable. Last verified catalog is retained; manual valuation remains available.';
/** Canonical public work only; every physical endpoint call passes through the
 * same durable account, including the two separate catalog partitions. */
export async function durableCatalog(context:Context){
 const assets:MarketCatalogAsset[]=[];let error:string|null=null;
 for(const kind of ['coin','rwa'] as const){try{const url=new URL(`https://api.coingecko.com/api/v3/${kind==='coin'?'coins':'rwas'}/list`);if(kind==='coin')url.searchParams.set('include_platform','true');assets.push(...parseMarketCatalog(await chargedMarketRead(url,'catalog',kind==='coin'?12*1024*1024:2*1024*1024,context),kind));}catch{error=catalogError;}}
 return {assets,error,fetchedAt:assets.length?new Date().toISOString():null,stale:!!error};
}
export async function durableHistory(request:MarketHistoryRequest,context:Context){
 if(request.marketRef.kind!=='coin')return {history:null,error:RWA_HISTORY_UNAVAILABLE,stale:true,nextAttemptAt:0};
 try{const url=new URL(`https://api.coingecko.com/api/v3/coins/${encodeURIComponent(request.marketRef.id)}/market_chart`);url.searchParams.set('vs_currency',request.currency.toLowerCase());url.searchParams.set('days',String(HISTORY_DAYS[request.range]));url.searchParams.set('precision','full');const history=parseCoinHistory(await chargedMarketRead(url,'history',1024*1024,context),request);return {history,error:null,stale:false,nextAttemptAt:Date.now()+60000};}
 catch{return {history:null,error:HISTORY_UNAVAILABLE,stale:true,nextAttemptAt:Date.now()+60000};}
}
export async function durableInsights(raw:readonly MarketQuoteRequest[],context:Context){
 const requests=uniqueMarketRequests(raw),entries:MarketInsight[]=[];
 for(const kind of ['coin','rwa'] as const)for(const currency of ['USD','EUR'] as const){
  const selected=requests.filter(r=>r.marketRef.kind===kind&&r.currency===currency);if(kind==='rwa'&&currency!=='USD')continue;
  for(let offset=0;offset<selected.length;offset+=250){const members=selected.slice(offset,offset+250);if(!members.length)continue;
   const url=new URL(`https://api.coingecko.com/api/v3/${kind==='coin'?'coins':'rwas'}/markets`);url.searchParams.set('ids',[...new Set(members.map(r=>r.marketRef.id))].join(','));url.searchParams.set('per_page','250');url.searchParams.set('page','1');url.searchParams.set('sparkline','true');url.searchParams.set('price_change_percentage','24h');url.searchParams.set('precision','full');if(kind==='coin')url.searchParams.set('vs_currency',currency.toLowerCase());
   try{entries.push(...parseMarketInsights(await chargedMarketRead(url,'insights',4*1024*1024,context),members));}catch{/* Independent valid partitions remain available. */}
  }
 }
 const results=Object.fromEntries(requests.map(request=>{const insight=entries.find(row=>marketRequestKey(row)===marketRequestKey(request))??null;return [marketRequestKey(request),{insight,error:insight?null:INSIGHTS_UNAVAILABLE,stale:!insight}];}));
 return {entries,results,error:entries.length===requests.length?null:INSIGHTS_UNAVAILABLE};
}

export function parseDurableMarketBody(path:string,raw:unknown){return path==='/catalog'?z.object({version:z.literal(1)}).strict().parse(raw):path==='/history'?z.object({version:z.literal(1),request:historyRequestSchema}).strict().parse(raw):z.object({version:z.literal(1),requests:marketRequestsSchema}).strict().parse(raw);}
