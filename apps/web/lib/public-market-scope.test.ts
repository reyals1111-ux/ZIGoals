// @vitest-environment jsdom
import {act,createElement} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {parseCoinQuotes} from './market-quotes';
const ref={provider:'coingecko' as const,kind:'coin' as const,id:'bitcoin'};
(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
const bytes=(storage:Storage)=>Array.from({length:storage.length},(_,i)=>storage.key(i)!).sort().map(key=>[key,storage.getItem(key)]);
beforeEach(()=>{localStorage.clear();sessionStorage.clear();vi.resetModules();});
afterEach(()=>{vi.unstubAllGlobals();localStorage.clear();sessionStorage.clear();});
it.each([['quotes','normal-to-showcase'],['quotes','showcase-to-normal'],['insights','normal-to-showcase'],['insights','showcase-to-normal']] as const)('%s skips persistence when an in-flight response crosses %s',async(kind,direction)=>{
 const {activateShowcase,exitShowcase}=await import('./showcase-storage');
 if(direction==='showcase-to-normal')activateShowcase(sessionStorage,'2026-09-21',{},'captured-public-cache');
 localStorage.setItem('owner-sentinel','unchanged');
 let finish:(response:Response)=>void=()=>{};vi.stubGlobal('fetch',()=>new Promise<Response>(resolve=>{finish=resolve;}));
 const {useMarketQuotes}=await import('../components/platform/use-market-quotes');const {useMarketInsights}=await import('../components/platform/use-market-insights');
 function Quotes(){const state=useMarketQuotes([{marketRef:ref,currency:'USD'}]);return createElement('p',null,state.quotes.length);}
 function Insights(){const state=useMarketInsights([ref]);return createElement('p',null,state.entries.length);}
 const container=document.createElement('div'),root=createRoot(container);
 try{await act(async()=>root.render(createElement(kind==='quotes'?Quotes:Insights)));
 if(direction==='showcase-to-normal')exitShowcase();else activateShowcase(sessionStorage,'2026-09-21',{},'captured-public-cache');
 const normalBefore=bytes(localStorage),sessionBefore=bytes(sessionStorage),now=Date.now();
 const quote=parseCoinQuotes(`{"bitcoin":{"usd":123,"last_updated_at":${Math.floor(now/1000)}}}`,[{marketRef:ref,currency:'USD'}],now)[0]!;
 const insight={marketRef:ref,currency:'USD',source:'CoinGecko',marketBasis:'coin',logoUrl:null,change24h:'1',observedAt:new Date(now).toISOString(),fetchedAt:new Date(now).toISOString(),sparkline:null};
 await act(async()=>finish(Response.json(kind==='quotes'?{quotes:[quote],error:null}:{entries:[insight],results:{'coingecko:coin:bitcoin:USD':{insight,error:null,stale:false}},error:null})));
 expect(container.textContent).toBe('1');expect(bytes(localStorage)).toEqual(normalBefore);expect(bytes(sessionStorage)).toEqual(sessionBefore);
 }finally{await act(async()=>root.unmount());}
});
