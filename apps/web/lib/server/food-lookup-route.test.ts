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

// Session AJ (item 22): ?q=&lang= searches the Swiss food database through the Worker's /search, with the same client rule.
const result={id:'900001',name:'Fixture apple, fresh',basis:'per-100g',nutrients:{kcal:52,proteinMg:300,carbsMg:11400,fatMg:200,fiberMg:null,sugarMg:null,saltMg:0},source:'Swiss Food Composition Database',datasetVersion:'V 7.1',attribution:'Source: Swiss Food Composition Database V 7.1, Federal Food Safety and Veterinary Office FSVO (naehrwertdaten.ch)',link:'https://naehrwertdaten.ch/en/'};
const find=(query:string,headers:Record<string,string>={})=>GET(new Request('https://alpha.test/api/food-lookup?'+query,{headers}));

test('a search sends only the normalised words and language, and the client group from cf-connecting-ip',async()=>{
 const seen=bound(()=>Response.json({results:[result]}));
 const response=await find('q=+Fixture++APPLE+&lang=de',{'cf-connecting-ip':'192.0.2.7','x-food-client':'v4:203.0.113.1',cookie:'session=private'});
 expect(response.status).toBe(200);expect(await response.json()).toEqual({results:[result]});
 expect(seen.map(r=>r.url)).toEqual(['https://food.internal/search?q=fixture+apple&lang=de']);
 expect([...seen[0]!.headers]).toEqual([['x-food-client','v4:192.0.2.7']]);
 await find('q=pear');expect(seen.at(-1)!.url).toBe('https://food.internal/search?q=pear&lang=en');
});

test('a bad search is refused before the Worker; a bad answer or a Worker error is never shown',async()=>{
 const seen=bound(()=>Response.json({results:[{...result,attribution:'none'}]}));
 for(const query of ['q=a','q=%3Cb%3E','q=apple&lang=nl','q=apple&code=12345678','q=apple&q=pear','q=apple&extra=1'])expect(await (await find(query)).json(),query).toEqual({error:'INVALID_QUERY'});
 expect(seen).toHaveLength(0);
 expect(await (await find('q=apple')).json()).toEqual({error:'PROVIDER_UNAVAILABLE'});
 bound(()=>Response.json({error:'PROVIDER_UNAVAILABLE'},{status:502}));const failed=await find('q=apple');expect(failed.status).toBe(502);expect(await failed.json()).toEqual({error:'PROVIDER_UNAVAILABLE'});
 bound(()=>Response.json({error:'PROVIDER_SETUP_REQUIRED'},{status:503}));expect((await find('q=apple')).status).toBe(503);
 bound(()=>Response.json({error:'PROVIDER_THROTTLED',retryAfter:42},{status:429}));const wait=await find('q=apple');expect(wait.status).toBe(429);expect(wait.headers.get('retry-after')).toBe('42');expect(await wait.json()).toEqual({error:'TRY_LATER',retryAfter:42});
});
