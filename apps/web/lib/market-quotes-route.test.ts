import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {boundedQuoteText} from './market-quotes';
beforeEach(()=>vi.stubEnv('COINGECKO_DEMO_API_KEY','fixture-key'));
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();vi.resetModules();});
it('rejects arbitrary query inputs and never forwards cookies, auth or user data upstream',async()=>{
 const fetcher=vi.fn(async()=>Response.json({zignaly:{usd:0.043,last_updated_at:Math.floor(Date.now()/1000)}}));vi.stubGlobal('fetch',fetcher);
 const {GET}=await import('../app/api/market-quotes/route');
 expect((await GET(new Request('https://local/api/market-quotes?url=https://evil'))).status).toBe(400);expect(fetcher).not.toHaveBeenCalled();
 const response=await GET(new Request('https://local/api/market-quotes',{headers:{Cookie:'private',Authorization:'private'}}));expect(response.status).toBe(200);expect((await response.json()).quote.price).toBe('43');
 expect(fetcher.mock.calls[0]).toEqual(['https://api.coingecko.com/api/v3/simple/price?ids=zignaly&vs_currencies=usd&include_last_updated_at=true&precision=full',expect.objectContaining({method:'GET',credentials:'omit',redirect:'manual',headers:{Accept:'application/json','x-cg-demo-api-key':'fixture-key'}})]);
 await GET(new Request('https://local/api/market-quotes'));expect(fetcher).toHaveBeenCalledTimes(1);
});
it('fails closed on malformed public response and bounds streamed response size',async()=>{
 vi.stubGlobal('fetch',async()=>Response.json({zignaly:{usd:null}}));const {GET}=await import('../app/api/market-quotes/route');expect((await GET(new Request('https://local/api/market-quotes'))).status).toBe(502);
 await expect(boundedQuoteText(new Response('x'.repeat(8193), {headers:{"Content-Type":"application/json"}}))).rejects.toThrow(/large/);
});
it('serves previously verified stale evidence during upstream failure without pretending it refreshed',async()=>{
 const initial=Date.parse('2026-09-18T12:00:00Z');const clock=vi.spyOn(Date,'now').mockReturnValue(initial);let fail=false;
 vi.stubGlobal('fetch',async()=>{if(fail)throw Error('secret upstream failure');return Response.json({zignaly:{usd:0.043,last_updated_at:initial/1000}});});
 try{const {GET}=await import('../app/api/market-quotes/route');const first=await (await GET(new Request('https://local/api/market-quotes'))).json();clock.mockReturnValue(initial+16*60000);fail=true;const response=await GET(new Request('https://local/api/market-quotes'));const body=await response.json();expect(response.status).toBe(200);expect(body.quote).toEqual(first.quote);expect(body.error).toContain('retained');expect(JSON.stringify(body)).not.toContain('secret');}finally{clock.mockRestore();}
});
it('strictly rejects private position payloads before any provider call',async()=>{
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);const {POST}=await import('../app/api/market-quotes/route');
 for(const body of [{requests:[{marketRef:{provider:'coingecko',kind:'coin',id:'bitcoin'},currency:'USD',quantity:'secret'}]},{requests:[{marketRef:{provider:'coingecko',kind:'coin',id:'bitcoin',wallet:'secret'},currency:'USD'}]},{requests:[],goalName:'private'}]){expect((await POST(new Request('https://local/api/market-quotes',{headers:{"Content-Type":"application/json"},method:'POST',body:JSON.stringify(body)}))).status).toBe(400);}expect(fetcher).not.toHaveBeenCalled();
});
it('returns unavailable with no key, without trying anonymous provider traffic',async()=>{
 vi.stubEnv('COINGECKO_DEMO_API_KEY','');const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);const {GET}=await import('../app/api/market-quotes/route');expect((await GET(new Request('https://local/api/market-quotes'))).status).toBe(502);expect(fetcher).not.toHaveBeenCalled();
});
it('batches selected coin identities and currencies without forwarding request credentials',async()=>{
 const fetcher=vi.fn(async()=>new Response(`{"bitcoin":{"usd":123.123456789123456789,"eur":100,"last_updated_at":${Math.floor(Date.now()/1000)}},"ethereum":{"usd":20,"eur":18,"last_updated_at":${Math.floor(Date.now()/1000)}}}`, {headers:{"Content-Type":"application/json"}}));vi.stubGlobal('fetch',fetcher);const {POST}=await import('../app/api/market-quotes/route');
 const requests=[['bitcoin','USD'],['bitcoin','EUR'],['ethereum','USD']].map(([id,currency])=>({marketRef:{provider:'coingecko',kind:'coin',id},currency}));
 const response=await POST(new Request('https://local/api/market-quotes',{method:'POST',headers:{"Content-Type":"application/json",Cookie:'private',Authorization:'private'},body:JSON.stringify({requests})}));expect(response.status).toBe(200);const body=await response.json();expect(body.quotes).toHaveLength(3);expect(body.quotes[0].price).toBe('123123456789123456789');expect(fetcher).toHaveBeenCalledTimes(1);expect(JSON.stringify(fetcher.mock.calls)).not.toContain('private');
});
it('serves valid recovered quotes with a degradation error when ZIG fallback fails',async()=>{
 vi.stubGlobal('fetch',async(input:RequestInfo|URL)=>{
  const url=new URL(String(input));return url.searchParams.get('ids')==='bitcoin'?Response.json({bitcoin:{usd:2,last_updated_at:Math.floor(Date.now()/1000)}}):new Response('private failure',{status:503});
 });
 const {POST}=await import('../app/api/market-quotes/route');
 const requests=['bitcoin','zignaly'].map(id=>({marketRef:{provider:'coingecko',kind:'coin',id},currency:'USD'}));
 const response=await POST(new Request('https://local/api/market-quotes',{method:'POST',headers:{'Content-Type':'application/json; charset=utf-8'},body:JSON.stringify({requests})}));
 const body=await response.json();expect(response.status).toBe(200);expect(body.quotes.map((q:{providerAssetId:string})=>q.providerAssetId)).toEqual(['bitcoin']);expect(body.error).toContain('retained');expect(JSON.stringify(body)).not.toContain('private failure');
});
