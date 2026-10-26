import {ProviderValidationError} from './provider-validation';
import * as z from 'zod';
import {exactMarketJson} from './exact-market-json';
const providerId=z.string().min(1).max(150).regex(/^[a-zA-Z0-9._-]+$/);
const coinRef=z.object({provider:z.literal('coingecko'),kind:z.literal('coin'),id:providerId,platform:providerId.optional(),contractAddress:z.string().min(1).max(250).regex(/^[a-zA-Z0-9:._-]+$/).optional()}).strict();
export const marketAssetRefSchema=z.discriminatedUnion('kind',[coinRef,z.object({provider:z.literal('coingecko'),kind:z.literal('rwa'),id:providerId,assetType:z.enum(['stock','etf','commodity'])}).strict()]).refine(ref=>ref.kind!=='coin'||Boolean(ref.platform)===Boolean(ref.contractAddress),'Platform and contract must be selected together.');
export type MarketAssetRef=z.infer<typeof marketAssetRefSchema>;
export const marketRequestSchema=z.object({marketRef:marketAssetRefSchema,currency:z.enum(['USD','EUR'])}).strict();
export type MarketQuoteRequest=z.infer<typeof marketRequestSchema>;
export const marketRequestsSchema=z.array(marketRequestSchema).max(500);
/** Pairs per browser market request (Session R1). One client may hold half of the coordinator's 64 works at a
 * time, so a larger portfolio is a few sequential requests rather than one refused request. */
export const MARKET_REQUEST_CHUNK=32;
/** Provider IDs of the app's featured markets (FEATURED_MARKETS in product-insights.ts; a test pins them equal). The
 * market coordinator accepts them even when its catalog does not list them (Session S, market-catalog-guard.ts). */
export const FEATURED_MARKET_IDS={coin:['bitcoin','ethereum','zignaly','usd-coin','solana'],rwa:['apple','nvidia','gold','silver','vanguard-s-p-500-etf']} as const;
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
 const parsed=z.array(marketRequestSchema).max(4000).parse(raw);const unique=[...new Map(parsed.map(r=>[marketRequestKey(r),r])).values()];if(unique.length>MAX_UNIQUE_MARKET_REQUESTS)throw new ProviderValidationError('Too many distinct market pairs.');return unique;
}
export function parseMarketCatalog(text:string,kind:'coin'|'rwa'):MarketCatalogAsset[]{
 if(text.length>12*1024*1024)throw new ProviderValidationError('Catalog response too large.');
 const item=z.object({id:providerId,name:z.string().min(1).max(300),symbol:z.string().max(100),platforms:z.record(z.string().max(150),z.string().max(250)).optional(),asset_type:z.enum(['stock','etf','commodity']).optional()});
 const rows=z.array(item).max(50000).parse(exactMarketJson(text,12*1024*1024,1000000));const seen=new Set<string>();
 return rows.map(row=>{if(seen.has(row.id))throw new ProviderValidationError('Duplicate market identity.');seen.add(row.id);const ref=marketAssetRefSchema.parse(kind==='coin'?{provider:'coingecko',kind,id:row.id}:{provider:'coingecko',kind,id:row.id,assetType:row.asset_type});return {ref,name:row.name,symbol:row.symbol,...(kind==='coin'?{platforms:row.platforms??{}}:{})};});
}
/**
 * Session AH (WE1; B-148, L-032, BUG-029, BUG-030): the catalog has no market capitalisation, so search cannot rank
 * by it without a new outside source. Instead a fixed list of well-known provider ids (the largest assets by market
 * capitalisation, the main stablecoins, and the gold and silver references) comes first, and an exact id or name
 * outranks an exact ticker, so "bitcoin" is Bitcoin, never a token that took BITCOIN as its ticker. Every other result
 * is shown as unverified (isVerifiedAsset).
 */
export const VERIFIED_ASSET_IDS: ReadonlySet<string> = new Set(['bitcoin','ethereum','tether','binancecoin','solana','usd-coin','ripple','dogecoin','cardano','tron','avalanche-2','chainlink','polkadot','the-open-network','shiba-inu','bitcoin-cash','litecoin','near','uniswap','stellar','internet-computer','monero','ethereum-classic','cosmos','aptos','sui','arbitrum','optimism','filecoin','hedera-hashgraph','vechain','algorand','tezos','aave','maker','the-graph','injective-protocol','celestia','render-token','dai','first-digital-usd','paypal-usd','euro-coin','stasis-eurs','tether-gold','pax-gold','kinesis-silver','zignaly','zigchain','osmosis','juno-network','kujira','axelar','akash-network','secret','stride','neutron-3','dydx-chain','sei-network','wrapped-bitcoin','staked-ether','lido-dao','rocket-pool-eth']);
export const isVerifiedAsset=(ref:{provider?:string;id:string;kind?:string})=>ref.kind!=='coin'||VERIFIED_ASSET_IDS.has(ref.id);
export function searchMarketAssets(query:string,catalog:readonly MarketCatalogAsset[],limit=20):MarketCatalogAsset[]{
 const term=query.trim().toLocaleLowerCase();if(!term)return [];
 const rank=(asset:MarketCatalogAsset)=>{const id=asset.ref.id.toLocaleLowerCase(),name=asset.name.toLocaleLowerCase(),symbol=asset.symbol.toLocaleLowerCase(),values=[id,name,symbol];
  const base=id===term||name===term?0:symbol===term?1:values.some(v=>v.startsWith(term))?2:values.some(v=>v.includes(term))?3:9;
  return base===9?9:isVerifiedAsset(asset.ref)?base:4+base;};
 return catalog.map((asset,index)=>({asset,index,rank:rank(asset)})).filter(v=>v.rank<9).sort((a,b)=>a.rank-b.rank||a.index-b.index).slice(0,Math.max(0,Math.min(100,limit))).map(v=>v.asset);
}

