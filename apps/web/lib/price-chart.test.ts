// @vitest-environment jsdom
import {act,createElement} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {PriceChart} from '../components/platform/price-chart';
(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
const coin={provider:'coingecko',kind:'coin',id:'bitcoin'} as const;
const rwa={provider:'coingecko',kind:'rwa',id:'gold',assetType:'commodity'} as const;
it('shows single RWA observation with exact value, explicit provenance and no selectable ranges or provider call',async()=>{
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);const element=document.createElement('div'),root=createRoot(element);
 await act(async()=>root.render(createElement(PriceChart,{marketRef:rwa,currency:'USD',localPoints:[{at:'2026-09-19T12:00:00Z',value:'123456789123456789',decimals:9}]})));
 expect(element.textContent).toContain('Tracking starts here');expect(element.textContent).toContain('CoinGecko tokenized RWA reference');expect(element.querySelector('tbody')?.textContent).toContain('123456789.123456789');expect(element.querySelector('[aria-label="Chart range"]')).toBeNull();expect(fetcher).not.toHaveBeenCalled();await act(async()=>root.unmount());
});
it('falls back to saved local prices after failure without inventing a line, earlier price or performance',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json({error:'unavailable'},{status:503})));const element=document.createElement('div'),root=createRoot(element);
 await act(async()=>root.render(createElement(PriceChart,{marketRef:{...coin,id:'unavailable-coin'},currency:'EUR',localPoints:[{at:'2026-09-19T12:00:00Z',value:'25',decimals:2}]})));
 expect(element.textContent).toContain('Saved local price observations');expect(element.textContent).toContain('Earlier performance is not assumed');expect(element.querySelectorAll('circle[data-observation]')).toHaveLength(1);expect(element.querySelector('polyline')).toBeNull();expect(element.querySelector('tbody')?.textContent).toContain('0.25');expect(element.textContent).not.toContain('%');await act(async()=>root.unmount());
});
it('ranges only use supported returned points; aging and range changes never poll; exact table changes with the range',async()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-20T12:00:00Z'));
 const ref={...coin,id:'chart-ranges'};const points=Array.from({length:10},(_,i)=>({at:new Date(Date.now()-(9-i)*86400000).toISOString(),value:String(100+i),decimals:2}));
 const fetcher=vi.fn(async()=>Response.json({history:{marketRef:ref,currency:'USD',range:'90d',source:'CoinGecko',fetchedAt:new Date().toISOString(),points},error:null,stale:false,nextAttemptAt:Date.now()+60000}));vi.stubGlobal('fetch',fetcher);
 const element=document.createElement('div'),root=createRoot(element);await act(async()=>root.render(createElement(PriceChart,{marketRef:ref,currency:'USD'})));
 expect(element.querySelector('tbody')?.querySelectorAll('tr')).toHaveLength(10);const buttons=Array.from(element.querySelectorAll('button'));expect(buttons.map(b=>b.textContent)).toContain('7D');expect(buttons.map(b=>b.textContent)).not.toContain('30D');expect(buttons.map(b=>b.textContent)).not.toContain('1Y');
 await act(async()=>buttons.find(b=>b.textContent==='7D')!.click());expect(element.querySelector('tbody')?.querySelectorAll('tr')).toHaveLength(8);expect(fetcher).toHaveBeenCalledTimes(1);
 await act(async()=>vi.advanceTimersByTime(16*60000));expect(element.textContent).toContain('Saved market history');expect(fetcher).toHaveBeenCalledTimes(1);await act(async()=>root.unmount());expect(vi.getTimerCount()).toBe(0);
});
it('shows an honest empty state and does not carry a prior asset chart into another identity',async()=>{
 let resolve:(value:Response)=>void=()=>undefined;
 vi.stubGlobal('fetch',vi.fn(()=>new Promise<Response>(r=>{resolve=r;})));
 const element=document.createElement('div'),root=createRoot(element);await act(async()=>root.render(createElement(PriceChart,{marketRef:{...coin,id:'pending-one'},currency:'USD'})));
 await act(async()=>root.render(createElement(PriceChart,{marketRef:rwa,currency:'EUR'})));
 expect(element.textContent).toContain('Your price history starts here');expect(element.querySelector('tbody')).toBeNull();
 await act(async()=>resolve(Response.json({error:'unavailable'},{status:503})));expect(element.textContent).toContain('CoinGecko tokenized RWA reference');expect(element.querySelector('tbody')).toBeNull();await act(async()=>root.unmount());
});
it('keeps the new asset visible after a late refresh and allows refreshing the original asset when revisited',async()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-20T12:00:00Z'));
 let finishRefresh:(value:Response)=>void=()=>undefined,firstCalls=0;
 const firstRef={...coin,id:'race-first'},secondRef={...coin,id:'race-second'};
 const response=(ref:typeof firstRef,value:string)=>Response.json({history:{marketRef:ref,currency:'USD',range:'90d',source:'CoinGecko',fetchedAt:new Date().toISOString(),points:[{at:new Date().toISOString(),value,decimals:2}]},error:null,stale:false,nextAttemptAt:Date.now()+60000});
 vi.stubGlobal('fetch',vi.fn(async(_url,init)=>{const body=JSON.parse(String(init?.body));if(body.request.marketRef.id==='race-first'){firstCalls++;if(firstCalls>1)return new Promise<Response>(resolve=>{finishRefresh=resolve;});return response(firstRef,'100');}return response(secondRef,'200');}));
 const element=document.createElement('div'),root=createRoot(element);await act(async()=>root.render(createElement(PriceChart,{marketRef:firstRef,currency:'USD'})));
 await act(async()=>vi.advanceTimersByTime(90000));await act(async()=>Array.from(element.querySelectorAll('button')).find(b=>b.textContent==='Refresh chart')!.click());
 await act(async()=>root.render(createElement(PriceChart,{marketRef:secondRef,currency:'USD'})));expect(element.querySelector('tbody')?.textContent).toContain('2.00');
 await act(async()=>finishRefresh(response(firstRef,'150')));expect(element.querySelector('tbody')?.textContent).toContain('2.00');
 await act(async()=>root.render(createElement(PriceChart,{marketRef:firstRef,currency:'USD'})));expect(element.querySelector('tbody')?.textContent).toContain('1.50');
 const refreshButton=element.querySelector<HTMLButtonElement>('.price-chart-refresh')!;
 expect(refreshButton.textContent).not.toBe('Loading…');expect(refreshButton.disabled).toBe(true);
 await act(async()=>vi.advanceTimersByTime(90000));expect(refreshButton.disabled).toBe(false);
 await act(async()=>refreshButton.click());expect(refreshButton.disabled).toBe(true);expect(refreshButton.textContent).toBe('Loading…');
 await act(async()=>finishRefresh(response(firstRef,'175')));expect(element.querySelector('tbody')?.textContent).toContain('1.75');expect(refreshButton.textContent).not.toBe('Loading…');
 await act(async()=>root.unmount());
});
