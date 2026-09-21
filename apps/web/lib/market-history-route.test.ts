import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const request={marketRef:{provider:'coingecko',kind:'coin',id:'bitcoin'},currency:'USD',range:'90d'};
beforeEach(()=>vi.stubEnv('COINGECKO_DEMO_API_KEY','fixture-key'));
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();vi.restoreAllMocks();vi.resetModules();});
it('rejects private payloads, query overrides and excessive request bodies before any provider access',async()=>{
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);const {POST}=await import('../app/api/market-history/route');
 for(const body of [{request,quantity:'private'},{request:{...request,wallet:'private'}},{request:{...request,marketRef:{...request.marketRef,notes:'private'}}},{request:{...request,range:'max'}},{request,localPoints:[{at:'private'}]}])expect((await POST(new Request('https://local/api/market-history',{method:'POST',body:JSON.stringify(body)}))).status).toBe(400);
 expect((await POST(new Request('https://local/api/market-history?url=https://evil',{method:'POST',body:JSON.stringify({request})}))).status).toBe(400);
 expect((await POST(new Request('https://local/api/market-history',{method:'POST',body:'x'.repeat(8193)}))).status).toBe(400);expect(fetcher).not.toHaveBeenCalled();
});
it('returns a clean no-key fallback without anonymous provider requests or private request credentials',async()=>{
 vi.stubEnv('COINGECKO_DEMO_API_KEY','');const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);const {POST}=await import('../app/api/market-history/route');
 const result=await POST(new Request('https://local/api/market-history',{method:'POST',body:JSON.stringify({request}),headers:{Cookie:'private',Authorization:'private'}}));expect(result.status).toBe(503);expect((await result.json()).history).toBeNull();expect(fetcher).not.toHaveBeenCalled();
});
it('retains exact history on provider failure and admits only public headers upstream',async()=>{
 const now=Date.parse('2026-09-20T12:00:00Z');vi.spyOn(Date,'now').mockReturnValue(now);let fail=false;
 const fetcher=vi.fn(async()=>{if(fail)return new Response('private upstream details',{status:500});return new Response(`{"prices":[[${now-3600000},123.123456789123456789],[${now},124]],"market_caps":[],"total_volumes":[]}`);});vi.stubGlobal('fetch',fetcher);const {POST}=await import('../app/api/market-history/route');
 const incoming=()=>new Request('https://local/api/market-history',{method:'POST',headers:{Cookie:'private',Authorization:'private'},body:JSON.stringify({request})});const first=await (await POST(incoming())).json();expect(first.history.points[0].value).toBe('123123456789123456789');expect(JSON.stringify(fetcher.mock.calls)).not.toContain('private');
 vi.spyOn(Date,'now').mockReturnValue(now+900001);fail=true;const response=await POST(incoming());expect(response.status).toBe(200);const body=await response.json();expect(body.history).toEqual(first.history);expect(body.stale).toBe(true);expect(body.error).toMatch(/retained/);expect(JSON.stringify(body)).not.toContain('upstream details');expect(response.headers.get('Cache-Control')).toBe('no-store');
});
it('never attempts paid RWA history and provides an explicit local fallback',async()=>{
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);const {POST}=await import('../app/api/market-history/route');const response=await POST(new Request('https://local/api/market-history',{method:'POST',body:JSON.stringify({request:{...request,marketRef:{provider:'coingecko',kind:'rwa',id:'gold',assetType:'commodity'}}})}));expect(response.status).toBe(503);expect((await response.json()).error).toMatch(/local/);expect(fetcher).not.toHaveBeenCalled();
});
