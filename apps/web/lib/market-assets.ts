import {z} from 'zod';
import {exactMarketJson} from './exact-market-json';
const providerId=z.string().min(1).max(150).regex(/^[a-zA-Z0-9._-]+$/);
const coinRef=z.object({provider:z.literal('coingecko'),kind:z.literal('coin'),id:providerId,platform:providerId.optional(),contractAddress:z.string().min(1).max(250).regex(/^[a-zA-Z0-9:._-]+$/).optional()}).strict();
export const marketAssetRefSchema=z.discriminatedUnion('kind',[coinRef,z.object({provider:z.literal('coingecko'),kind:z.literal('rwa'),id:providerId,assetType:z.enum(['stock','etf','commodity'])}).strict()]).refine(ref=>ref.kind!=='coin'||Boolean(ref.platform)===Boolean(ref.contractAddress),'Platform and contract must be selected together.');
export type MarketAssetRef=z.infer<typeof marketAssetRefSchema>;
export const marketRequestSchema=z.object({marketRef:marketAssetRefSchema,currency:z.enum(['USD','EUR'])}).strict();
export type MarketQuoteRequest=z.infer<typeof marketRequestSchema>;
export const marketRequestsSchema=z.array(marketRequestSchema).max(500);
export const nativeZigMarketRef:MarketAssetRef={provider:'coingecko',kind:'coin',id:'zignaly'};
export const nativeZigRequest:MarketQuoteRequest={marketRef:nativeZigMarketRef,currency:'USD'};
export type MarketCatalogAsset={ref:MarketAssetRef;name:string;symbol:string;platforms?:Record<string,string>};
export const CATALOG_FRESH_MS=24*60*60*1000;
export const MARKET_RETRY_MS=60000;
/** The quote is at provider ID level; platform/contract qualify selection, never ticker lookup. */
export function marketRefKey(ref:MarketAssetRef){return `${ref.provider}:${ref.kind}:${ref.id}`;}
export function marketRequestKey(request:MarketQuoteRequest){return `${marketRefKey(request.marketRef)}:${request.currency}`;}
export const MAX_UNIQUE_MARKET_REQUESTS=2000;
export function uniqueMarketRequests(raw:readonly MarketQuoteRequest[]):MarketQuoteRequest[]{
 const parsed=z.array(marketRequestSchema).max(4000).parse(raw);const unique=[...new Map(parsed.map(r=>[marketRequestKey(r),r])).values()];if(unique.length>MAX_UNIQUE_MARKET_REQUESTS)throw Error('Too many distinct market pairs.');return unique;
}
export function parseMarketCatalog(text:string,kind:'coin'|'rwa'):MarketCatalogAsset[]{
 if(text.length>12*1024*1024)throw Error('Catalog response too large.');
 const item=z.object({id:providerId,name:z.string().min(1).max(300),symbol:z.string().max(100),platforms:z.record(z.string().max(150),z.string().max(250)).optional(),asset_type:z.enum(['stock','etf','commodity']).optional()});
 const rows=z.array(item).max(50000).parse(exactMarketJson(text,12*1024*1024,1000000));const seen=new Set<string>();
 return rows.map(row=>{if(seen.has(row.id))throw Error('Duplicate market identity.');seen.add(row.id);const ref=marketAssetRefSchema.parse(kind==='coin'?{provider:'coingecko',kind,id:row.id}:{provider:'coingecko',kind,id:row.id,assetType:row.asset_type});return {ref,name:row.name,symbol:row.symbol,...(kind==='coin'?{platforms:row.platforms??{}}:{})};});
}
export function searchMarketAssets(query:string,catalog:readonly MarketCatalogAsset[],limit=20):MarketCatalogAsset[]{
 const term=query.trim().toLocaleLowerCase();if(!term)return [];
 const rank=(asset:MarketCatalogAsset)=>{const values=[asset.symbol,asset.name,asset.ref.id].map(v=>v.toLocaleLowerCase());for(let i=0;i<values.length;i++)if(values[i]===term)return i;return values.some(v=>v.startsWith(term))?3:values.some(v=>v.includes(term))?4:5;};
 return catalog.map((asset,index)=>({asset,index,rank:rank(asset)})).filter(v=>v.rank<5).sort((a,b)=>a.rank-b.rank||a.index-b.index).slice(0,Math.max(0,Math.min(100,limit))).map(v=>v.asset);
}
