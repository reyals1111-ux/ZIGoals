import {afterEach,expect,it,vi} from 'vitest';
import {isJsonMediaType} from './json-media-type';
import {createCoinGeckoProvider} from './server/coingecko';
afterEach(()=>{vi.unstubAllGlobals();vi.resetModules();});
it.each(['application/json','Application/JSON; charset=utf-8','application/problem+json; charset=UTF-8'])('accepts JSON media %s',value=>expect(isJsonMediaType(value)).toBe(true));
it.each([null,'text/plain','text/html','application/jsonp','application/json, text/html'])('rejects unsupported media %s',value=>expect(isJsonMediaType(value)).toBe(false));
it('rejects all market POST non-JSON media before provider work',async()=>{
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 const routes=await Promise.all([import('../app/api/market-quotes/route'),import('../app/api/market-insights/route'),import('../app/api/market-history/route')]);
 for(const {POST} of routes)for(const contentType of ['text/plain','text/html','application/x-www-form-urlencoded']){
 const response=await POST(new Request('https://local/api/market',{method:'POST',headers:{'Content-Type':contentType},body:'{}'}));expect(response.status).toBe(415);expect(response.headers.get('Cache-Control')).toBe('no-store');
 }expect(fetcher).not.toHaveBeenCalled();
});
it('validates provider JSON media without rejecting harmless charset',async()=>{
 const request={marketRef:{provider:'coingecko' as const,kind:'coin' as const,id:'bitcoin'},currency:'USD' as const},now=Date.parse('2026-09-20T12:00:00Z');
 for(const media of ['text/html','application/json; charset=utf-8']){
 const p=createCoinGeckoProvider({key:()=> 'fixture',clock:()=>now,fetcher:async()=>new Response('{"bitcoin":{"usd":1,"last_updated_at":'+now/1000+'}}',{headers:{'Content-Type':media}})});
 const result=await p.quoteResults([request]);expect(result.results[0]?.status).toBe(media==='text/html'?'PROVIDER_MALFORMED':'VERIFIED_FRESH');
 }
});
