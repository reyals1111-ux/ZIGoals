import {afterEach,expect,it,vi} from 'vitest';
import {beginPendingWork,ownPendingWork,waitForPendingWork,createRequestAdmission} from './pending-work';
import {createMarketQuoteCache} from './market-quote-cache';
import {createMarketInsightsCache} from './market-insights-cache';
import {createMarketHistoryCache,HISTORY_UNAVAILABLE,type MarketHistory} from './market-history';
const ref={provider:'coingecko',kind:'coin',id:'bitcoin'} as const,request={marketRef:ref,currency:'USD'} as const;
afterEach(()=>vi.useRealTimers());
it('server wait owns a bounded timer, never adopts the creator promise, and returns before the15second client deadline',async()=>{
 vi.useFakeTimers();const work=beginPendingWork();void ownPendingWork(work,new Promise(()=>{}));expect(work).not.toHaveProperty('promise');const follower=waitForPendingWork(work);await vi.advanceTimersByTimeAsync(10000);expect(await follower).toBe(false);
});
it('expired owner permits recover without a late release freeing a newer owner',async()=>{
 vi.useFakeTimers();const admission=createRequestAdmission(2,11000),old=await admission.acquire();await admission.acquire();const queued=admission.acquire();await vi.advanceTimersByTimeAsync(11000);const current=await queued;await admission.acquire();admission.release(old);let granted=false;const blocked=admission.acquire().then(token=>{granted=true;return token;});await vi.advanceTimersByTimeAsync(25);expect(granted).toBe(false);admission.release(current);await vi.advanceTimersByTimeAsync(25);expect(granted).toBe(true);admission.release(await blocked);
});
it('quote and insight caches recover abandoned work after expiry and ignore a late old rejection',async()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-21T00:00:00Z'));
 for(const kind of ['quotes','insights']){
  let rejectOld:(reason:Error)=>void=()=>{},calls=0;
  const loader=async()=>{if(++calls===1)return await new Promise<never>((_resolve,reject)=>{rejectOld=reject;});const at=new Date().toISOString();return kind==='quotes'?{quotes:[{...request,base:{network:'coingecko-coin',denom:'bitcoin',decimals:0},price:'100',priceDecimals:0,source:'CoinGecko',providerAssetId:'bitcoin',observedAt:at,fetchedAt:at,verification:'VERIFIED'}],error:null}:{entries:[{...request,source:'CoinGecko',marketBasis:'coin',logoUrl:null,change24h:null,observedAt:null,fetchedAt:at,sparkline:null}],error:null};};
  // Loader shape is chosen with its matching cache; public validation is exercised normally.
  const cache=kind==='quotes'?createMarketQuoteCache(loader as Parameters<typeof createMarketQuoteCache>[0]):createMarketInsightsCache(loader as Parameters<typeof createMarketInsightsCache>[0]);
  const old=cache.refresh([request]);vi.setSystemTime(Date.now()+60001);await cache.refresh([request]);const good=JSON.stringify(cache.getSnapshot());rejectOld(Error('old request ended'));await old;expect(JSON.stringify(cache.getSnapshot())).toBe(good);expect(cache.getSnapshot().error).toBeNull();expect(calls).toBe(2);
 }
});
it('history replies honestly within10seconds for an abandoned creator and retries with fresh time after lease expiry',async()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-21T00:00:00Z'));let rejectOld:(reason:Error)=>void=()=>{},calls=0;
 const chart={...request,range:'90d'} as const;const cache=createMarketHistoryCache(async()=>{if(++calls===1)return await new Promise<MarketHistory>((_resolve,reject)=>{rejectOld=reject;});return {...chart,source:'CoinGecko',fetchedAt:new Date().toISOString(),points:[{at:new Date(Date.now()-1000).toISOString(),value:'2',decimals:0}]};});
 const old=cache.load(chart);const follower=cache.load(chart);await vi.advanceTimersByTimeAsync(10000);expect(await follower).toMatchObject({history:null,error:HISTORY_UNAVAILABLE});vi.setSystemTime(Date.now()+50001);const recovered=await cache.load(chart);expect(recovered.history?.points[0]?.value).toBe('2');expect(calls).toBe(2);rejectOld(Error('old request ended'));await old;expect(await cache.load(chart)).toEqual(recovered);
});
it('catalog waits for both request-owned legs to settle before returning a failure',async()=>{
 const {createCoinGeckoProvider}=await import('./server/coingecko');let release:()=>void=()=>{},finished=false;
 const provider=createCoinGeckoProvider({key:()=> 'fixture',fetcher:async url=>{if(String(url).includes('/coins/list'))throw Error('failed coin leg');await new Promise<void>(resolve=>{release=resolve;});return Response.json([]);}});
 const result=provider.catalog().then(value=>{finished=true;return value;});await new Promise(resolve=>setTimeout(resolve,0));expect(finished).toBe(false);release();expect((await result).error).toContain('retained');
});
it.each(['quotes','insights'])('late %s completion is degraded, never apparent success',async kind=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-22T00:00:00Z'));
 let finish:(value:never)=>void=()=>{};
 const loader=()=>new Promise<never>(resolve=>{finish=resolve;});
 const cache=kind==='quotes'?createMarketQuoteCache(loader):createMarketInsightsCache(loader);
 const running=cache.refresh([request]);vi.setSystemTime(Date.now()+60000);
 const at=new Date().toISOString();
 const payload=kind==='quotes'?{quotes:[{...request,base:{network:'coingecko-coin',denom:'bitcoin',decimals:0},price:'100',priceDecimals:0,source:'CoinGecko',providerAssetId:'bitcoin',observedAt:at,fetchedAt:at,verification:'VERIFIED'}],error:null}:{entries:[{...request,source:'CoinGecko',marketBasis:'coin',logoUrl:null,change24h:null,observedAt:null,fetchedAt:at,sparkline:null}],error:null};
 finish(payload as never);await running;expect(cache.getSnapshot().error).toBeTruthy();
});
it('late history refresh preserves earlier evidence but reports degradation',async()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-22T00:00:00Z'));
 const chart={...request,range:'7d'} as const;let calls=0,finish:(h:MarketHistory)=>void=()=>{};
 const good:MarketHistory={...chart,source:'CoinGecko',fetchedAt:new Date().toISOString(),points:[{at:new Date(Date.now()-1000).toISOString(),value:'2',decimals:0}]};
 const cache=createMarketHistoryCache(async()=>++calls===1?good:await new Promise<MarketHistory>(resolve=>{finish=resolve;}));
 await cache.load(chart);vi.setSystemTime(Date.now()+60000);const running=cache.load(chart,true);
 vi.setSystemTime(Date.now()+60000);finish({...good,fetchedAt:new Date().toISOString()});
 expect(await running).toMatchObject({history:good,error:expect.any(String)});
});
it('late catalog refresh retains prior catalog and reports degradation',async()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-22T00:00:00Z'));
 const {createCoinGeckoProvider}=await import('./server/coingecko');let late=false;const releases:Array<()=>void>=[];
 const p=createCoinGeckoProvider({key:()=> 'fixture',fetcher:async url=>{if(late)await new Promise<void>(resolve=>releases.push(resolve));return Response.json(String(url).includes('coins/list')?[{id:'bitcoin',name:'Bitcoin',symbol:'btc'}]:[]);}});
 const first=await p.catalog();expect(first.error).toBeNull();late=true;vi.setSystemTime(Date.now()+86400000);
 const running=p.catalog();await vi.advanceTimersByTimeAsync(0);vi.setSystemTime(Date.now()+60000);for(const release of releases)release();
 expect(await running).toMatchObject({assets:first.assets,error:expect.any(String)});
});
