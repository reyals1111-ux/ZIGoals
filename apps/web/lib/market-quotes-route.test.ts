import {afterEach,expect,it,vi} from 'vitest';
import {boundedQuoteText} from './market-quotes';
afterEach(()=>{vi.unstubAllGlobals();vi.resetModules();});
it('rejects arbitrary query inputs and never forwards cookies, auth or user data upstream',async()=>{
 const fetcher=vi.fn(async()=>Response.json({zignaly:{usd:0.043,last_updated_at:Math.floor(Date.now()/1000)}}));vi.stubGlobal('fetch',fetcher);
 const {GET}=await import('../app/api/market-quotes/route');
 expect((await GET(new Request('https://local/api/market-quotes?url=https://evil'))).status).toBe(400);expect(fetcher).not.toHaveBeenCalled();
 const response=await GET(new Request('https://local/api/market-quotes',{headers:{Cookie:'private',Authorization:'private'}}));expect(response.status).toBe(200);expect((await response.json()).quote.price).toBe('43');
 expect(fetcher.mock.calls[0]).toEqual(['https://api.coingecko.com/api/v3/simple/price?ids=zignaly&vs_currencies=usd&include_last_updated_at=true&precision=full',expect.objectContaining({method:'GET',credentials:'omit',redirect:'error',headers:{Accept:'application/json'}})]);
 await GET(new Request('https://local/api/market-quotes'));expect(fetcher).toHaveBeenCalledTimes(1);
});
it('fails closed on malformed public response and bounds streamed response size',async()=>{
 vi.stubGlobal('fetch',async()=>Response.json({zignaly:{usd:null}}));const {GET}=await import('../app/api/market-quotes/route');expect((await GET(new Request('https://local/api/market-quotes'))).status).toBe(502);
 await expect(boundedQuoteText(new Response('x'.repeat(8193)))).rejects.toThrow(/large/);
});
it('serves previously verified stale evidence during upstream failure without pretending it refreshed',async()=>{
 const initial=Date.parse('2026-09-18T12:00:00Z');const clock=vi.spyOn(Date,'now').mockReturnValue(initial);let fail=false;
 vi.stubGlobal('fetch',async()=>{if(fail)throw Error('secret upstream failure');return Response.json({zignaly:{usd:0.043,last_updated_at:initial/1000}});});
 try{const {GET}=await import('../app/api/market-quotes/route');const first=await (await GET(new Request('https://local/api/market-quotes'))).json();clock.mockReturnValue(initial+6*60000);fail=true;const response=await GET(new Request('https://local/api/market-quotes'));const body=await response.json();expect(response.status).toBe(200);expect(body.quote).toEqual(first.quote);expect(body.error).toContain('retained');expect(JSON.stringify(body)).not.toContain('secret');}finally{clock.mockRestore();}
});
