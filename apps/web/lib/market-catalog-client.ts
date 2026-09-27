import {boundedQuoteText} from './market-quotes';
import {CATALOG_FRESH_MS,marketAssetRefSchema,type MarketCatalogAsset} from './market-assets';
function validCatalogAsset(value:unknown):value is MarketCatalogAsset{
 if(!value||typeof value!=='object')return false;const row=value as Record<string,unknown>;
 return marketAssetRefSchema.safeParse(row.ref).success&&typeof row.name==='string'&&row.name.length>0&&row.name.length<=300&&typeof row.symbol==='string'&&row.symbol.length<=100;
}
/** Pending work and a completed cache entry have different lifetimes. A pending
 * request has no freshness timestamp and cannot be expired by another mount. */
export function createCatalogLoader(fetcher:typeof fetch=fetch,clock=()=>Date.now()){
 let pending:Promise<MarketCatalogAsset[]>|undefined,cached:MarketCatalogAsset[]|undefined,cachedAt=0;
 return function load():Promise<MarketCatalogAsset[]>{
  if(pending)return pending;
  if(cached&&clock()>=cachedAt&&clock()-cachedAt<CATALOG_FRESH_MS)return Promise.resolve(cached);
  pending=Promise.resolve().then(()=>fetcher('/api/market-assets',{method:'GET',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',cache:'no-store',signal:AbortSignal.timeout(15000)})).then(async response=>{
   const raw=JSON.parse(await boundedQuoteText(response,32*1024*1024)) as unknown;if(!response.ok||!raw||typeof raw!=='object')throw Error('Market catalog unavailable.');
   const body=raw as {assets?:unknown;error?:unknown};if(!Array.isArray(body.assets)||body.assets.length>50000||!body.assets.every(validCatalogAsset)||!body.assets.length&&typeof body.error==='string'&&body.error)throw Error('Market catalog unavailable.');
   cached=body.assets;cachedAt=clock();return cached;
  }).finally(()=>{pending=undefined;});return pending;
 };
}
