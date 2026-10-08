import * as z from 'zod';
import {ProviderValidationError} from './provider-validation';
import {marketRequestSchema,marketRequestKey,uniqueMarketRequests,type MarketQuoteRequest} from './market-assets';
import {decimalLexeme,exactMarketJson,JsonNumber} from './exact-market-json';
import {exactChange} from './market-insights';

/**
 * Market details (Session W Part 15): what CoinGecko's `/coins/markets` row says about a coin beyond its price, 24-hour
 * change and 7-day line (Markets' insights): the 1-hour and 7-day change, market cap, 24-hour volume and the
 * circulating, total and maximum supply, for Portfolio's table and a coin's page. Documentation read 2026-10-07
 * (https://docs.coingecko.com/demo/reference/coins-markets): every figure may be null; CoinGecko refreshes the row every
 * 60 seconds on the Demo API. Asked with `price_change_percentage=1h,24h,7d` and no sparkline. Exact numeric lexemes
 * only. A missing figure is null ("Not provided"), and so is a 0, which CoinGecko reports for a figure it does not have:
 * unknown is never shown as zero. Coins only; a tokenized RWA has none of these here.
 */
export const DETAIL_FRESH_MS=15*60*1000;
/** The most pairs one details request may name, as for insights: the route refuses more with a 400. */
export const MAX_DETAIL_PAIRS=64;
export const DETAIL_UNAVAILABLE='Market details are unavailable. Last verified details are retained.';
/** An older market service (a coordinator built before Part 15 answers 404) or a tokenized RWA: shown as "Not provided". */
export const DETAIL_NOT_PROVIDED='This market service does not provide these details yet.';
const amountSchema=z.object({value:z.string().regex(/^[1-9]\d{0,77}$/),decimals:z.number().int().min(0).max(30)}).strict();
export type MarketAmount=z.infer<typeof amountSchema>;
export const marketDetailSchema=marketRequestSchema.extend({
 source:z.literal('CoinGecko'),
 change1h:exactChange.nullable(),change24h:exactChange.nullable(),change7d:exactChange.nullable(),
 /** In the request's currency. */
 marketCap:amountSchema.nullable(),volume24h:amountSchema.nullable(),
 /** In coins. */
 circulatingSupply:amountSchema.nullable(),totalSupply:amountSchema.nullable(),maxSupply:amountSchema.nullable(),
 observedAt:z.iso.datetime().nullable(),fetchedAt:z.iso.datetime(),
}).strict();
export type MarketDetail=z.infer<typeof marketDetailSchema>;
export type MarketDetailResult={detail:MarketDetail|null;error:string|null;stale:boolean};
const FIGURES=['change1h','change24h','change7d','marketCap','volume24h','circulatingSupply','totalSupply','maxSupply'] as const;
export function detailIsStale(entry:MarketDetail,now=Date.now()){return now-Date.parse(entry.observedAt??entry.fetchedAt)>=DETAIL_FRESH_MS||now-Date.parse(entry.fetchedAt)>=DETAIL_FRESH_MS;}
export function verifiedMarketDetail(raw:unknown,request:MarketQuoteRequest,now=Date.now()):MarketDetail{
 const entry=marketDetailSchema.parse(raw);
 if(entry.marketRef.kind!=='coin'||request.marketRef.kind!=='coin'||marketRequestKey(entry)!==marketRequestKey(request))throw new ProviderValidationError('Invalid detail identity.');
 const fetched=Date.parse(entry.fetchedAt);if(fetched<=0||fetched>now+60000||(entry.observedAt&&(Date.parse(entry.observedAt)<=0||Date.parse(entry.observedAt)>fetched+60000)))throw new ProviderValidationError('Invalid detail timestamp.');
 if(!entry.observedAt&&FIGURES.some(key=>entry[key]!==null))throw new ProviderValidationError('Details require provider time.');
 return entry;
}
function object(raw:unknown):Record<string,unknown>{if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw instanceof JsonNumber)throw new ProviderValidationError('Invalid details response.');return raw as Record<string,unknown>;}
/** A non-negative figure as exact digits; null when absent or 0 (CoinGecko's "no figure"). */
function amount(raw:unknown):MarketAmount|null{
 if(raw===null||raw===undefined)return null;
 if(!(raw instanceof JsonNumber)||raw.lexeme.startsWith('-'))throw new ProviderValidationError('Invalid market figure.');
 if(/^0+(?:\.0+)?(?:[eE][+-]?\d+)?$/.test(raw.lexeme))return null;
 const exact=decimalLexeme(raw);return {value:exact.price,decimals:exact.priceDecimals};
}
function change(raw:unknown):string|null{if(raw===null||raw===undefined)return null;if(!(raw instanceof JsonNumber))throw new ProviderValidationError('Invalid movement.');return exactChange.parse(raw.lexeme);}
/** The one provider address for a currency's coins (at most 250 ids, as documented). */
export function marketDetailUrl(currency:'USD'|'EUR',ids:readonly string[]){
 const unique=[...new Set(ids)];if(!unique.length||unique.length>250)throw Error('Between 1 and 250 coins per details read.');
 const url=new URL('https://api.coingecko.com/api/v3/coins/markets');
 url.searchParams.set('vs_currency',currency.toLowerCase());url.searchParams.set('ids',unique.join(','));url.searchParams.set('per_page','250');url.searchParams.set('page','1');
 url.searchParams.set('sparkline','false');url.searchParams.set('price_change_percentage','1h,24h,7d');url.searchParams.set('precision','full');
 return url;
}
/** One `/coins/markets` answer for these coin pairs (one currency): a verified detail per pair the answer names. */
export function parseMarketDetails(text:string,raw:readonly MarketQuoteRequest[],now=Date.now()):MarketDetail[]{
 const requests=uniqueMarketRequests(raw).filter(request=>request.marketRef.kind==='coin'),parsed=exactMarketJson(text,4*1024*1024,150000);
 if(!Array.isArray(parsed)||parsed.length>250)throw new ProviderValidationError('Invalid detail rows.');
 const seen=new Set<string>(),entries:MarketDetail[]=[];
 for(const rawRow of parsed){
  const row=object(rawRow);if(typeof row.id!=='string'||seen.has(row.id))throw new ProviderValidationError('Invalid or duplicate detail identity.');seen.add(row.id);
  const members=requests.filter(request=>request.marketRef.id===row.id);if(!members.length)throw new ProviderValidationError('Unexpected detail identity.');
  const observedAt=row.last_updated!=null?z.iso.datetime().parse(row.last_updated):null;
  const figures=observedAt?{change1h:change(row.price_change_percentage_1h_in_currency),change24h:change(row.price_change_percentage_24h_in_currency??row.price_change_percentage_24h),change7d:change(row.price_change_percentage_7d_in_currency),marketCap:amount(row.market_cap),volume24h:amount(row.total_volume),circulatingSupply:amount(row.circulating_supply),totalSupply:amount(row.total_supply),maxSupply:amount(row.max_supply)}
   :{change1h:null,change24h:null,change7d:null,marketCap:null,volume24h:null,circulatingSupply:null,totalSupply:null,maxSupply:null};
  for(const request of members)entries.push(verifiedMarketDetail({...request,source:'CoinGecko',...figures,observedAt,fetchedAt:new Date(now).toISOString()},request,now));
 }
 return entries;
}
/** A figure as plain decimal text ("12345.67"), for display and exact arithmetic. */
export function amountText(value:MarketAmount):string{
 if(!value.decimals)return value.value;const padded=value.value.padStart(value.decimals+1,'0');
 return `${padded.slice(0,-value.decimals)}.${padded.slice(-value.decimals)}`;
}
const resultSchema=z.object({detail:marketDetailSchema.nullable(),error:z.string().max(300).nullable(),stale:z.boolean()}).strict();
/** The one answer shape of QuoteService /insights-detail and the app's /api/market-detail: a result for every pair asked. */
export const detailAnswerSchema=z.object({results:z.record(z.string().max(200),resultSchema).refine(value=>Object.keys(value).length<=MAX_DETAIL_PAIRS),error:z.string().max(300).nullable()}).strict();
export type MarketDetailAnswer={results:Record<string,MarketDetailResult>;error:string|null};
const knownError=(error:string|null)=>error===null?null:error===DETAIL_NOT_PROVIDED?DETAIL_NOT_PROVIDED:DETAIL_UNAVAILABLE;
/** Every pair answered once and every detail verified against the pair it answers; any other wording becomes "unavailable". */
export function verifiedDetailAnswer(raw:unknown,requests:readonly MarketQuoteRequest[],now=Date.now()):MarketDetailAnswer{
 const body=detailAnswerSchema.parse(raw),asked=new Map(uniqueMarketRequests(requests).map(request=>[marketRequestKey(request),request]));
 if(Object.keys(body.results).length!==asked.size||[...asked.keys()].some(key=>!Object.hasOwn(body.results,key)))throw new ProviderValidationError('Incomplete detail results.');
 const results:Record<string,MarketDetailResult>={};
 for(const [key,request] of asked){const value=body.results[key]!,detail=value.detail?verifiedMarketDetail(value.detail,request,now):null;results[key]={detail,error:knownError(value.error),stale:!detail||detailIsStale(detail,now)};}
 return {results,error:knownError(body.error)};
}
/** The same answer for every pair: used when nothing could be asked, or the service does not know the path. */
export function detailAnswerFor(requests:readonly MarketQuoteRequest[],error:string):MarketDetailAnswer{
 return {results:Object.fromEntries(uniqueMarketRequests(requests).map(request=>[marketRequestKey(request),{detail:null,error,stale:true}])),error};
}
