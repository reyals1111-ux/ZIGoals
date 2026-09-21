// @vitest-environment jsdom
import {act,createElement} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {PUBLIC_INSIGHTS_KEY} from './market-insights-cache';
import {useMarketInsights} from '../components/platform/use-market-insights';
import type {MarketAssetRef} from './market-assets';
(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();localStorage.clear();});
it('shares page-level batches across consumers and rerenders, with local aging and no polling',async()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-20T22:00:00Z'));
 const refs:MarketAssetRef[]=[{provider:'coingecko',kind:'coin',id:'bitcoin'},{provider:'coingecko',kind:'coin',id:'ethereum'}];
 const fetcher=vi.fn(async(_url,init:RequestInit)=>{const body=JSON.parse(String(init.body));const entries=body.requests.map((r:{marketRef:MarketAssetRef;currency:string})=>({...r,source:'CoinGecko',marketBasis:'coin',logoUrl:null,change24h:'1',observedAt:new Date().toISOString(),fetchedAt:new Date().toISOString(),sparkline:null}));return Response.json({entries,results:Object.fromEntries(entries.map((entry:{marketRef:MarketAssetRef})=>[`coingecko:coin:${entry.marketRef.id}:USD`,{insight:entry,error:null,stale:false}])),error:null});});vi.stubGlobal('fetch',fetcher);
 function Consumer({input}:{input:MarketAssetRef[]}){const market=useMarketInsights(input);return createElement('p',null,`${market.entries.length}:${market.now}`);}
 const element=document.createElement('div'),root=createRoot(element);await act(async()=>root.render(createElement(Consumer,{input:[]})));expect(fetcher).not.toHaveBeenCalled();
 await act(async()=>root.render(createElement('div',null,createElement(Consumer,{input:refs}),createElement(Consumer,{input:[...refs].reverse()}))));expect(fetcher).toHaveBeenCalledTimes(1);expect(element.querySelector('p')?.textContent).toMatch(/^2:/);
 expect(localStorage.getItem(PUBLIC_INSIGHTS_KEY)).toContain('bitcoin');
 await act(async()=>root.render(createElement(Consumer,{input:[...refs].reverse()})));expect(fetcher).toHaveBeenCalledTimes(1);await act(async()=>vi.advanceTimersByTime(36*60000));expect(fetcher).toHaveBeenCalledTimes(1);expect(element.textContent).toBe(`2:${Date.now()}`);await act(async()=>root.unmount());expect(vi.getTimerCount()).toBe(0);
});
it('skips delayed public insight persistence after a Showcase scope change without changing normal storage',async()=>{
 const {activateShowcase,getAppStorage}=await import('./showcase-storage');const {PUBLIC_INSIGHTS_KEY}=await import('./market-insights-cache');
 localStorage.setItem('owner-private','keep');const before=JSON.stringify({...localStorage});
 let finish:(response:Response)=>void=()=>{};vi.stubGlobal('fetch',()=>new Promise<Response>(resolve=>{finish=resolve;}));
 const ref:MarketAssetRef={provider:'coingecko',kind:'coin',id:'solana'};
 function Consumer(){useMarketInsights([ref]);return null;}
 const root=createRoot(document.createElement('div'));await act(async()=>root.render(createElement(Consumer)));
 activateShowcase(sessionStorage,'2026-09-20',{},'market-test');const entry={marketRef:ref,currency:'USD',source:'CoinGecko',marketBasis:'coin',logoUrl:null,change24h:'1',observedAt:new Date().toISOString(),fetchedAt:new Date().toISOString(),sparkline:null};
 await act(async()=>finish(Response.json({entries:[entry],results:{'coingecko:coin:solana:USD':{insight:entry,error:null,stale:false}},error:null})));
 expect(JSON.stringify({...localStorage})).toBe(before);expect(getAppStorage().getItem(PUBLIC_INSIGHTS_KEY)).toBeNull();await act(async()=>root.unmount());sessionStorage.clear();
});
