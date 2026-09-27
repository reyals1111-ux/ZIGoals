import {test,expect,vi,afterEach} from 'vitest';
import {configuredDurableQuotes} from './durable-quote-route';
import {marketPairEnvelope} from './market-pair-result';
import {parseCoinQuotes} from '../market-quotes';
import {fetchPublicMarketQuotes} from '../market-quote-client';
import {parseMarketPairWire} from '../market-pair-wire';
import {getCloudflareContext} from '@opennextjs/cloudflare';
vi.mock('@opennextjs/cloudflare',()=>({getCloudflareContext:vi.fn(()=>({env:{}}))}));
const pairs=['bitcoin','zignaly'].map(id=>({marketRef:{provider:'coingecko' as const,kind:'coin' as const,id},currency:'USD' as const}));
afterEach(()=>{vi.unstubAllEnvs();vi.restoreAllMocks();});
test('explicit mode requires configured service; cannot fall back after binding failure',async()=>{
 expect(await configuredDurableQuotes(pairs,async()=>({}))).toMatchObject({version:1,quotes:[],degraded:true});
 for(const env of [{ZIGOALS_MARKET_QUOTES_MODE:'durable-v1'},{ZIGOALS_MARKET_QUOTES_MODE:'unknown'},{ZIGOALS_MARKET_QUOTES_MODE:'durable-v1',MARKET_QUOTES:{fetch:async()=>{throw Error('binding missing');}}}])expect(await configuredDurableQuotes(pairs,async()=>env)).toMatchObject({version:1,quotes:[],degraded:true});
});
test('binding receives only canonical public work; versioned partial outcomes survive client transport',async()=>{
 const now=Date.now(),quote=parseCoinQuotes('{"bitcoin":{"usd":1.23456789123456789,"last_updated_at":'+Math.floor(now/1000)+'}}',[pairs[0]!],now)[0]!;
 const expected=marketPairEnvelope(pairs,[quote],[{request:pairs[1]!,category:'UPSTREAM_5XX'}],now);
 const binding=vi.fn(async(request:Request)=>{expect([...request.headers.keys()]).toEqual(['content-type']);expect(await request.json()).toEqual({version:1,requests:pairs});return Response.json(expected);});
 const result=await configuredDurableQuotes(pairs,async()=>({ZIGOALS_MARKET_QUOTES_MODE:'durable-v1',MARKET_QUOTES:{fetch:binding}}));
 expect(result).toMatchObject({version:1,quotes:[quote],degraded:true});
 const loaded=await fetchPublicMarketQuotes(pairs,false,async()=>Response.json(result));expect(loaded.quotes).toEqual([quote]);expect(loaded.results).toEqual(expected.results);
 for(const invalid of [{...expected,version:2},{...expected,results:expected.results.slice(0,1)},{...expected,complete:true},{...expected,results:[expected.results[0],expected.results[0]]},{...expected,rawError:'secret'}]){const rejected=await fetchPublicMarketQuotes(pairs,false,async()=>Response.json(invalid));expect(rejected.quotes).toEqual([]);expect(rejected.error).toBeTruthy();}
});
test('actual app route uses enabled binding and never its process-local provider fallback',async()=>{
 const env={ZIGOALS_MARKET_QUOTES_MODE:'durable-v1',MARKET_QUOTES:{fetch:vi.fn(async()=>Response.json(marketPairEnvelope(pairs,[],pairs.map(request=>({request,category:'LOCAL_QUEUE' as const})),Date.now())))}};
 vi.mocked(getCloudflareContext).mockReturnValue({env} as never);
 const upstream=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('Live provider forbidden'));
 const {POST}=await import('../../app/api/market-quotes/route');
 const request=(body:unknown)=>new Request('https://app/api/market-quotes',{method:'POST',headers:{'content-type':'application/json',cookie:'private'},body:JSON.stringify(body)});
 const result=await POST(request({requests:pairs}));expect(result.status).toBe(503);expect(await result.json()).toMatchObject({version:1,results:expect.any(Array)});expect(env.MARKET_QUOTES.fetch).toHaveBeenCalledTimes(1);expect(upstream).not.toHaveBeenCalled();
 expect((await POST(request({requests:pairs,account:'private'}))).status).toBe(400);expect(env.MARKET_QUOTES.fetch).toHaveBeenCalledTimes(1);
 vi.mocked(getCloudflareContext).mockReturnValue({env:{ZIGOALS_MARKET_QUOTES_MODE:'durable-v1'}} as never);expect((await POST(request({requests:pairs}))).status).toBe(503);expect(upstream).not.toHaveBeenCalled();
});
test('pair error precedence is deterministic and unexpected failure identities reject',()=>{
 const failures=[{request:pairs[0]!,category:'UNKNOWN' as const},{request:pairs[0]!,category:'THROTTLED' as const}];
 expect(marketPairEnvelope([pairs[0]!],[],failures,Date.now())).toEqual(marketPairEnvelope([pairs[0]!],[],[...failures].reverse(),Date.now()));
 expect(()=>marketPairEnvelope([pairs[0]!],[],[{request:pairs[1]!,category:'THROTTLED'}],Date.now())).toThrow();
});
test('wire consumption ages previously fresh evidence without changing observation time',()=>{
 const now=Date.now(),quote=parseCoinQuotes('{"bitcoin":{"usd":1,"last_updated_at":'+Math.floor(now/1000)+'}}',[pairs[0]!],now)[0]!;
 const original=marketPairEnvelope([pairs[0]!],[quote],[],now),later=parseMarketPairWire(original,[pairs[0]!],now+900001);
 expect(later.results[0]?.status).toBe('VERIFIED_STALE');expect(later.degraded).toBe(true);expect(later.error).toBeTruthy();expect(later.quotes[0]?.observedAt).toBe(quote.observedAt);expect(original.results[0]?.status).toBe('VERIFIED_FRESH');
});
