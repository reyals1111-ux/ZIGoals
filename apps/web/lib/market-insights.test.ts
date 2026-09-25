import {expect,it} from 'vitest';
import {parseMarketInsights,validatedLogoUrl,verifiedMarketInsight} from './market-insights';
import {createCoinGeckoProvider} from './server/coingecko';
import type {MarketQuoteRequest} from './market-assets';
const now=Date.parse('2026-09-20T22:00:00Z');
const coin:MarketQuoteRequest={marketRef:{provider:'coingecko',kind:'coin',id:'bitcoin'},currency:'USD'};
const gold:MarketQuoteRequest={marketRef:{provider:'coingecko',kind:'rwa',id:'gold',assetType:'commodity'},currency:'USD'};
const logo='https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png?1696501400';
const movement='"last_updated":"2026-09-20T21:56:20Z","price_change_percentage_24h":-1.123456789123456789,"sparkline_in_7d":{"price":[9007199254740993.123456789,2.5]}';
const payload=`[{"id":"bitcoin","image":"${logo}",${movement}}]`;
it('keeps exact movement and sequence prices with real provider time and no invented sample dates',()=>{
 const [entry]=parseMarketInsights(payload,[coin],now);expect(entry).toMatchObject({marketRef:coin.marketRef,change24h:'-1.123456789123456789',observedAt:'2026-09-20T21:56:20Z',marketBasis:'coin',sparkline:{range:'7d',timestamps:'unavailable',prices:[{value:'9007199254740993123456789',decimals:9},{value:'25',decimals:1}]}});expect(JSON.stringify(entry?.sparkline)).not.toContain('"at"');
});
it('uses only exact RWA identity and tokenized USD movement, never underlier or EUR fiction',()=>{
 const text=`[{"id":"gold","asset_type":"commodity","image":"${logo}","price_change_percentage_24h":999,"tokenized_market_data":{${movement}}}]`;
 expect(parseMarketInsights(text,[gold],now)[0]).toMatchObject({change24h:'-1.123456789123456789',source:'CoinGecko tokenized RWA reference',marketBasis:'tokenized'});
 expect(parseMarketInsights(text,[{...gold,currency:'EUR'}],now)[0]).toMatchObject({change24h:null,sparkline:null,observedAt:null});
 expect(()=>parseMarketInsights(text,[{...gold,marketRef:{...gold.marketRef,kind:'rwa',assetType:'stock'}}],now)).toThrow();
 expect(parseMarketInsights('[{"id":"gold","asset_type":"commodity"}]',[gold],now)[0]).toMatchObject({change24h:null,sparkline:null});
});
it('rejects unrequested or duplicate identities, malformed evidence, oversized series and future timestamps',()=>{
 for(const text of [payload.replace('bitcoin','ethereum'),`[${payload.slice(1,-1)},${payload.slice(1,-1)}]`,payload.replace('2026-09-20T21:56:20Z','2028-01-01T00:00:00Z'),payload.replace('2.5','-2'),payload.replace('2.5','1e999'),payload.replace('[9007199254740993.123456789,2.5]',`[${Array(201).fill('1').join(',')}]`)])expect(()=>parseMarketInsights(text,[coin],now)).toThrow();
 const good=parseMarketInsights(payload,[coin],now)[0]!;expect(()=>verifiedMarketInsight({...good,quantity:'private'},coin,now)).toThrow();expect(()=>verifiedMarketInsight({...good,currency:'EUR'},coin,now)).toThrow();
});
it('accepts narrow HTTPS CoinGecko raster metadata only',()=>{
 expect(validatedLogoUrl(logo)).toBe(logo);
 for(const url of ['https://evil.test/a.png','http://coin-images.coingecko.com/coins/images/1/large/a.png','https://coin-images.coingecko.com.evil.test/coins/images/1/large/a.png','https://user@coin-images.coingecko.com/coins/images/1/large/a.png','https://coin-images.coingecko.com:444/coins/images/1/large/a.png','https://coin-images.coingecko.com/coins/images/1/large/a.svg','https://coin-images.coingecko.com/coins/images/1/large/a.png?url=http://localhost','https://coin-images.coingecko.com/coins/images/1/large/%2f.png'])expect(validatedLogoUrl(url)).toBeNull();
});
it('provider insights use batched currencies, shared admission and return partial success on quota failure',async()=>{
 const urls:string[]=[],headers:unknown[]=[];const fetcher:typeof fetch=async(input,init)=>{urls.push(String(input));headers.push(init?.headers);return new Response(String(input).includes('/rwas/')?'quota secret detail':payload,{headers:{"Content-Type":"application/json"},status:String(input).includes('/rwas/')?429:200});};
 const provider=createCoinGeckoProvider({key:()=> 'fixture-key',fetcher,clock:()=>now});
 expect(typeof provider.insights).toBe('function');
 const result=await provider.insights([coin,coin,gold]);expect(result.entries).toHaveLength(1);expect(result.error).toMatch(/unavailable/);expect(urls).toHaveLength(2);expect(new URL(urls[0]!).searchParams.get('ids')).toBe('bitcoin');expect(new URL(urls[0]!).pathname).toBe('/api/v3/coins/markets');expect(new URL(urls[0]!).searchParams.get('sparkline')).toBe('true');expect(headers[0]).toEqual({Accept:'application/json','x-cg-demo-api-key':'fixture-key'});expect(JSON.stringify(result)).not.toContain('secret');
 for(let i=0;i<20;i++)await provider.quotes([coin]).catch(()=>undefined);expect(urls).toHaveLength(12);
 const missing=createCoinGeckoProvider({key:()=>undefined,fetcher,clock:()=>now});expect((await missing.insights([coin])).entries).toEqual([]);expect(urls).toHaveLength(12);
});
it('splits provider batches at 250 IDs per currency without a request per asset',async()=>{
 const seen:Array<{ids:number;currency:string|null}>=[];const provider=createCoinGeckoProvider({key:()=> 'fixture-key',clock:()=>now,fetcher:async input=>{const url=new URL(String(input));seen.push({ids:url.searchParams.get('ids')!.split(',').length,currency:url.searchParams.get('vs_currency')});return new Response('[]', {headers:{"Content-Type":"application/json"}});}});
 const requests=Array.from({length:501},(_,index)=>({...coin,marketRef:{...coin.marketRef,id:`asset-${index}`}}));await provider.insights([...requests,...requests.map(request=>({...request,currency:'EUR' as const}))]);expect(seen).toEqual([{ids:250,currency:'usd'},{ids:250,currency:'usd'},{ids:1,currency:'usd'},{ids:250,currency:'eur'},{ids:250,currency:'eur'},{ids:1,currency:'eur'}]);
});
