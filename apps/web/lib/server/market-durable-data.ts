import {z} from 'zod';
import {marketRequestsSchema,marketRequestKey,parseMarketCatalog,uniqueMarketRequests,type MarketQuoteRequest,type MarketCatalogAsset} from '../market-assets';
import {historyRequestSchema,HISTORY_DAYS,HISTORY_UNAVAILABLE,RWA_HISTORY_UNAVAILABLE,parseCoinHistory,type MarketHistoryRequest,type MarketHistory} from '../market-history';
import {parseMarketInsights,INSIGHTS_UNAVAILABLE,MAX_INSIGHT_PAIRS,insightIsStale,type MarketInsight} from '../market-insights';
import {providerText,providerFailure,type MarketCommand,type ChargedOperation} from './market-charged-read';
import {runMarketBatch,type MarketGroup,type MarketItem,type MarketRead} from './market-batch';
import type {PublicMarketWork} from './market-coordinator';
import {parseProviderEvidence} from './provider-failure';
import type {CatalogEvidence} from './market-evidence';
type Context={command:MarketCommand;key?:string;fetcher?:typeof fetch;clock?:()=>number;signal?:AbortSignal;cancelToken?:string;client?:string};
const catalogError='Market catalog unavailable. Last verified catalog is retained; manual valuation remains available.';
const now=(c:Context)=>c.clock?.()??Date.now();
/** One provider read for a group's owners: `parse` returns the values it verified, by work index. Owners it does
 * not answer are settled as pair failures. Without a provider key no group is admitted, so nothing is charged. */
function reader(url:(owners:number[])=>URL,operation:ChargedOperation,limit:number|((owners:number[])=>number),works:PublicMarketWork[],c:Context,parse:(text:string,owners:number[])=>{index:number;value:unknown}[]){
 return async(_group:MarketGroup,owners:number[]):Promise<MarketRead>=>{
  try{
   const text=await providerText(url(owners),operation,typeof limit==='number'?limit:limit(owners),{key:c.key,fetcher:c.fetcher,signal:c.signal}),values=parseProviderEvidence(()=>parse(text,owners));
   return {outcome:'success',values,pairFailures:owners.filter(m=>works[m]!.operation!=='catalog'&&!values.some(v=>v.index===m))};
  }catch(error){return {outcome:'failure',category:providerFailure(error,c.signal).category,values:[]};}
 };
}
const keyed=(c:Context)=>!!c.key?.trim();
const failed=(item:MarketItem)=>!item.ok;
/** Each catalog partition has an independent durable lease/cache and physical charge. */
export async function durableCatalog(c:Context){
 const works:PublicMarketWork[]=[{operation:'catalog',provider:'coingecko',kind:'coin'},{operation:'catalog',provider:'coingecko',kind:'rwa'}];
 const kindOf=(index:number)=>(works[index] as Extract<PublicMarketWork,{operation:'catalog'}>).kind;
 const partitions=await runMarketBatch(works,keyed(c)?[{charge:'catalog',members:[0]},{charge:'catalog',members:[1]}]:[],reader(owners=>{const kind=kindOf(owners[0]!),url=new URL(`https://api.coingecko.com/api/v3/${kind==='coin'?'coins':'rwas'}/list`);if(kind==='coin')url.searchParams.set('include_platform','true');return url;},'catalog',owners=>kindOf(owners[0]!)==='coin'?12*1024*1024:2*1024*1024,works,c,(text,owners)=>owners.map(index=>({index,value:{assets:parseMarketCatalog(text,kindOf(index)),fetchedAt:new Date(now(c)).toISOString()}}))),c);
 const assets:MarketCatalogAsset[]=partitions.flatMap(p=>(p.value as CatalogEvidence|null)?.assets??[]),stamps=partitions.flatMap(p=>p.value?[(p.value as CatalogEvidence).fetchedAt]:[]),degraded=partitions.some(p=>failed(p)||!p.fresh);
 return {assets,error:degraded?catalogError:null,fetchedAt:stamps.length?stamps.sort()[0]!:null,stale:degraded};
}
export async function durableHistory(request:MarketHistoryRequest,c:Context){
 if(request.marketRef.kind!=='coin')return {history:null,error:RWA_HISTORY_UNAVAILABLE,stale:true,nextAttemptAt:0};
 const {range,...pair}=request,works:PublicMarketWork[]=[{operation:'history',pair,range}];
 const [owner]=await runMarketBatch(works,keyed(c)?[{charge:'history',members:[0]}]:[],reader(()=>{const url=new URL(`https://api.coingecko.com/api/v3/coins/${encodeURIComponent(request.marketRef.id)}/market_chart`);url.searchParams.set('vs_currency',request.currency.toLowerCase());url.searchParams.set('days',String(HISTORY_DAYS[range]));url.searchParams.set('precision','full');return url;},'history',1024*1024,works,c,text=>[{index:0,value:parseCoinHistory(text,request,now(c))}]),c);
 return {history:owner!.value as MarketHistory|null,error:failed(owner!)||!owner!.fresh?HISTORY_UNAVAILABLE:null,stale:!owner!.fresh,nextAttemptAt:now(c)+60000};
}
export async function durableInsights(raw:readonly MarketQuoteRequest[],c:Context){
 const requests=uniqueMarketRequests(raw);
 // More than one command's worth of pairs is refused before any account command.
 if(requests.length>MAX_INSIGHT_PAIRS)return {entries:[],results:Object.fromEntries(requests.map(pair=>[marketRequestKey(pair),{insight:null,error:INSIGHTS_UNAVAILABLE,stale:true}])),error:INSIGHTS_UNAVAILABLE};
 const pairs=requests.filter(pair=>!(pair.marketRef.kind==='rwa'&&pair.currency!=='USD')),works:PublicMarketWork[]=pairs.map(pair=>({operation:'insights',pair}));
 const groups:MarketGroup[]=keyed(c)?(['coin','rwa'] as const).flatMap(kind=>(['USD','EUR'] as const).map(currency=>({charge:'insights' as const,members:pairs.flatMap((pair,index)=>pair.marketRef.kind===kind&&pair.currency===currency?[index]:[])}))).filter(group=>group.members.length>0):[];
 const items=await runMarketBatch(works,groups,reader(owners=>{const members=owners.map(i=>pairs[i]!),kind=members[0]!.marketRef.kind,url=new URL(`https://api.coingecko.com/api/v3/${kind==='coin'?'coins':'rwas'}/markets`);url.searchParams.set('ids',[...new Set(members.map(r=>r.marketRef.id))].join(','));url.searchParams.set('per_page','250');url.searchParams.set('page','1');url.searchParams.set('sparkline','true');url.searchParams.set('price_change_percentage','24h');url.searchParams.set('precision','full');if(kind==='coin')url.searchParams.set('vs_currency',members[0]!.currency.toLowerCase());return url;},'insights',4*1024*1024,works,c,(text,owners)=>{const members=owners.map(i=>pairs[i]!);return parseMarketInsights(text,members,now(c)).map(value=>({index:owners[members.findIndex(member=>marketRequestKey(member)===marketRequestKey(value))]!,value}));}),c);
 const answers=new Map(pairs.map((pair,index)=>[marketRequestKey(pair),items[index]!]));
 const entries=items.flatMap(i=>i.value?[i.value as MarketInsight]:[]),results=Object.fromEntries(requests.map(pair=>{const item=answers.get(marketRequestKey(pair));return [marketRequestKey(pair),{insight:item?.value??null,error:!item||failed(item)||!item.fresh?INSIGHTS_UNAVAILABLE:null,stale:!item?.value||insightIsStale(item.value as MarketInsight,now(c))}];}));
 return {entries,results,error:requests.some(pair=>{const item=answers.get(marketRequestKey(pair));return !item||failed(item)||!item.fresh;})?INSIGHTS_UNAVAILABLE:null};
}
export function parseDurableMarketBody(path:string,raw:unknown){return path==='/catalog'?z.object({version:z.literal(1)}).strict().parse(raw):path==='/history'?z.object({version:z.literal(1),request:historyRequestSchema}).strict().parse(raw):z.object({version:z.literal(1),requests:marketRequestsSchema}).strict().parse(raw);}
