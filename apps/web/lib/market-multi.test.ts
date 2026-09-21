import {expect,it,vi} from 'vitest';
import {parseCoinQuotes,parseRwaQuotes,quoteMatchesPosition,QUOTE_FRESH_MS} from './market-quotes';
import {createMarketQuoteCache} from './market-quote-cache';
import {buildCoinGeckoRequests,createCoinGeckoProvider} from './server/coingecko';
import type {MarketQuoteRequest} from './market-assets';
const now=Date.parse('2026-09-20T12:00:00Z');
const coin=(id:string,currency:'USD'|'EUR'='USD'):MarketQuoteRequest=>({marketRef:{provider:'coingecko',kind:'coin',id},currency});
const gold:MarketQuoteRequest={marketRef:{provider:'coingecko',kind:'rwa',id:'gold',assetType:'commodity'},currency:'USD'};
it('parses exact numeric lexemes per identity/currency with no floating price conversion',()=>{
 const q=parseCoinQuotes(`{"bitcoin":{"usd":9007199254740993.123456789,"eur":1.25e-8,"last_updated_at":${now/1000}}}`,[coin('bitcoin'),coin('bitcoin','EUR')],now);
 expect(q.map(v=>[v.price,v.priceDecimals])).toEqual([['9007199254740993123456789',9],['125',10]]);
 expect(q[0]!.fetchedAt).toBe(new Date(now).toISOString());expect(QUOTE_FRESH_MS).toBe(900000);
});
it('rejects duplicates escaped keys malformed prices unexpected IDs and future timestamps',()=>{
 for(const text of ['{"bitcoin":{"usd":01}}','{"bitcoin":{"usd":1,"\\u0075sd":2}}','{"bitcoin":{"usd":"2"}}','{"bitcoin":{"usd":1e999}}','{"bitcoin":{"usd":-1}}','{"other":{"usd":2}}',`{"bitcoin":{"usd":2,"last_updated_at":${now/1000+1000}}}`])expect(()=>parseCoinQuotes(text,[coin('bitcoin')],now)).toThrow();
});
it('uses tokenized RWA evidence and leaves missing observation time absent; EUR is never mislabeled',()=>{
 const q=parseRwaQuotes('[{"id":"gold","asset_type":"commodity","tokenized_market_data":{"current_price":4572.123456789123456789}}]',[gold],now)[0]!;
 expect(q).toMatchObject({price:'4572123456789123456789',priceDecimals:18,source:'CoinGecko tokenized RWA reference',currency:'USD'});expect(q.observedAt).toBeUndefined();
 expect(()=>buildCoinGeckoRequests([{...gold,currency:'EUR'}])).toThrow(/USD/);
});
it('batches and deduplicates coins across currencies and RWA IDs; public projection contains no private data',()=>{
 const requests=buildCoinGeckoRequests([coin('bitcoin'),coin('ethereum'),coin('bitcoin','EUR'),coin('bitcoin'),gold]);
 expect(requests).toHaveLength(2);const urls=requests.map(r=>new URL(r.url));expect(urls[0]!.searchParams.get('ids')).toBe('bitcoin,ethereum');expect(urls[0]!.searchParams.get('vs_currencies')).toBe('usd,eur');expect(urls[1]!.pathname).toContain('/rwas/markets');
 expect(()=>buildCoinGeckoRequests([{...coin('bitcoin'),quantity:'private'} as MarketQuoteRequest])).toThrow();
});
it('matches canonical refs and only verified native identity fallback',()=>{
 const q=parseCoinQuotes(`{"bitcoin":{"usd":2,"last_updated_at":${now/1000}}}`,[coin('bitcoin')],now)[0]!;
 expect(quoteMatchesPosition({network:'external',denom:'BTC',decimals:8,marketRef:coin('bitcoin').marketRef},q)).toBe(true);
 expect(quoteMatchesPosition({network:'external',denom:'BTC',decimals:8},q)).toBe(false);
 expect(quoteMatchesPosition({network:'external',denom:'BTC',decimals:8,marketRef:coin('bitcoin').marketRef,valuationMode:'manual'},q)).toBe(false);
});
it('retains last-good per asset, gates manual retry and shares concurrent refreshes',async()=>{
 let time=now,fail=false;const load=vi.fn(async(requests:readonly MarketQuoteRequest[])=>{if(fail)throw Error('offline');return parseCoinQuotes(`{"bitcoin":{"usd":2,"last_updated_at":${now/1000}}}`,requests,now);});
 const cache=createMarketQuoteCache(load,()=>time);await Promise.all([cache.refresh([coin('bitcoin')]),cache.refresh([coin('bitcoin')])]);expect(load).toHaveBeenCalledTimes(1);await cache.refresh([coin('bitcoin')],true);expect(load).toHaveBeenCalledTimes(1);
 time+=61000;await cache.refresh([coin('bitcoin')],true);expect(load).toHaveBeenCalledTimes(2);time+=900000;fail=true;await cache.refresh([coin('bitcoin')]);expect(cache.getSnapshot().quotes).toHaveLength(1);expect(cache.getSnapshot().error).toContain('retained');
});
it('requires a server key and never leaks it in query/body or provider errors',async()=>{
 const fetcher=vi.fn(async()=>new Response('quota private provider detail',{status:429}));
 await expect(createCoinGeckoProvider({key:()=>undefined,fetcher,clock:()=>now}).quotes([coin('bitcoin')])).rejects.toThrow(/unavailable/);expect(fetcher).not.toHaveBeenCalled();
 await expect(createCoinGeckoProvider({key:()=> 'fixture-key',fetcher,clock:()=>now}).quotes([coin('bitcoin')])).rejects.toThrow('CoinGecko market data unavailable.');
 const [url,init]=fetcher.mock.calls[0]! as unknown as [string,RequestInit];expect(url).not.toContain('fixture-key');expect(init.headers).toEqual({Accept:'application/json','x-cg-demo-api-key':'fixture-key'});expect(init.body).toBeUndefined();
});
it('chunks public IDs at provider limits rather than one request per position',()=>{
 const batches=buildCoinGeckoRequests(Array.from({length:500},(_,i)=>coin(`asset-${i}`)));expect(batches).toHaveLength(2);expect(batches.map(b=>b.requests.length)).toEqual([250,250]);
});
it('caches catalogs for 24 hours, gates failed retries and retains the last good catalog',async()=>{
 let time=now,fail=false,calls=0;
 const fetcher:typeof fetch=async input=>{calls++;if(fail)throw Error('offline');return new Response(String(input).includes('/coins/list')?'[{"id":"bitcoin","name":"Bitcoin","symbol":"btc","platforms":{}}]':'[{"id":"gold","name":"Gold","symbol":"xau","asset_type":"commodity"}]');};
 const provider=createCoinGeckoProvider({key:()=> 'fixture-key',fetcher,clock:()=>time});const [a,b]=await Promise.all([provider.catalog(),provider.catalog()]);expect(a.assets).toHaveLength(2);expect(b.assets).toEqual(a.assets);expect(calls).toBe(2);time+=23*3600000;await provider.catalog();expect(calls).toBe(2);time+=3600001;fail=true;const stale=await provider.catalog();expect(stale.assets).toEqual(a.assets);expect(stale.stale).toBe(true);expect(stale.error).toContain('retained');await provider.catalog();expect(calls).toBe(4);time+=60001;await provider.catalog();expect(calls).toBe(6);
});
it('preserves valid public cache across malformed refreshes and refuses private cache fields',async()=>{
 const good=parseCoinQuotes(`{"bitcoin":{"usd":2,"last_updated_at":${now/1000}}}`,[coin('bitcoin')],now)[0]!;let time=now;
 const writes:string[]=[];const store={getItem:()=>JSON.stringify([good]),setItem:(_key:string,text:string)=>{writes.push(text);}};
 const cache=createMarketQuoteCache(async()=>[{...good,quantity:'private'}],()=>time);cache.hydrate(store);expect(cache.getSnapshot().quotes).toEqual([good]);time+=900001;await cache.refresh([coin('bitcoin')]);expect(cache.getSnapshot().quotes).toEqual([good]);expect(writes).toEqual([]);
 const unsafe=createMarketQuoteCache(async()=>[],()=>time);unsafe.hydrate({...store,getItem:()=>JSON.stringify([{...good,wallet:'private'}])});expect(unsafe.getSnapshot().quotes).toEqual([]);
});
it('rejects cached evidence with no timestamp and does not overwrite a newer provider observation',async()=>{
 const good=parseCoinQuotes(`{"bitcoin":{"usd":2,"last_updated_at":${now/1000}}}`,[coin('bitcoin')],now)[0]!;
 const {verifiedMarketQuote}=await import('./market-quotes');expect(()=>verifiedMarketQuote({...good,observedAt:undefined,fetchedAt:undefined},now)).toThrow();
 const legacy={base:{network:'zigchain-1',denom:'uzig',decimals:6},currency:'USD',price:'43',priceDecimals:3,source:'CoinGecko',providerAssetId:'zignaly',verification:'VERIFIED'};expect(()=>verifiedMarketQuote(legacy,now)).toThrow();
 let time=now+900001;const cache=createMarketQuoteCache(async()=>[{...good,price:'1',observedAt:new Date(now-1000).toISOString(),fetchedAt:new Date(time).toISOString()}],()=>time);cache.hydrate({getItem:()=>JSON.stringify([good]),setItem:()=>undefined});await cache.refresh([coin('bitcoin')]);expect(cache.getSnapshot().quotes[0]!.price).toBe('2');time++;
});
it('adopts last-good server evidence while preserving its reported refresh error',async()=>{
 const q=parseCoinQuotes(`{"bitcoin":{"usd":2,"last_updated_at":${now/1000}}}`,[coin('bitcoin')],now)[0]!;
 const cache=createMarketQuoteCache(async()=>({quotes:[q],error:'Market refresh failed; retained evidence.'}),()=>now+900001);await cache.refresh([coin('bitcoin')]);expect(cache.getSnapshot().quotes).toEqual([q]);expect(cache.getSnapshot().error).toContain('retained');
});
it('does not count inconsistent quote provenance even if an explicit provider ref matches',()=>{
 const q=parseCoinQuotes(`{"bitcoin":{"usd":2,"last_updated_at":${now/1000}}}`,[coin('bitcoin')],now)[0]!;const p={network:'external',denom:'BTC',decimals:8,marketRef:coin('bitcoin').marketRef};
 expect(quoteMatchesPosition(p,{...q,providerAssetId:'ethereum'})).toBe(false);expect(quoteMatchesPosition(p,{...q,source:'Untrusted'})).toBe(false);
});
it('globally bounds new-ID provider attempts during a minute without losing last-good cache data',async()=>{
 let calls=0,time=now;const fetcher:typeof fetch=async()=>{calls++;return new Response('{}');};const provider=createCoinGeckoProvider({key:()=> 'fixture-key',fetcher,clock:()=>time});
 for(let i=0;i<20;i++)await provider.quotes([coin(`absent-${i}`)]).catch(()=>undefined);expect(calls).toBe(12);time+=60001;await provider.quotes([coin('fresh-minute')]).catch(()=>undefined);expect(calls).toBe(13);
});
it('transports 1000 public assets as two bounded app requests and retains all verified quotes',async()=>{
 const {fetchPublicMarketQuotes}=await import('./market-quote-client');const requests=Array.from({length:1000},(_,i)=>coin(`asset-${i}`));const sizes:number[]=[];
 const fetcher:typeof fetch=async(_url,init)=>{const body=JSON.parse(String(init?.body));sizes.push(body.requests.length);const data=Object.fromEntries(body.requests.map((r:MarketQuoteRequest)=>[r.marketRef.id,{usd:1,last_updated_at:Math.floor(Date.now()/1000)}]));return Response.json({quotes:parseCoinQuotes(JSON.stringify(data),body.requests),error:null});};
 const cache=createMarketQuoteCache((r,force)=>fetchPublicMarketQuotes(r,force,fetcher));await cache.refresh(requests);expect(sizes).toEqual([500,500]);expect(cache.getSnapshot().quotes).toHaveLength(1000);await cache.refresh(requests);expect(sizes).toEqual([500,500]);
});
it('limits concurrent provider requests while allowing queued public identities',async()=>{
 let active=0,peak=0;const fetcher:typeof fetch=async()=>{active++;peak=Math.max(peak,active);await Promise.resolve();active--;return new Response('{}');};const provider=createCoinGeckoProvider({key:()=> 'fixture-key',fetcher,clock:()=>now});await Promise.all(Array.from({length:8},(_,i)=>provider.quotes([coin(`asset-${i}`)]).catch(()=>undefined)));expect(peak).toBe(2);
});
