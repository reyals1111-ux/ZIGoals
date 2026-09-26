import {beforeEach as configureMarketDevelopment} from 'vitest';
configureMarketDevelopment(()=>{vi.stubEnv('NODE_ENV','development');vi.stubEnv('ZIGOALS_MARKET_LOCAL_MODE','direct');});
import {afterEach,expect,it,vi} from 'vitest';
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();vi.restoreAllMocks();vi.resetModules();});
const request={marketRef:{provider:'coingecko',kind:'coin',id:'bitcoin'},currency:'USD'};
it('public insights reject private fields, oversized lists and query URLs before upstream access',async()=>{
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);const {POST}=await import('../app/api/market-insights/route');
 for(const body of [{requests:[request],quantity:'private'},{requests:[{...request,notes:'private'}]},{requests:[{...request,marketRef:{...request.marketRef,wallet:'private'}}]},{requests:Array(501).fill(request)}])expect((await POST(new Request('https://local/api/market-insights',{headers:{"Content-Type":"application/json"},method:'POST',body:JSON.stringify(body)}))).status).toBe(400);
 expect((await POST(new Request('https://local/api/market-insights?url=https://evil',{headers:{"Content-Type":"application/json"},method:'POST',body:JSON.stringify({requests:[request]})}))).status).toBe(400);expect(fetcher).not.toHaveBeenCalled();
});
it('missing key returns a truthful per-identity unavailable result with no anonymous upstream calls',async()=>{
 vi.stubEnv('COINGECKO_DEMO_API_KEY','');const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);const {POST}=await import('../app/api/market-insights/route');const result=await POST(new Request('https://local/api/market-insights',{headers:{"Content-Type":"application/json"},method:'POST',body:JSON.stringify({requests:[request]})}));expect(result.status).toBe(503);const body=await result.json();expect(body.results['coingecko:coin:bitcoin:USD']).toMatchObject({insight:null,stale:true,error:expect.stringMatching(/unavailable/)});expect(fetcher).not.toHaveBeenCalled();
});
it('shares server evidence while excluding incoming cookies and preserving stale results on failure',async()=>{
 let time=Date.parse('2026-09-20T22:00:00Z'),fail=false;vi.spyOn(Date,'now').mockImplementation(()=>time);vi.stubEnv('COINGECKO_DEMO_API_KEY','fixture-key');const fetcher=vi.fn(async()=>new Response(fail?'private detail':'[{"id":"bitcoin","last_updated":"2026-09-20T22:00:00Z","price_change_percentage_24h":1.123456789123456789}]',{headers:{"Content-Type":"application/json"},status:fail?429:200}));vi.stubGlobal('fetch',fetcher);const {POST}=await import('../app/api/market-insights/route');
 const incoming=()=>new Request('https://local/api/market-insights',{method:'POST',headers:{"Content-Type":"application/json",Cookie:'private',Authorization:'private'},body:JSON.stringify({requests:[request]})});const first=await (await POST(incoming())).json();expect(first.entries[0].change24h).toBe('1.123456789123456789');time+=900001;fail=true;const response=await POST(incoming());const body=await response.json();expect(response.status).toBe(200);expect(body.entries).toEqual(first.entries);expect(body.results['coingecko:coin:bitcoin:USD'].stale).toBe(true);expect(body.error).toMatch(/retained/);expect(JSON.stringify(fetcher.mock.calls)).not.toContain('private');expect(JSON.stringify(body)).not.toContain('private');
});
it('never reuses cached RWA evidence under a conflicting asset type',async()=>{
 vi.stubEnv('COINGECKO_DEMO_API_KEY','fixture-key');vi.stubGlobal('fetch',async()=>Response.json([{id:'gold',asset_type:'commodity'}]));const {POST}=await import('../app/api/market-insights/route');
 const incoming=(assetType:string)=>new Request('https://local/api/market-insights',{headers:{"Content-Type":"application/json"},method:'POST',body:JSON.stringify({requests:[{marketRef:{provider:'coingecko',kind:'rwa',id:'gold',assetType},currency:'USD'}]})});
 expect((await POST(incoming('commodity'))).status).toBe(200);const response=await POST(incoming('stock'));const body=await response.json();expect(body.entries).toEqual([]);expect(body.results['coingecko:rwa:gold:USD'].insight).toBeNull();expect(response.status).toBe(503);
});
