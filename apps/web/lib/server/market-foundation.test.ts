import {expect,it} from 'vitest';
import {createCoinGeckoProvider,NATIVE_ZIG_ETHEREUM_CONTRACT} from './coingecko';
import {createMarketQuoteCache} from '../market-quote-cache';
import {quoteIsStale} from '../market-quotes';
import {providerHttpFailure,ProviderFailure,sanitizeProviderFailure} from './provider-failure';
import type {MarketQuoteRequest} from '../market-assets';
const now=Date.parse('2026-09-20T12:00:00Z');
const coin=(id:string):MarketQuoteRequest=>({marketRef:{provider:'coingecko',kind:'coin',id},currency:'USD'});
const gold:MarketQuoteRequest={marketRef:{provider:'coingecko',kind:'rwa',id:'gold',assetType:'commodity'},currency:'USD'};
const json=(id:string)=>Response.json({[id]:{usd:1.234,last_updated_at:now/1000}});
it.each([[429,'THROTTLED'],[503,'UPSTREAM_5XX'],[401,'AUTHENTICATION'],[403,'UNKNOWN'],[404,'UNKNOWN']])('sanitizes HTTP %s without interpreting arbitrary denial', (status,category)=>{
 const error=providerHttpFailure(Number(status));expect(error.category).toBe(category);expect(error.message).toBe('CoinGecko market data unavailable.');
});
it('does not retain arbitrary errors or their bodies and distinguishes local failures',()=>{
 expect(sanitizeProviderFailure(Error('private body')).category).toBe('UNKNOWN');
 expect(JSON.stringify(sanitizeProviderFailure(Error('private body')))).not.toContain('private');
 expect(sanitizeProviderFailure(new ProviderFailure('LOCAL_BUDGET')).category).toBe('LOCAL_BUDGET');
});
it('retains first valid batch when later partition fails and classifies every pair',async()=>{
 const p=createCoinGeckoProvider({key:()=> 'fixture',clock:()=>now,fetcher:async url=>String(url).includes('simple/price')?json('bitcoin'):new Response('private',{status:503})});
 const result=await p.quoteResults([coin('bitcoin'),gold]);expect(result.quotes).toHaveLength(1);expect(result.error).toBeTruthy();expect(result.results.map(r=>r.status)).toEqual(['VERIFIED_FRESH','PROVIDER_UNAVAILABLE']);expect(result.complete).toBe(false);
});
it('retains non-ZIG recovery after mixed failure and failed token fallback',async()=>{
 const calls:string[]=[];const p=createCoinGeckoProvider({key:()=> 'fixture',clock:()=>now,fetcher:async input=>{const url=new URL(String(input));calls.push(url.pathname);return url.searchParams.get('ids')==='bitcoin'?json('bitcoin'):new Response('secret',{status:503});}});
 const result=await p.quoteResults([coin('bitcoin'),coin('zignaly')]);expect(result.quotes.map(q=>q.providerAssetId)).toEqual(['bitcoin']);expect(result.results[1]?.status).toBe('PROVIDER_UNAVAILABLE');expect(calls).toHaveLength(3);expect(JSON.stringify(result)).not.toContain('secret');
});
it('accepts strictly verified ZIG fallback and reports complete evidence',async()=>{
 const p=createCoinGeckoProvider({key:()=> 'fixture',clock:()=>now,fetcher:async input=>String(input).includes('token_price')?json(NATIVE_ZIG_ETHEREUM_CONTRACT):new Response('',{status:503})});
 const result=await p.quoteResults([coin('zignaly')]);expect(result.complete).toBe(true);expect(result.error).toBeNull();expect(result.quotes[0]).toMatchObject({providerAssetId:'zignaly',price:'1234',priceDecimals:3,source:'CoinGecko'});
});
it('classifies all failures without prices and retains stale cache on degraded refresh',async()=>{
 let fail=false,time=now;const p=createCoinGeckoProvider({key:()=> 'fixture',clock:()=>time,fetcher:async()=>fail?new Response('',{status:429}):json('bitcoin')});
 const cache=createMarketQuoteCache(r=>p.quoteResults(r),()=>time);await cache.refresh([coin('bitcoin')]);const first=cache.getSnapshot().quotes[0]!;fail=true;time+=900001;await cache.refresh([coin('bitcoin')]);expect(cache.getSnapshot().quotes[0]).toEqual(first);expect(quoteIsStale(first,time)).toBe(true);expect(cache.getSnapshot().error).toBeTruthy();
 const result=await p.quoteResults([coin('ethereum')]);expect(result.quotes).toEqual([]);expect(result.results[0]?.status).toBe('PROVIDER_THROTTLED');
});
it('rejects wrong/unexpected/duplicate identities atomically within the affected response',async()=>{
 for(const text of ['{"wrong":{"usd":1}}','{"bitcoin":{"usd":1},"bitcoin":{"usd":2}}']){
 const p=createCoinGeckoProvider({key:()=> 'fixture',clock:()=>now,fetcher:async()=>new Response(text,{headers:{'Content-Type':'application/json'}})});
 const result=await p.quoteResults([coin('bitcoin')]);expect(result.quotes).toEqual([]);expect(result.results[0]?.status).toBe('PROVIDER_MALFORMED');
 }
});
it('does not add a token attempt after non-ZIG recovery fails',async()=>{
 const calls:string[]=[];const p=createCoinGeckoProvider({key:()=> 'fixture',clock:()=>now,fetcher:async input=>{calls.push(String(input));return new Response('',{status:503});}});
 const result=await p.quoteResults([coin('bitcoin'),coin('zignaly')]);expect(result.quotes).toEqual([]);expect(calls).toHaveLength(2);expect(calls.some(url=>url.includes('token_price'))).toBe(false);
});
it('retains a full first 250-ID batch when the second coin batch fails',async()=>{
 const requests=Array.from({length:251},(_,i)=>coin('asset-'+i));let calls=0;
 const p=createCoinGeckoProvider({key:()=> 'fixture',clock:()=>now,fetcher:async()=>++calls===1?Response.json(Object.fromEntries(requests.slice(0,250).map(r=>[r.marketRef.id,{usd:1,last_updated_at:now/1000}]))):new Response('',{status:503})});
 const result=await p.quoteResults(requests);expect(result.quotes).toHaveLength(250);expect(result.results).toHaveLength(251);expect(result.results[250]?.status).toBe('PROVIDER_UNAVAILABLE');
});
it.each([['TimeoutError','TIMEOUT'],['AbortError','TIMEOUT'],['TypeError','NETWORK']] as const)('classifies %s without keeping exception text',async(name,category)=>{
 const p=createCoinGeckoProvider({key:()=> 'fixture',clock:()=>now,fetcher:async()=>{const error=Error('private details');error.name=name;throw error;}});
 const result=await p.quoteResults([coin('bitcoin')]);expect(result.results[0]?.failure).toBe(category);expect(JSON.stringify(result)).not.toContain('private');
});
it('classifies unsupported RWA currency and local exhaustion independently of upstream throttle',async()=>{
 let calls=0;const p=createCoinGeckoProvider({key:()=> 'fixture',clock:()=>now,fetcher:async()=>{calls++;return new Response('',{status:503});}});
 const unsupported=await p.quoteResults([{...gold,currency:'EUR'}]);expect(unsupported.results[0]?.status).toBe('UNSUPPORTED');expect(calls).toBe(0);
 for(let i=0;i<12;i++)await p.quoteResults([coin('bitcoin')]);
 const result=await p.quoteResults([coin('bitcoin')]);expect(result.results[0]).toMatchObject({status:'NOT_ATTEMPTED_BUDGET',failure:'LOCAL_BUDGET'});expect(calls).toBe(12);
});
