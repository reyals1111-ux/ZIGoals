import {boundedQuoteText} from './market-quotes';
import {CATALOG_FRESH_MS,type MarketCatalogAsset} from './market-assets';
import {CATALOG_WIRE_HEADER,CATALOG_WIRE_VERSION,catalogFromWire} from './market-catalog-wire';
import type {StoredCatalog} from './market-catalog-store';

/** Session AJ (item 5, WE16; D8): where a loader keeps the catalog between visits (the IndexedDB store in the browser). */
export type CatalogPersistence={read:()=>Promise<StoredCatalog|null>;write:(value:StoredCatalog)=>Promise<void>};
/** Pending work and a completed cache entry have different lifetimes. A pending
 * request has no freshness timestamp and cannot be expired by another mount.
 * Session AJ (item 5, WE16; D8): the loader asks for the compact catalog (version 2) and sends the version it already
 * holds (If-None-Match), so an unchanged catalog answers 304 and nothing is downloaded. With `persistence` it first reads
 * the copy kept on this device, so search works offline and the first search does not wait on the network; a stale copy
 * is refreshed, and if the network fails the kept copy is used. */
export function createCatalogLoader(fetcher:typeof fetch=fetch,clock=()=>Date.now(),persistence?:CatalogPersistence){
 let pending:Promise<MarketCatalogAsset[]>|undefined,cached:MarketCatalogAsset[]|undefined,cachedAt=0,version:string|null=null,restored=false;
 const fresh=()=>clock()>=cachedAt&&clock()-cachedAt<CATALOG_FRESH_MS;
 return function load():Promise<MarketCatalogAsset[]>{
  if(pending)return pending;
  if(cached&&fresh())return Promise.resolve(cached);
  pending=Promise.resolve().then(async()=>{
   if(persistence&&!restored){restored=true;const kept=await persistence.read().catch(()=>null);if(kept?.assets.length){cached=kept.assets;cachedAt=kept.savedAt;version=kept.catalogVersion;if(fresh())return cached;}}
   let response:Response;
   try{response=await fetcher('/api/market-assets',{method:'GET',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',cache:'no-store',signal:AbortSignal.timeout(15000),headers:{[CATALOG_WIRE_HEADER]:CATALOG_WIRE_VERSION,...(cached&&version?{'If-None-Match':`"cat-${version}"`}:{})}});}
   catch(error){if(cached)return cached;throw error;}
   if(response.status===304&&cached){await response.body?.cancel();cachedAt=clock();if(persistence&&version)void persistence.write({version:1,catalogVersion:version,savedAt:cachedAt,assets:cached}).catch(()=>{});return cached;}
   const raw=JSON.parse(await boundedQuoteText(response,32*1024*1024)) as unknown;
   const body=raw&&typeof raw==='object'?raw as {assets?:unknown;error?:unknown;catalogVersion?:unknown}:null;
   const assets=response.ok?catalogFromWire(raw):null;
   if(!assets||!assets.length&&typeof body?.error==='string'&&body.error){if(cached)return cached;throw Error('Market catalog unavailable.');}
   cached=assets;cachedAt=clock();version=typeof body?.catalogVersion==='string'&&/^[0-9a-f]{16}$/.test(body.catalogVersion)?body.catalogVersion:null;
   if(persistence&&version)void persistence.write({version:1,catalogVersion:version,savedAt:cachedAt,assets}).catch(()=>{});
   return cached;
  }).finally(()=>{pending=undefined;});return pending;
 };
}
/** The one catalog loader the app's search, pickers and imports share (one download, one copy on the device). */
let shared:(()=>Promise<MarketCatalogAsset[]>)|undefined;
export function loadMarketCatalog():Promise<MarketCatalogAsset[]>{
 if(!shared){
  const store=()=>import('./market-catalog-store');
  shared=createCatalogLoader(fetch,()=>Date.now(),{read:async()=>(await store()).readStoredCatalog(),write:async v=>(await store()).writeStoredCatalog(v)});
 }
 return shared();
}
