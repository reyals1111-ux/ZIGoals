import {test,expect,vi,afterEach,beforeEach} from 'vitest';
import {getCloudflareContext} from '@opennextjs/cloudflare';
vi.mock('@opennextjs/cloudflare',()=>({getCloudflareContext:vi.fn()}));
// Session U Part 2d: GET /api/market-status reports when the coordinator's MARKET_POLICY period ends, for the deploy
// summary and the owner's verifier. Every answer other than a well-formed /status is "not reported" (null).
beforeEach(()=>{vi.resetModules();vi.stubEnv('NODE_ENV','production');});
afterEach(()=>{vi.unstubAllEnvs();vi.restoreAllMocks();vi.useRealTimers();});
const end='2026-10-31T16:00:00.000Z';
function coordinator(answer:()=>Response){
 const calls:{path:string;method:string;client:string|null;body:string}[]=[];
 vi.mocked(getCloudflareContext).mockResolvedValue({env:{ZIGOALS_MARKET_QUOTES_MODE:'durable-v1',MARKET_QUOTES:{fetch:async(request:Request)=>{calls.push({path:new URL(request.url).pathname,method:request.method,client:request.headers.get('x-market-client'),body:await request.text()});return answer();}}}} as never);
 return calls;
}
async function get(url='https://alpha.test/api/market-status'){
 const {GET}=await import('../../app/api/market-status/route');
 const response=await GET(new Request(url,{headers:{'cf-connecting-ip':'198.51.100.23','x-market-client':'v4:203.0.113.1'}}));
 return {status:response.status,cache:response.headers.get('cache-control'),body:await response.json()};
}

test('a reported end is relayed as is, with the edge client group, and kept in the isolate for 10 minutes',async()=>{
 vi.useFakeTimers({now:Date.UTC(2026,9,5,12),toFake:['Date']});
 const calls=coordinator(()=>Response.json({version:1,policyWindowEnd:end}));
 expect(await get()).toEqual({status:200,cache:'no-store',body:{version:1,policyWindowEnd:end,nextPolicyWindowEnd:null}});
 expect(calls).toEqual([{path:'/status',method:'POST',client:'v4:198.51.100.23',body:'{"version":1}'}]);
 vi.setSystemTime(Date.UTC(2026,9,5,12,9));
 expect((await get()).body).toEqual({version:1,policyWindowEnd:end,nextPolicyWindowEnd:null});expect(calls).toHaveLength(1);
 vi.setSystemTime(Date.UTC(2026,9,5,12,10,1));
 expect((await get()).body).toEqual({version:1,policyWindowEnd:end,nextPolicyWindowEnd:null});expect(calls).toHaveLength(2);
});

test('follow-up F2: a next window installed in advance is relayed too, and the cache never outlives the current end',async()=>{
 const next='2026-11-30T16:00:00.000Z';
 vi.useFakeTimers({now:Date.parse(end)-5*60000,toFake:['Date']});
 const calls=coordinator(()=>Response.json(Date.now()<Date.parse(end)?{version:1,policyWindowEnd:end,nextPolicyWindowEnd:next}:{version:1,policyWindowEnd:next,nextPolicyWindowEnd:null}));
 expect((await get()).body).toEqual({version:1,policyWindowEnd:end,nextPolicyWindowEnd:next});
 vi.setSystemTime(Date.parse(end)-60000);
 expect((await get()).body).toEqual({version:1,policyWindowEnd:end,nextPolicyWindowEnd:next});expect(calls).toHaveLength(1);
 // At the boundary the next window serves: asked again, not 10 minutes later.
 vi.setSystemTime(Date.parse(end));
 expect((await get()).body).toEqual({version:1,policyWindowEnd:next,nextPolicyWindowEnd:null});expect(calls).toHaveLength(2);
});

test.each([
 ['an older coordinator (404)',()=>new Response(null,{status:404})],
 ['the setup gate (503)',()=>Response.json({error:'MARKET_SETUP_REQUIRED'},{status:503})],
 ['a policy without an end',()=>Response.json({version:1,policyWindowEnd:null})],
 ['an extra field',()=>Response.json({version:1,policyWindowEnd:end,usage:5})],
 ['a next end that is not ISO',()=>Response.json({version:1,policyWindowEnd:end,nextPolicyWindowEnd:'30 Nov 2026'})],
 ['another version',()=>Response.json({version:2,policyWindowEnd:end})],
 ['a date that is not ISO',()=>Response.json({version:1,policyWindowEnd:'31 Oct 2026'})],
 ['not JSON',()=>new Response('nope',{headers:{'content-type':'application/json'}})],
 ['an oversized answer',()=>Response.json({version:1,policyWindowEnd:end,pad:'x'.repeat(2000)})],
])('%s is "not reported", and never cached',async(_label,answer)=>{
 const calls=coordinator(answer);
 expect(await get()).toEqual({status:200,cache:'no-store',body:{version:1,policyWindowEnd:null,nextPolicyWindowEnd:null}});
 await get();expect(calls).toHaveLength(2);
});

test('no binding, a query string, or a throwing binding never reaches a coordinator answer',async()=>{
 vi.mocked(getCloudflareContext).mockResolvedValue({env:{}} as never);
 expect((await get()).body).toEqual({version:1,policyWindowEnd:null,nextPolicyWindowEnd:null});
 const calls=coordinator(()=>Response.json({version:1,policyWindowEnd:end}));
 expect(await get('https://alpha.test/api/market-status?detail=1')).toEqual({status:400,cache:'no-store',body:{error:'Unsupported public market query.'}});
 expect(calls).toEqual([]);
 vi.mocked(getCloudflareContext).mockResolvedValue({env:{ZIGOALS_MARKET_QUOTES_MODE:'durable-v1',MARKET_QUOTES:{fetch:async()=>{throw Error('binding down');}}}} as never);
 expect((await get()).body).toEqual({version:1,policyWindowEnd:null,nextPolicyWindowEnd:null});
});
