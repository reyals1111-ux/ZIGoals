import {beforeEach as configureMarketDevelopment} from 'vitest';
configureMarketDevelopment(()=>{vi.stubEnv('NODE_ENV','development');vi.stubEnv('ZIGOALS_MARKET_LOCAL_MODE','direct');});
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {boundedQuoteText} from './market-quotes';
beforeEach(()=>vi.stubEnv('COINGECKO_DEMO_API_KEY','fixture-key'));
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();vi.restoreAllMocks();vi.resetModules();});
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
 vi.stubEnv('COINGECKO_DEMO_API_KEY','');const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);const {GET,POST}=await import('../app/api/market-quotes/route');
 const get=await GET(new Request('https://local/api/market-quotes'));expect(get.status).toBe(503);expect((await get.json()).error).toContain('not configured');
 const post=await POST(new Request('https://local/api/market-quotes',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({requests:[{marketRef:{provider:'coingecko',kind:'coin',id:'bitcoin'},currency:'USD'}]})}));expect(post.status).toBe(503);expect((await post.json()).error).toContain('not configured');expect(fetcher).not.toHaveBeenCalled();
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

it('preserves partial evidence through provider, server cache, route, transport and browser cache after unrelated success',async()=>{
 const now=Date.parse('2026-09-22T10:00:00Z');vi.spyOn(Date,'now').mockReturnValue(now);
 const requests=['bitcoin','zignaly'].map(id=>({marketRef:{provider:'coingecko' as const,kind:'coin' as const,id},currency:'USD' as const}));
 const upstream=vi.fn(async(input:RequestInfo|URL)=>{
  const id=new URL(String(input)).searchParams.get('ids');
  return id==='bitcoin'||id==='ethereum'?Response.json({[id]:{usd:1.234567891234567,last_updated_at:now/1000}}):new Response('private failure',{status:503});
 });vi.stubGlobal('fetch',upstream);
 const {POST}=await import('../app/api/market-quotes/route');
 const {serverMarketCache}=await import('./server/market-service');
 const {fetchPublicMarketQuotes}=await import('./market-quote-client');
 const {createMarketQuoteCache}=await import('./market-quote-cache');
 const send=(rows:typeof requests)=>POST(new Request('https://local/api/market-quotes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requests:rows})}));
 const initial=await (await send(requests)).json();expect(initial.quotes.map((q:{providerAssetId:string})=>q.providerAssetId)).toEqual(['bitcoin']);expect(initial.error).toBeTruthy();expect(upstream).toHaveBeenCalledTimes(3);
 const ethereum=await (await send([{...requests[0]!,marketRef:{provider:'coingecko',kind:'coin',id:'ethereum'}}])).json();expect(ethereum.error).toBeNull();expect(serverMarketCache.getSnapshot().error).toBeNull();expect(upstream).toHaveBeenCalledTimes(4);
 let returned: {quotes:unknown[];error:string|null}|undefined;
 const transport:typeof fetch=async(input,init)=>{const response=await POST(new Request(new URL(String(input),'https://local'),init));expect(response.status).toBe(200);returned=await response.clone().json();return response;};
 const browser=createMarketQuoteCache((rows,force)=>fetchPublicMarketQuotes(rows,force,transport),()=>now);
 await browser.refresh(requests);
 expect(browser.getSnapshot().quotes).toEqual(initial.quotes);expect(browser.getSnapshot().error).toBeTruthy();expect(returned?.error).toBeTruthy();expect(returned?.quotes).toEqual(initial.quotes);expect(upstream).toHaveBeenCalledTimes(4);
 expect(browser.getSnapshot().quotes[0]).toMatchObject({price:'1234567891234567',priceDecimals:15,observedAt:new Date(now).toISOString(),fetchedAt:new Date(now).toISOString(),providerAssetId:'bitcoin',source:'CoinGecko'});
});
it('does not let unrelated failure or duplicate requests degrade complete fresh coverage',async()=>{
 vi.stubGlobal('fetch',async(input:RequestInfo|URL)=>new URL(String(input)).searchParams.get('ids')==='bitcoin'?Response.json({bitcoin:{usd:2,last_updated_at:Math.floor(Date.now()/1000)}}):new Response('',{status:503}));
 const {POST}=await import('../app/api/market-quotes/route');
 const request=(id:string)=>({marketRef:{provider:'coingecko',kind:'coin',id},currency:'USD'});
 const send=(ids:string[])=>POST(new Request('https://local/api/market-quotes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requests:ids.map(request)})}));
 await send(['bitcoin']);expect((await (await send(['ethereum'])).json()).error).toBeTruthy();
 const result=await (await send(['bitcoin','bitcoin'])).json();expect(result.quotes).toHaveLength(1);expect(result.error).toBeNull();
});
it('keeps stale coverage degraded without changing its evidence timestamps',async()=>{
 const now=Date.parse('2026-09-22T10:00:00Z');vi.spyOn(Date,'now').mockReturnValue(now);
 vi.stubGlobal('fetch',async()=>Response.json({bitcoin:{usd:2,last_updated_at:(now-900001)/1000|0}}));
 const {POST}=await import('../app/api/market-quotes/route');
 const response=await POST(new Request('https://local/api/market-quotes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requests:[{marketRef:{provider:'coingecko',kind:'coin',id:'bitcoin'},currency:'USD'}]})}));
 const body=await response.json();expect(response.status).toBe(200);expect(body.error).toBeTruthy();expect(body.quotes[0].observedAt).toBe('2026-09-22T09:44:59.000Z');
});
it('keeps browser fail-closed rejection of an ambiguous partial response',async()=>{
 const {fetchPublicMarketQuotes}=await import('./market-quote-client');const {createMarketQuoteCache}=await import('./market-quote-cache');
 const {parseCoinQuotes}=await import('./market-quotes');const now=Date.now();
 const requests=['bitcoin','zignaly'].map(id=>({marketRef:{provider:'coingecko' as const,kind:'coin' as const,id},currency:'USD' as const}));
 const quotes=parseCoinQuotes(JSON.stringify({bitcoin:{usd:2,last_updated_at:Math.floor(now/1000)}}),requests.slice(0,1),now);
 const browser=createMarketQuoteCache(rows=>fetchPublicMarketQuotes(rows,false,async()=>Response.json({quotes,error:null})),()=>now);
 await browser.refresh(requests);expect(browser.getSnapshot().quotes).toEqual([]);expect(browser.getSnapshot().error).toBeTruthy();
});
it('does not count cached RWA evidence under a conflicting requested asset type',async()=>{
 const upstream=vi.fn(async()=>Response.json([{id:'gold',asset_type:'commodity',tokenized_market_data:{current_price:2}}]));vi.stubGlobal('fetch',upstream);
 const {POST}=await import('../app/api/market-quotes/route');
 const send=(assetType:string)=>POST(new Request('https://local/api/market-quotes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requests:[{marketRef:{provider:'coingecko',kind:'rwa',id:'gold',assetType},currency:'USD'}]})}));
 expect((await send('commodity')).status).toBe(200);const response=await send('stock'),body=await response.json();expect(response.status).toBe(503);expect(body.quotes).toEqual([]);expect(body.error).toBeTruthy();expect(upstream).toHaveBeenCalledTimes(1);
});
