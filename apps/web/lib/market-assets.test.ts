import {expect,it} from 'vitest';
import {marketAssetRefSchema,parseMarketCatalog,searchMarketAssets,marketRequestSchema} from './market-assets';
it('keeps ambiguous tickers distinct and ranks public identity without guessing',()=>{
 const assets=parseMarketCatalog('[{"id":"alpha","name":"Alpha","symbol":"btc","platforms":{"ethereum":"0x123"}},{"id":"bitcoin","name":"Bitcoin","symbol":"btc","platforms":{}}]','coin');
 expect(searchMarketAssets('btc',assets)).toHaveLength(2);expect(searchMarketAssets('bitcoin',assets)[0]!.ref.id).toBe('bitcoin');expect(assets[0]!.platforms).toEqual({ethereum:'0x123'});
});
it('strictly excludes private fields from public request identity',()=>{
 const ref={provider:'coingecko',kind:'coin',id:'bitcoin'};
 expect(marketAssetRefSchema.safeParse({...ref,quantity:'100'}).success).toBe(false);
 expect(marketRequestSchema.safeParse({marketRef:ref,currency:'USD',wallet:'private'}).success).toBe(false);
 expect(marketAssetRefSchema.safeParse({...ref,id:'bitcoin,ethereum'}).success).toBe(false);
 expect(marketAssetRefSchema.safeParse({...ref,contractAddress:'0x123'}).success).toBe(false);
});
it('rejects duplicate catalog identities and malformed catalogs',()=>{
 expect(()=>parseMarketCatalog('[{"id":"gold","name":"Gold","symbol":"XAU","asset_type":"commodity"}]','rwa')).not.toThrow();
 expect(()=>parseMarketCatalog('[{"id":"gold","name":"Gold","symbol":"XAU","asset_type":"spot"}]','rwa')).toThrow();
 expect(()=>parseMarketCatalog('[{"id":"a","name":"A","symbol":"a"},{"id":"a","name":"B","symbol":"b"}]','coin')).toThrow();
});
it('rejects duplicate catalog object members including escaped identity keys',()=>{
 expect(()=>parseMarketCatalog('[{"id":"bitcoin","\\u0069d":"fake","name":"Bitcoin","symbol":"btc"}]','coin')).toThrow();
});
it('accepts live catalog provider IDs beginning with punctuation and assets without ticker metadata',()=>{
 const assets=parseMarketCatalog('[{"id":"_","name":"Gib","symbol":"gib"},{"id":"-11","name":"Zhao","symbol":"赵长娥"},{"id":"artificial-pepe-2","name":"Artificial Pepe","symbol":""}]','coin');expect(assets.map(a=>a.ref.id)).toEqual(['_','-11','artificial-pepe-2']);expect(searchMarketAssets('artificial',assets)[0]!.symbol).toBe('');
});
it('deduplicates large position collections before enforcing the unique market bound',async()=>{
 const {uniqueMarketRequests}=await import('./market-assets');const request={marketRef:{provider:'coingecko' as const,kind:'coin' as const,id:'bitcoin'},currency:'USD' as const};expect(uniqueMarketRequests(Array.from({length:1000},()=>request))).toEqual([request]);expect(uniqueMarketRequests(Array.from({length:1000},(_,i)=>({...request,marketRef:{...request.marketRef,id:`asset-${i}`}})))).toHaveLength(1000);
});
