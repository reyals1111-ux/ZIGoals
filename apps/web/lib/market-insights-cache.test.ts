import {expect,it} from 'vitest';
import {createMarketInsightsCache} from './market-insights-cache';
import {parseMarketInsights,type MarketInsight} from './market-insights';
import type {MarketQuoteRequest} from './market-assets';
const now=Date.parse('2026-09-20T22:00:00Z');
const request:MarketQuoteRequest={marketRef:{provider:'coingecko',kind:'coin',id:'bitcoin'},currency:'USD'};
const key='coingecko:coin:bitcoin:USD';
const entry=(id='bitcoin'):MarketInsight=>parseMarketInsights(`[{"id":"${id}","image":"https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png","last_updated":"2026-09-20T22:00:00Z","price_change_percentage_24h":1,"sparkline_in_7d":{"price":[1,2]}}]`,[{...request,marketRef:{...request.marketRef,id}}],now)[0]!;
it('deduplicates pending requests and identity reorders, and gates forced refreshes',async()=>{
 let calls=0,time=now;const cache=createMarketInsightsCache(async()=>{calls++;await Promise.resolve();return {entries:[entry()],error:null};},()=>time);
 await Promise.all([cache.refresh([request,request]),cache.refresh([request])]);expect(calls).toBe(1);expect(cache.getSnapshot().results[key]).toMatchObject({stale:false,insight:{change24h:'1'}});
 await cache.refresh([request],true);expect(calls).toBe(1);time+=60001;await cache.refresh([request],true);expect(calls).toBe(2);cache.tick();expect(cache.getSnapshot().now).toBe(time);
});
it('retains last-good movement and metadata across provider failure, marks staleness and sanitizes errors',async()=>{
 let time=now,fail=false;const cache=createMarketInsightsCache(async()=>{if(fail)throw Error('secret upstream detail');return {entries:[entry()],error:null};},()=>time);
 await cache.refresh([request]);time+=900001;fail=true;await cache.refresh([request]);const result=cache.getSnapshot().results[key]!;expect(result.insight?.change24h).toBe('1');expect(result.insight?.logoUrl).toMatch(/^\/api\/market-logo/);expect(result.stale).toBe(true);expect(result.error).toMatch(/retained/);expect(JSON.stringify(result)).not.toContain('secret');
});
it('rejects private, unsolicited, duplicate or older evidence while preserving valid cache',async()=>{
 let time=now;let rows:MarketInsight[]=[entry()];const cache=createMarketInsightsCache(async()=>({entries:rows,error:null}),()=>time);await cache.refresh([request]);
 for(const invalid of [[{...entry(),quantity:'private'}],[entry('ethereum')],[entry(),entry()],[{...entry(),change24h:'2',observedAt:'2026-09-20T20:00:00Z'}]]){time+=900001;rows=invalid;await cache.refresh([request],true);expect(cache.getSnapshot().entries[0]?.change24h).toBe('1');}
});
it('records missing identities individually and does not mark a valid partial result unavailable',async()=>{
 const cache=createMarketInsightsCache(async()=>({entries:[entry()],error:'quota'}),()=>now);await cache.refresh([request,{...request,marketRef:{...request.marketRef,id:'ethereum'}}]);
 expect(cache.getSnapshot().results[key]?.error).toBeNull();expect(cache.getSnapshot().results['coingecko:coin:ethereum:USD']).toMatchObject({insight:null,stale:true,error:expect.stringMatching(/unavailable/)});
});
it('hydrates public-only bounded cache and ignores private/malformed persisted rows',async()=>{
 const store={getItem:()=>JSON.stringify([entry()]),setItem:()=>undefined};const cache=createMarketInsightsCache(async()=>({entries:[],error:'offline'}),()=>now);cache.hydrate(store);expect(cache.getSnapshot().entries).toHaveLength(1);
 const unsafe=createMarketInsightsCache(async()=>({entries:[],error:null}),()=>now);unsafe.hydrate({...store,getItem:()=>JSON.stringify([{...entry(),wallet:'private'}])});expect(unsafe.getSnapshot().entries).toHaveLength(0);
});
it('retains validated logo metadata when a successful movement refresh lacks an image',async()=>{
 let time=now,logo=true;const cache=createMarketInsightsCache(async()=>({entries:[{...entry(),fetchedAt:new Date(time).toISOString(),sparkline:null,logoUrl:logo?entry().logoUrl:null}],error:null}),()=>time);
 await cache.refresh([request]);time+=900001;logo=false;await cache.refresh([request]);expect(cache.getSnapshot().entries[0]?.logoUrl).toMatch(/^\/api\/market-logo/);
});
