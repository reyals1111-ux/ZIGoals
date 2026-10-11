// @vitest-environment jsdom
import {act,createElement} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {MarketsView} from '../components/platform/markets-view';
import {emptyPlatform,platformSchema,type Platform} from './positions';
import {buildShowcase} from './showcase-data';
import {PLATFORM_KEY} from './positions';
import {marketRequestKey,type MarketQuoteRequest} from './market-assets';
const env=vi.hoisted(()=>({data:null as unknown as Platform}));
vi.mock('../components/platform/use-platform',()=>({usePlatform:()=>({data:env.data,loaded:true,error:null,update:async()=>{}})}));
afterEach(()=>{vi.unstubAllGlobals();localStorage.clear();sessionStorage.clear();});
it('bounds a schema-limit portfolio and acquires only explicit pages or refreshes while search stays local',async()=>{
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);const template:Platform=JSON.parse(buildShowcase('2026-09-21').records[PLATFORM_KEY]!);
 env.data=platformSchema.parse({...emptyPlatform(),positions:Array.from({length:1000},(_,i)=>({...template.positions[0],id:`asset${i}`,providerId:`Asset${i}`,asset:`A${i}`,marketRef:{provider:'coingecko',kind:'coin',id:`asset${i}`}})),watchlist:[{ref:{provider:'coingecko',kind:'coin',id:'asset998'},name:'Asset998',symbol:'A998'}]});
 const requests:{url:string;rows:MarketQuoteRequest[]}[]=[];vi.stubGlobal('fetch',async(url:string,init:RequestInit)=>{const rows:MarketQuoteRequest[]=JSON.parse(String(init.body)).requests;requests.push({url,rows});if(url==='/api/market-quotes')return Response.json({quotes:[],error:null});const entries=rows.map(r=>({...r,source:r.marketRef.kind==='coin'?'CoinGecko':'CoinGecko tokenized RWA reference',marketBasis:r.marketRef.kind==='coin'?'coin':'tokenized',logoUrl:null,change24h:null,observedAt:null,fetchedAt:new Date().toISOString(),sparkline:null}));return Response.json({entries,results:Object.fromEntries(entries.map(entry=>[marketRequestKey(entry),{insight:entry,error:null,stale:false}])),error:null});});
 const element=document.createElement('div'),root=createRoot(element);document.body.append(element);
 const cards=()=>element.querySelectorAll('.market-product-card');const button=(name:string)=>[...element.querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent?.includes(name))!;
 const search=async(value:string)=>{await act(async()=>{const input=element.querySelector('input[type="search"]')!;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));});};
 try{
  await act(async()=>root.render(createElement(MarketsView)));expect(cards()).toHaveLength(24);expect(requests.length).toBe(2);expect(requests.every(r=>r.rows.length===24)).toBe(true);
  await act(async()=>button('Next').click());expect(cards()).toHaveLength(24);expect(cards()[0]!.textContent).toContain('Asset24');expect(requests).toHaveLength(4);
  const before=requests.length;await search('Asset9');expect(cards()).toHaveLength(24);await search('Asset999');expect(cards()).toHaveLength(1);expect(cards()[0]!.textContent).toContain('Asset999');expect(cards()[0]!.textContent).toContain('Price not loaded');expect(cards()[0]!.textContent).toContain('Seven-day sequence not loaded');expect(requests).toHaveLength(before);
  await act(async()=>button('Load prices for this view').click());expect(requests).toHaveLength(before+2);expect(requests.slice(-2).every(r=>r.rows.length===1&&r.rows[0]!.marketRef.id==='asset999')).toBe(true);
  await search('');await act(async()=>button('Favourites').click());expect(cards()).toHaveLength(1);expect(cards()[0]!.textContent).toContain('Asset998');
  await act(async()=>button('Owned').click());expect(cards()).toHaveLength(24);await act(async()=>button('Stocks').click());expect(cards()).toHaveLength(2);expect(element.querySelector('.markets-grid')!.textContent).toContain('Nvidia');expect(requests.every(r=>r.rows.length<=24)).toBe(true);
 }finally{await act(async()=>root.unmount());element.remove();}
});
