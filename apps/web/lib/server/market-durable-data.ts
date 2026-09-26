import {z} from 'zod';
import {marketRequestsSchema,marketRequestKey,parseMarketCatalog,uniqueMarketRequests,type MarketQuoteRequest,type MarketCatalogAsset} from '../market-assets';
import {historyRequestSchema,HISTORY_DAYS,HISTORY_UNAVAILABLE,RWA_HISTORY_UNAVAILABLE,parseCoinHistory,type MarketHistoryRequest,type MarketHistory} from '../market-history';
import {parseMarketInsights,INSIGHTS_UNAVAILABLE,insightIsStale,type MarketInsight} from '../market-insights';
import {chargedMarketRead,type MarketCommand,type ChargedOperation} from './market-charged-read';
import type {PublicMarketWork,WorkLease} from './market-coordinator';
import {validateWorkEvidence,workEvidenceStale,type CatalogEvidence} from './market-evidence';
type Context={command:MarketCommand;key?:string;fetcher?:typeof fetch;clock?:()=>number};
type Acquired={work:PublicMarketWork;value:unknown;lease?:WorkLease;failed:boolean;fresh:boolean};
const catalogError='Market catalog unavailable. Last verified catalog is retained; manual valuation remains available.';
const now=(c:Context)=>c.clock?.()??Date.now();
async function acquire(work:PublicMarketWork,c:Context):Promise<Acquired>{
 try{const row=await c.command({action:'acquire',work}),value=row.value?validateWorkEvidence(work,row.value,now(c)):null;
  return {work,value,lease:row.ok===true&&row.status==='OWNER'?row.lease as WorkLease:undefined,failed:row.ok!==true||row.status==='WAITING',fresh:row.status==='CACHE_HIT'};
 }catch{return {work,value:null,failed:true,fresh:false};}
}
async function read(url:URL,operation:ChargedOperation,limit:number,owners:Acquired[],c:Context,parse:(text:string)=>{owner:Acquired;value:unknown}[]){
 let id:string|undefined,values:{owner:Acquired;value:unknown}[]=[];
 try{await chargedMarketRead(url,operation,limit,{...c,validate:text=>{values=parse(text);},work:{associations:owners.map(o=>({work:o.work,lease:o.lease!})),onAttempt:attempt=>{id=attempt;}}});
  for(const owner of owners){const value=values.find(v=>v.owner===owner)?.value;if(value===undefined){owner.failed=true;continue;}const published=await c.command({action:'publish-data',id,work:owner.work,value});if(published.ok===true){owner.value=value;owner.failed=false;owner.fresh=!workEvidenceStale(owner.work,value,now(c));}else owner.failed=true;}
 }catch{for(const owner of owners)owner.failed=true;}
}
/** Each catalog partition has an independent durable lease/cache and physical charge. */
export async function durableCatalog(c:Context){
 const partitions:Acquired[]=[];
 for(const kind of ['coin','rwa'] as const){const owner=await acquire({operation:'catalog',provider:'coingecko',kind},c);partitions.push(owner);if(!owner.lease)continue;
  const url=new URL(`https://api.coingecko.com/api/v3/${kind==='coin'?'coins':'rwas'}/list`);if(kind==='coin')url.searchParams.set('include_platform','true');
  await read(url,'catalog',kind==='coin'?12*1024*1024:2*1024*1024,[owner],c,text=>[{owner,value:{assets:parseMarketCatalog(text,kind),fetchedAt:new Date(now(c)).toISOString()}}]);
 }
 const assets:MarketCatalogAsset[]=partitions.flatMap(p=>(p.value as CatalogEvidence|null)?.assets??[]),stamps=partitions.flatMap(p=>p.value?[(p.value as CatalogEvidence).fetchedAt]:[]),degraded=partitions.some(p=>p.failed||!p.fresh);
 return {assets,error:degraded?catalogError:null,fetchedAt:stamps.length?stamps.sort()[0]!:null,stale:degraded};
}
export async function durableHistory(request:MarketHistoryRequest,c:Context){
 if(request.marketRef.kind!=='coin')return {history:null,error:RWA_HISTORY_UNAVAILABLE,stale:true,nextAttemptAt:0};
 const {range,...pair}=request,owner=await acquire({operation:'history',pair,range},c);
 if(owner.lease){const url=new URL(`https://api.coingecko.com/api/v3/coins/${encodeURIComponent(request.marketRef.id)}/market_chart`);url.searchParams.set('vs_currency',request.currency.toLowerCase());url.searchParams.set('days',String(HISTORY_DAYS[range]));url.searchParams.set('precision','full');await read(url,'history',1024*1024,[owner],c,text=>[{owner,value:parseCoinHistory(text,request,now(c))}]);}
 return {history:owner.value as MarketHistory|null,error:owner.failed||!owner.fresh?HISTORY_UNAVAILABLE:null,stale:!owner.fresh,nextAttemptAt:now(c)+60000};
}
export async function durableInsights(raw:readonly MarketQuoteRequest[],c:Context){
 const requests=uniqueMarketRequests(raw),items:Acquired[]=[];
 for(const pair of requests)items.push(pair.marketRef.kind==='rwa'&&pair.currency!=='USD'?{work:{operation:'insights',pair},value:null,failed:true,fresh:false}:await acquire({operation:'insights',pair},c));
 for(const kind of ['coin','rwa'] as const)for(const currency of ['USD','EUR'] as const){
  const selected=items.filter(i=>i.lease&&i.work.operation==='insights'&&i.work.pair.marketRef.kind===kind&&i.work.pair.currency===currency);
  for(let offset=0;offset<selected.length;offset+=250){const owners=selected.slice(offset,offset+250);if(!owners.length)continue;const members=owners.map(o=>(o.work as Extract<PublicMarketWork,{operation:'insights'}>).pair);
   const url=new URL(`https://api.coingecko.com/api/v3/${kind==='coin'?'coins':'rwas'}/markets`);url.searchParams.set('ids',[...new Set(members.map(r=>r.marketRef.id))].join(','));url.searchParams.set('per_page','250');url.searchParams.set('page','1');url.searchParams.set('sparkline','true');url.searchParams.set('price_change_percentage','24h');url.searchParams.set('precision','full');if(kind==='coin')url.searchParams.set('vs_currency',currency.toLowerCase());
   await read(url,'insights',4*1024*1024,owners,c,text=>parseMarketInsights(text,members,now(c)).map(value=>({owner:owners.find(o=>o.work.operation==='insights'&&marketRequestKey(o.work.pair)===marketRequestKey(value))!,value})));
  }
 }
 const entries=items.flatMap(i=>i.value?[i.value as MarketInsight]:[]),results=Object.fromEntries(items.map(i=>[marketRequestKey((i.work as Extract<PublicMarketWork,{operation:'insights'}>).pair),{insight:i.value,error:i.failed||!i.fresh?INSIGHTS_UNAVAILABLE:null,stale:!i.value||insightIsStale(i.value as MarketInsight,now(c))}]));
 return {entries,results,error:items.some(i=>i.failed||!i.fresh)?INSIGHTS_UNAVAILABLE:null};
}
export function parseDurableMarketBody(path:string,raw:unknown){return path==='/catalog'?z.object({version:z.literal(1)}).strict().parse(raw):path==='/history'?z.object({version:z.literal(1),request:historyRequestSchema}).strict().parse(raw):z.object({version:z.literal(1),requests:marketRequestsSchema}).strict().parse(raw);}
