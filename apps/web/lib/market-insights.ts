import {z} from 'zod';
import {marketRequestSchema,marketRequestKey,uniqueMarketRequests,type MarketQuoteRequest} from './market-assets';
import {decimalLexeme,exactMarketJson,JsonNumber} from './exact-market-json';
export const INSIGHTS_FRESH_MS=15*60*1000;
export const LOGO_FRESH_MS=24*60*60*1000;
export const MAX_SPARKLINE_PRICES=200;
export const INSIGHTS_UNAVAILABLE='Market insights are unavailable. Last verified evidence is retained.';
/** Only public CoinGecko raster assets, no arbitrary redirects/hosts, userinfo, ports or query parameters. */
export function validatedLogoUrl(raw:unknown):string|null{
 if(typeof raw!=='string'||raw.length>1024||!/^https:\/\/(?:coin-images|assets)\.coingecko\.com\/coins\/images\/[0-9]+\/(?:thumb|small|large)\/[A-Za-z0-9_.()-]+\.(?:png|jpg|jpeg|webp|gif)(?:\?[0-9]{1,20})?$/.test(raw))return null;
 try{const url=new URL(raw);return !url.username&&!url.password&&!url.port&&!url.hash?url.href:null;}catch{return null;}
}
export function marketLogoProxyUrl(url:string){const valid=validatedLogoUrl(url);return valid?`/api/market-logo?url=${encodeURIComponent(valid)}`:null;}
function validProxy(raw:string){try{const url=new URL(raw,'https://local.invalid');return url.origin==='https://local.invalid'&&url.pathname==='/api/market-logo'&&url.searchParams.size===1&&!!validatedLogoUrl(url.searchParams.get('url'))&&raw===marketLogoProxyUrl(url.searchParams.get('url')!);}catch{return false;}}
const priceSchema=z.object({value:z.string().regex(/^[1-9]\d{0,77}$/),decimals:z.number().int().min(0).max(30)}).strict();
const exactChange=z.string().max(120).regex(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/).refine(value=>Number.isFinite(Number(value))&&Number(value)>=-100&&Math.abs(Number(value))<=1e12);
export const marketInsightSchema=marketRequestSchema.extend({
 source:z.enum(['CoinGecko','CoinGecko tokenized RWA reference']),marketBasis:z.enum(['coin','tokenized']),logoUrl:z.string().max(1600).refine(validProxy).nullable(),
 change24h:exactChange.nullable(),observedAt:z.iso.datetime().nullable(),fetchedAt:z.iso.datetime(),
 /** A range label and retrieval date are evidence; individual sample timestamps are not supplied by this endpoint. */
 sparkline:z.object({range:z.literal('7d'),timestamps:z.literal('unavailable'),fetchedAt:z.iso.datetime(),prices:z.array(priceSchema).min(2).max(MAX_SPARKLINE_PRICES)}).strict().nullable(),
}).strict();
export type MarketInsight=z.infer<typeof marketInsightSchema>;
export type MarketInsightResult={insight:MarketInsight|null;error:string|null;stale:boolean};
export type MarketInsightsLoadResult={entries:MarketInsight[];error:string|null;errors?:Record<string,string|null>};
export type MarketInsightsSnapshot={entries:readonly MarketInsight[];results:Record<string,MarketInsightResult>;loading:boolean;error:string|null;now:number};
export function insightIsStale(entry:MarketInsight,now=Date.now()){return now-Date.parse(entry.observedAt??entry.fetchedAt)>=INSIGHTS_FRESH_MS||now-Date.parse(entry.fetchedAt)>=INSIGHTS_FRESH_MS;}
export function verifiedMarketInsight(raw:unknown,request:MarketQuoteRequest,now=Date.now()):MarketInsight{
 const entry=marketInsightSchema.parse(raw),coin=entry.marketRef.kind==='coin';
 if(marketRequestKey(entry)!==marketRequestKey(request)||(!coin&&request.marketRef.kind==='rwa'&&entry.marketRef.kind==='rwa'&&entry.marketRef.assetType!==request.marketRef.assetType)||entry.marketBasis!==(coin?'coin':'tokenized')||entry.source!==(coin?'CoinGecko':'CoinGecko tokenized RWA reference'))throw Error('Invalid insight identity.');
 const fetched=Date.parse(entry.fetchedAt);if(fetched<=0||fetched>now+60000||(entry.observedAt&&(Date.parse(entry.observedAt)<=0||Date.parse(entry.observedAt)>fetched+60000)))throw Error('Invalid insight timestamp.');
 if((entry.change24h!==null||entry.sparkline)&&!entry.observedAt)throw Error('Movement requires provider time.');
 if(entry.sparkline?.fetchedAt&&entry.sparkline.fetchedAt!==entry.fetchedAt)throw Error('Invalid sequence timestamp.');
 if(!coin&&entry.currency!=='USD'&&(entry.change24h!==null||entry.sparkline||entry.observedAt))throw Error('RWA movement is USD only.');
 return entry;
}
function object(raw:unknown):Record<string,unknown>{if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw instanceof JsonNumber)throw Error('Invalid insights response.');return raw as Record<string,unknown>;}
/** Demo /coins/markets and /rwas/markets only. Exact JSON numeric lexemes survive transport.
 * RWA images identify the largest token by market cap; movement is explicitly tokenized USD, never stock spot data. */
export function parseMarketInsights(text:string,raw:readonly MarketQuoteRequest[],now=Date.now()):MarketInsight[]{
 const requests=uniqueMarketRequests(raw),parsed=exactMarketJson(text,4*1024*1024,150000);
 if(!Array.isArray(parsed)||parsed.length>250)throw Error('Invalid insight rows.');const seen=new Set<string>();const entries:MarketInsight[]=[];
 for(const rawRow of parsed){const row=object(rawRow);if(typeof row.id!=='string'||seen.has(row.id))throw Error('Invalid or duplicate insight identity.');seen.add(row.id);const members=requests.filter(r=>r.marketRef.id===row.id);if(!members.length)throw Error('Unexpected insight identity.');
 for(const request of members){const coin=request.marketRef.kind==='coin';if(!coin&&request.marketRef.kind==='rwa'&&row.asset_type!==request.marketRef.assetType)throw Error('Wrong RWA asset type.');
 const data=coin?row:row.tokenized_market_data==null?{}:object(row.tokenized_market_data);
 const observedAt=(coin||request.currency==='USD')&&data.last_updated!=null?z.iso.datetime().parse(data.last_updated):null;
 let change24h:string|null=null,sparkline:MarketInsight['sparkline']=null;
 if(observedAt){const change=data.price_change_percentage_24h_in_currency??data.price_change_percentage_24h;if(change!=null){if(!(change instanceof JsonNumber))throw Error('Invalid movement.');change24h=exactChange.parse(change.lexeme);}
 if(data.sparkline_in_7d!=null){const prices=object(data.sparkline_in_7d).price;if(!Array.isArray(prices)||prices.length>MAX_SPARKLINE_PRICES)throw Error('Invalid sequence.');const values=prices.map(price=>{const exact=decimalLexeme(price);return {value:exact.price,decimals:exact.priceDecimals};});if(values.length>=2)sparkline={range:'7d',timestamps:'unavailable',fetchedAt:new Date(now).toISOString(),prices:values};}}
 const url=validatedLogoUrl(row.image);entries.push(verifiedMarketInsight({...request,source:coin?'CoinGecko':'CoinGecko tokenized RWA reference',marketBasis:coin?'coin':'tokenized',logoUrl:url?marketLogoProxyUrl(url):null,change24h,observedAt,fetchedAt:new Date(now).toISOString(),sparkline},request,now));
 }}return entries;
}
