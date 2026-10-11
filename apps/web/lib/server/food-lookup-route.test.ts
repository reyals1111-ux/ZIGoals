import {test,expect,vi,afterEach} from 'vitest';
import {getCloudflareContext} from '@opennextjs/cloudflare';
import {GET} from '../../app/api/food-lookup/route';
vi.mock('@opennextjs/cloudflare',()=>({getCloudflareContext:vi.fn()}));
afterEach(()=>{vi.restoreAllMocks();});
// Session S Part 3 (FIX_PLAN C3): the food route names the client only from Cloudflare's cf-connecting-ip, never from a
// header the caller sent, and keeps the Worker's wait on a 429.
function bound(answer:(request:Request)=>Response){
 const seen:Request[]=[];
 vi.mocked(getCloudflareContext).mockResolvedValue({env:{FOOD_LOOKUP:{fetch:async(request:Request)=>{seen.push(request);return answer(request);}}}} as never);
 return seen;
}
const call=(headers:Record<string,string>)=>GET(new Request('https://alpha.test/api/food-lookup?code=12345678',{headers}));

test('the client header comes only from cf-connecting-ip; a caller-supplied one is never forwarded',async()=>{
 const seen=bound(()=>Response.json({error:'NOT_FOUND'},{status:404}));
 expect((await call({'cf-connecting-ip':'192.0.2.7','x-food-client':'v4:203.0.113.1'})).status).toBe(404);
 expect((await call({'x-food-client':'v4:203.0.113.1'})).status).toBe(404);
 expect((await call({'cf-connecting-ip':'2001:db8:1234:5678::1'})).status).toBe(404);
 expect(seen.map(r=>r.headers.get('x-food-client'))).toEqual(['v4:192.0.2.7',null,'v6:2001:0db8:1234::/48']);
 for(const request of seen)expect([...request.headers.keys()].filter(k=>k!=='x-food-client')).toEqual([]);
});

test('a 429 keeps the Worker\'s wait as retryAfter and Retry-After',async()=>{
 bound(()=>Response.json({error:'TRY_LATER',retryAfter:21},{status:429}));
 const response=await call({'cf-connecting-ip':'192.0.2.7'});
 expect(response.status).toBe(429);expect(response.headers.get('retry-after')).toBe('21');expect(await response.json()).toEqual({error:'TRY_LATER',retryAfter:21});
 bound(()=>Response.json({error:'TRY_LATER',retryAfter:'soon'},{status:429}));
 const odd=await call({});expect(await odd.json()).toEqual({error:'TRY_LATER',retryAfter:60});expect(odd.headers.get('retry-after')).toBe('60');
});
