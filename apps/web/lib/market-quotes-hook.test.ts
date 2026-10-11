// @vitest-environment jsdom
import {act,createElement} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {PUBLIC_QUOTE_KEY} from './market-quote-cache';
import {useMarketQuotes} from '../components/platform/use-market-quotes';
import {nativeZigIdentity} from './market-quotes';
(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();localStorage.clear();});
it('does no market request when disabled and shares one refresh and reactive aging across consumers',async()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-18T12:00:00Z'));
 const fetcher=vi.fn(async()=>Response.json({quote:{base:nativeZigIdentity,currency:'USD',price:'43',priceDecimals:3,source:'CoinGecko',providerAssetId:'zignaly',observedAt:new Date().toISOString(),verification:'VERIFIED'}}));vi.stubGlobal('fetch',fetcher);
 function Consumer({enabled}:{enabled:boolean}){const market=useMarketQuotes(enabled);return createElement('p',null,`${market.quotes.length}:${market.now}`);}
 const element=document.createElement('div'),root=createRoot(element);
 await act(async()=>root.render(createElement(Consumer,{enabled:false})));expect(fetcher).not.toHaveBeenCalled();
 const disabledBefore=element.textContent;await act(async()=>vi.advanceTimersByTime(30000));expect(element.textContent).not.toBe(disabledBefore);expect(element.textContent).toBe(`0:${Date.now()}`);expect(fetcher).not.toHaveBeenCalled();
 await act(async()=>root.render(createElement('div',null,createElement(Consumer,{enabled:true}),createElement(Consumer,{enabled:true}))));expect(fetcher).toHaveBeenCalledTimes(1);expect(element.querySelectorAll('p')[0]!.textContent).toMatch(/^1:/);
 expect(localStorage.getItem(PUBLIC_QUOTE_KEY)).toContain('zignaly');
 const before=element.textContent;await act(async()=>vi.advanceTimersByTime(30000));expect(element.textContent).not.toBe(before);expect(fetcher).toHaveBeenCalledTimes(1);
 await act(async()=>vi.advanceTimersByTime(36*60000));expect(fetcher).toHaveBeenCalledTimes(1);
 await act(async()=>root.unmount());expect(vi.getTimerCount()).toBe(0);
});
