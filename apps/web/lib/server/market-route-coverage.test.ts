import {test,expect,vi,afterEach} from 'vitest';
import {getCloudflareContext} from '@opennextjs/cloudflare';
import * as quotes from '../../app/api/market-quotes/route';
import * as cancel from '../../app/api/market-quotes/cancel/route';
import * as assets from '../../app/api/market-assets/route';
import * as history from '../../app/api/market-history/route';
import * as insights from '../../app/api/market-insights/route';
import * as status from '../../app/api/market-status/route';
vi.mock('@opennextjs/cloudflare',()=>({getCloudflareContext:vi.fn()}));
afterEach(()=>{vi.unstubAllEnvs();vi.restoreAllMocks();});
// Session S Part 8 (public Alpha): every public market route that reaches the shared coordinator names the client only from
// Cloudflare's cf-connecting-ip, so R1's per-client limits and daily row budget apply to all of them; a caller-supplied
// x-market-client is never forwarded. Oversized batches are refused before any account command. The logo proxy never
// reaches the coordinator (its own cache and limits, market-logo.ts).
const btc={marketRef:{provider:'coingecko',kind:'coin',id:'bitcoin'},currency:'USD'};
// Session U Part 2e: each request also carries the app's own caller label (x-market-caller), from its bindings: the
// acceptance app has PRIVATE_SYNC ("friends"), the public Alpha does not ("public"). A caller-supplied label is never
// forwarded either.
function bound(friends=false){
 const seen:{path:string;client:string|null;caller:string|null}[]=[];
 vi.stubEnv('NODE_ENV','production');
 vi.mocked(getCloudflareContext).mockResolvedValue({env:{ZIGOALS_MARKET_QUOTES_MODE:'durable-v1',...(friends?{PRIVATE_SYNC:{fetch:async()=>new Response(null,{status:404})}}:{}),MARKET_QUOTES:{fetch:async(request:Request)=>{seen.push({path:new URL(request.url).pathname,client:request.headers.get('x-market-client'),caller:request.headers.get('x-market-caller')});await request.text();return Response.json({error:'MARKET_SETUP_REQUIRED'},{status:503});}}}} as never);
 return seen;
}
const headers={'content-type':'application/json','cf-connecting-ip':'198.51.100.23','x-market-client':'v4:203.0.113.1','x-market-caller':'friends'};
const post=(path:string,body:unknown)=>new Request('https://alpha.test'+path,{method:'POST',headers,body:JSON.stringify(body)});
const routes:[string,()=>Promise<Response>][]=[
 ['GET /api/market-quotes',()=>quotes.GET(new Request('https://alpha.test/api/market-quotes',{headers}))],
 ['POST /api/market-quotes',()=>quotes.POST(post('/api/market-quotes',{requests:[btc]}))],
 ['POST /api/market-quotes/cancel',()=>cancel.POST(post('/api/market-quotes/cancel',{cancelToken:crypto.randomUUID()}))],
 ['GET /api/market-assets',()=>assets.GET(new Request('https://alpha.test/api/market-assets',{headers}))],
 ['POST /api/market-history',()=>history.POST(post('/api/market-history',{request:{...btc,range:'7d'}}))],
 ['POST /api/market-insights',()=>insights.POST(post('/api/market-insights',{requests:[btc]}))],
 ['GET /api/market-status',()=>status.GET(new Request('https://alpha.test/api/market-status',{headers}))],
];
test.each(routes)('%s sends the edge client group, never the caller\'s header',async(_label,call)=>{
 const seen=bound();const response=await call();await response.text();
 expect(seen.length).toBeGreaterThan(0);
 for(const request of seen)expect(request.client).toBe('v4:198.51.100.23');
 // The public Alpha labels itself public even when its caller claims to be the acceptance app.
 for(const request of seen)expect(request.caller).toBe('public');
});
test.each(routes)('%s from the acceptance app (PRIVATE_SYNC bound) is labelled friends',async(_label,call)=>{
 const seen=bound(true);const response=await call();await response.text();
 expect(seen.length).toBeGreaterThan(0);
 for(const request of seen)expect(request.caller).toBe('friends');
});
test('65 insight pairs never reach the coordinator; 65 quote pairs reach it once, where the cap refuses them',async()=>{
 const seen=bound(),many=Array.from({length:65},(_,i)=>({marketRef:{provider:'coingecko',kind:'coin',id:`coin-${i}`},currency:'USD'}));
 const insight=await insights.POST(post('/api/market-insights',{requests:many}));expect(insight.status).toBe(400);await insight.text();
 expect(seen).toEqual([]);
 // The quote cap is enforced in QuoteService before any account command (durable-quote-dispatch.ts; R1's
 // market-request-cost.test.ts, 65 pairs). The app sends the batch once, with the client, and never fans it out.
 const quote=await quotes.POST(post('/api/market-quotes',{requests:many}));expect(quote.status).toBe(503);await quote.text();
 expect(seen).toEqual([{path:'/quotes',client:'v4:198.51.100.23',caller:'public'}]);
});
