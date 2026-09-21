import {expect,it,vi} from 'vitest';
import {createMarketHistoryCache,parseCoinHistory,historyRequestSchema,availableHistoryRanges,historyPointsForRange,formatHistoryValue,fetchPublicMarketHistory,type MarketHistoryRequest} from './market-history';
import {createCoinGeckoProvider} from './server/coingecko';
const now=Date.parse('2026-09-20T12:00:00Z');
const request:MarketHistoryRequest={marketRef:{provider:'coingecko',kind:'coin',id:'bitcoin'},currency:'USD',range:'90d'};
const sample=`{"prices":[[${now-3600000},9007199254740993.123456789],[${now},1.25e-8]],"market_caps":[],"total_volumes":[]}`;
it('preserves exact historical price lexemes and original observation timestamps',()=>{
 const history=parseCoinHistory(sample,request,now);
 expect(history.points).toEqual([{at:'2026-09-20T11:00:00.000Z',value:'9007199254740993123456789',decimals:9},{at:'2026-09-20T12:00:00.000Z',value:'125',decimals:10}]);
 expect(history).toMatchObject({currency:'USD',source:'CoinGecko',fetchedAt:'2026-09-20T12:00:00.000Z'});
 expect(formatHistoryValue(history.points[0]!)).toBe('9007199254740993.123456789');
});
it('rejects ambiguous, nonnumeric, unordered, future, out-of-window or excessive history',()=>{
 for(const text of ['{"prices":[],"prices":[]}',`{"prices":[[${now},"1"]]}`,`{"prices":[[${now},-1]]}`,`{"prices":[[${now},0]]}`,`{"prices":[[${now},1e999]]}`,`{"prices":[[${now+60001},2]]}`,`{"prices":[[${now},1],[${now-1},2]]}`,`{"prices":[[${now},1],[${now},2]]}`,`{"prices":[[${now-92*86400000},1]]}`,JSON.stringify({prices:Array.from({length:2501},(_,i)=>[now-2501+i,1])})])expect(()=>parseCoinHistory(text,request,now)).toThrow();
});
it('rejects arbitrary URLs, unsupported ranges and private fields at the public contract',()=>{
 for(const input of [{...request,range:'max'},{...request,range:'5y'},{...request,quantity:'private'},{...request,wallet:'private'},{...request,marketRef:{...request.marketRef,id:'../../private'}},{...request,marketRef:{...request.marketRef,goalName:'private'}}])expect(historyRequestSchema.safeParse(input).success).toBe(false);
});
it('offers only ranges with two or more observed points and actual coverage',()=>{
 const points=[{at:'2026-09-18T12:00:00Z',value:'10',decimals:0},{at:'2026-09-19T12:00:00Z',value:'20',decimals:0},{at:'2026-09-20T12:00:00Z',value:'30',decimals:0}];
 expect(availableHistoryRanges([])).toEqual([]);expect(availableHistoryRanges(points.slice(-1))).toEqual([]);
 expect(availableHistoryRanges(points)).toEqual(['1d','all']);expect(historyPointsForRange(points,'1d')).toEqual(points.slice(1));
 expect(()=>formatHistoryValue({at:points[0]!.at,value:'Infinity',decimals:0})).toThrow();
});
it('requires a server key, suppresses provider details and never requests RWA history',async()=>{
 const fetcher=vi.fn(async()=>new Response('SECRET_PROVIDER_DETAIL',{status:429}));
 await expect(createCoinGeckoProvider({key:()=>undefined,fetcher,clock:()=>now}).history(request)).rejects.toThrow(/unavailable/);expect(fetcher).not.toHaveBeenCalled();
 await expect(createCoinGeckoProvider({key:()=> 'fixture-key',fetcher,clock:()=>now}).history({...request,marketRef:{provider:'coingecko',kind:'rwa',id:'gold',assetType:'commodity'}})).rejects.toThrow(/local/i);expect(fetcher).not.toHaveBeenCalled();
 await expect(createCoinGeckoProvider({key:()=> 'fixture-key',fetcher,clock:()=>now}).history(request)).rejects.toThrow('CoinGecko market data unavailable.');
 const [url,init]=fetcher.mock.calls[0]! as unknown as [string,RequestInit];expect(url).toBe('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=90&precision=full');
 expect(init).toMatchObject({credentials:'omit',redirect:'manual',referrerPolicy:'no-referrer',headers:{Accept:'application/json','x-cg-demo-api-key':'fixture-key'}});expect(init.body).toBeUndefined();
});
it('shares quote and history admission instead of multiplying the provider quota',async()=>{
 let calls=0;const fetcher:typeof fetch=async()=>{calls++;return new Response(sample);};const provider=createCoinGeckoProvider({key:()=> 'fixture-key',fetcher,clock:()=>now});
 for(let i=0;i<11;i++)await provider.quotes([{marketRef:{...request.marketRef,id:`asset-${i}`},currency:'USD'}]).catch(()=>undefined);
 await provider.history(request);await expect(provider.history({...request,currency:'EUR'})).rejects.toThrow(/unavailable/);expect(calls).toBe(12);
});
it('coalesces concurrent history, gates manual retries and retains last good observations on failure',async()=>{
 let time=now,fail=false;const loader=vi.fn(async()=>{if(fail)throw Error('private upstream failure');return parseCoinHistory(sample,request,time);});const cache=createMarketHistoryCache(loader,()=>time);
 const [a,b]=await Promise.all([cache.load(request),cache.load(request)]);expect(a.history).toEqual(b.history);expect(loader).toHaveBeenCalledTimes(1);await cache.load(request,true);expect(loader).toHaveBeenCalledTimes(1);
 time+=60001;await cache.load(request,true);expect(loader).toHaveBeenCalledTimes(2);time+=900001;fail=true;const last=await cache.load(request);expect(last.history).toEqual(a.history?{...a.history,fetchedAt:new Date(now+60001).toISOString()}:null);expect(last.stale).toBe(true);expect(last.error).toMatch(/retained/);expect(JSON.stringify(last)).not.toContain('private');
 await cache.load(request,true);expect(loader).toHaveBeenCalledTimes(3);
});
it('bounds cached identities and rejects identity mismatches from loaders',async()=>{
 const loader=vi.fn(async(r:MarketHistoryRequest)=>parseCoinHistory(sample,r,now));const cache=createMarketHistoryCache(loader,()=>now);
 for(let i=0;i<25;i++)await cache.load({...request,marketRef:{...request.marketRef,id:`asset-${i}`}});
 await cache.load({...request,marketRef:{...request.marketRef,id:'asset-0'}});expect(loader).toHaveBeenCalledTimes(26);
 const wrong=createMarketHistoryCache(async()=>parseCoinHistory(sample,{...request,currency:'EUR'},now),()=>now);expect((await wrong.load(request)).history).toBeNull();
});
it('sends only public identity, currency and range; never local evidence to app transport',async()=>{
 const fetcher=vi.fn(async()=>Response.json({history:parseCoinHistory(sample,request,now),error:null,stale:false,nextAttemptAt:now+60000}));const result=await fetchPublicMarketHistory(request,false,fetcher,now);
 expect(result.history?.points).toHaveLength(2);const [url,init]=fetcher.mock.calls[0]! as unknown as [string,RequestInit];expect(url).toBe('/api/market-history');expect(JSON.parse(String(init.body))).toEqual({request,refresh:false});expect(init.credentials).toBe('omit');
 await expect(fetchPublicMarketHistory({...request,localPoints:[{at:'private'}]} as MarketHistoryRequest,false,fetcher,now)).rejects.toThrow();
});

it('uses Workers-compatible manual redirects and never follows a provider redirect with its key',async()=>{
 const calls:string[]=[];const edgeFetch:typeof fetch=async(url,init)=>{
  if(init?.redirect==='error')throw new TypeError('Workers does not implement redirect:error');
  expect(init?.redirect).toBe('manual');calls.push(String(url));return new Response(sample);
 };
 await expect(createCoinGeckoProvider({key:()=> 'fixture-key',fetcher:edgeFetch,clock:()=>now}).history(request)).resolves.toMatchObject({source:'CoinGecko'});
 expect(calls).toHaveLength(1);
 let redirects=0;const redirectFetch:typeof fetch=async(_url,init)=>{expect(init?.redirect).toBe('manual');redirects++;return new Response(null,{status:302,headers:{Location:'https://untrusted.invalid/collect'}});};
 await expect(createCoinGeckoProvider({key:()=> 'fixture-key',fetcher:redirectFetch,clock:()=>now}).history(request)).rejects.toThrow('CoinGecko market data unavailable.');
 expect(redirects).toBe(1);
});
