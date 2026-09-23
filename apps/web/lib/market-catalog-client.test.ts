import {test,expect,vi} from 'vitest';
import {createCatalogLoader} from './market-catalog-client';
import {CATALOG_FRESH_MS} from './market-assets';
const asset={ref:{provider:'coingecko',kind:'coin',id:'bitcoin'},name:'Bitcoin',symbol:'btc'};
test('concurrent first mounts and expired-cache mounts share one pending request',async()=>{
 let now=1_000_000_000,resolve!:(r:Response)=>void;const fetcher=vi.fn(()=>new Promise<Response>(r=>{resolve=r;}));const load=createCatalogLoader(fetcher as typeof fetch,()=>now);
 const first=load(),second=load();await Promise.resolve();expect(fetcher).toHaveBeenCalledTimes(1);resolve(Response.json({assets:[asset]}));expect(await first).toEqual(await second);await load();expect(fetcher).toHaveBeenCalledTimes(1);
 now+=CATALOG_FRESH_MS;const a=load(),b=load();await Promise.resolve();expect(fetcher).toHaveBeenCalledTimes(2);resolve(Response.json({assets:[asset]}));await Promise.all([a,b]);
});
test('a failed shared request permits one later retry and never caches malformed catalog',async()=>{
 const fetcher=vi.fn().mockResolvedValueOnce(Response.json({assets:[{...asset,ref:{...asset.ref,quantity:'private'}}]})).mockResolvedValueOnce(Response.json({assets:[asset]}));const load=createCatalogLoader(fetcher);
 await expect(load()).rejects.toThrow();expect(await load()).toEqual([asset]);expect(fetcher).toHaveBeenCalledTimes(2);
});
