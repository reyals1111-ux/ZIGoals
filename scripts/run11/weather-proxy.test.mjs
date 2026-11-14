// The weather proxy (docs/run11/WEATHER_PROXY_ACTIVATION.md) against the real workers/weather-proxy/worker.mjs in
// Miniflare. MET Norway is a recorded compact answer (fixtures/weather/met-compact-brussels.json) served by the outbound
// stub, which records every request and refuses every other host. The fixture clock (ISOLATED_FIXTURE + LOCAL_TEST_NOW)
// moves by restarting Miniflare on the same persisted state, so the Workers Cache entries carry over; nothing waits for
// real time or reaches a network.
import {afterEach,expect,test} from 'vitest';
import {createRequire} from 'node:module';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {WEATHER_LIMITS} from '../../workers/weather-proxy/limits.mjs';
const require=createRequire(new URL('../../apps/web/node_modules/wrangler/package.json',import.meta.url));
const {build}=require('esbuild'),{Miniflare,convertV4MiniflareOptions}=require('miniflare');

const WORKER=new URL('../../workers/weather-proxy/worker.mjs',import.meta.url);
const APP='https://app.zigoals.test',UA='ZIGoals/alpha https://zigoals.app contact@zigoals.app',IP='198.51.100.7';
const MET=await readFile(new URL('./fixtures/weather/met-compact-brussels.json',import.meta.url),'utf8');
const MIN=60_000,T0=Date.UTC(2026,10,14,10,0,0),LAST_MODIFIED=new Date(T0-5*MIN).toUTCString();
const BRUSSELS='?lat=50.8466&lon=4.3517';
let bundled;
const bundle=async()=>(bundled??=(await build({entryPoints:[WORKER.pathname],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022'})).outputFiles[0].text);

/** MET's usual answer at the stub's clock: the recorded body, Expires 30 min later, a fixed Last-Modified. */
const fresh=(now,status=200,body=MET)=>new Response(body,{status,headers:{'content-type':'application/json','expires':new Date(now+30*MIN).toUTCString(),'last-modified':LAST_MODIFIED}});
const running=[];
afterEach(async()=>{for(const r of running.splice(0))await r.dispose();});

/** @param {{bindings?:Record<string,string>,omit?:string[]}} [options] */
async function weather({bindings={},omit=[]}={}){
 const persist=await mkdtemp(join(tmpdir(),'zigoals-weather-proxy-'));
 const calls=[],stub={now:T0,answer:(request,now)=>fresh(now)};
 const outboundService=async request=>{
  const url=new URL(request.url);
  if(url.origin!=='https://api.met.no')throw Error('Outbound fixture refused '+url.origin);
  calls.push({url,method:request.method,headers:Object.fromEntries(request.headers)});
  return stub.answer(request,stub.now);
 };
 let mf=null;
 const r={calls,stub,
  /** Starts (or restarts) the Worker at the fixture clock `now`, keeping the cache and storage. */
  async at(now){
   await mf?.dispose();stub.now=now;
   const vars={APP_ORIGIN:APP,MET_USER_AGENT:UA,ISOLATED_FIXTURE:'true',LOCAL_TEST_NOW:String(now),...bindings};for(const name of omit)delete vars[name];
   mf=new Miniflare({...convertV4MiniflareOptions({workers:[{name:'weather-proxy',modules:true,script:await bundle(),compatibilityDate:'2026-09-13',durableObjects:{WEATHER_LIMIT:{className:'WeatherLimit',useSQLite:true}},bindings:vars,outboundService}],durableObjectsPersist:persist}),resourcePersistencePath:persist});
   return r;
  },
  /** A null header value leaves that header out. @param {string} query @param {{method?:string,path?:string,headers?:Record<string,string|null>}} [options] */
  get:(query,{method='GET',path='/v1/forecast',headers={}}={})=>mf.dispatchFetch('https://weather.test'+path+query,{method,headers:Object.fromEntries(Object.entries({origin:APP,'cf-connecting-ip':IP,...headers}).filter(([,v])=>v!==null))}),
  dispose:async()=>{await mf?.dispose();mf=null;},
 };
 running.push(r);
 return r.at(T0);
}

test('both coordinates are rounded to 2 decimals first: two nearby points share one MET call, sent as 50.85,4.35',async()=>{
 const r=await weather();
 const first=await r.get(BRUSSELS);
 expect(first.status).toBe(200);expect(first.headers.get('x-weather-cache')).toBe('miss');
 expect(first.headers.get('content-type')).toBe('application/json');
 expect(first.headers.get('cache-control')).toBe('public, max-age=1800');
 expect(first.headers.get('access-control-allow-origin')).toBe(APP);
 // MET's JSON byte for byte, never rewritten.
 expect(await first.text()).toBe(MET);
 const second=await r.get('?lat=50.8549&lon=4.3451');
 expect(second.headers.get('x-weather-cache')).toBe('hit');expect(await second.text()).toBe(MET);
 expect(r.calls).toHaveLength(1);
 const [{url,method}]=r.calls;
 expect(method).toBe('GET');
 expect(url.origin+url.pathname).toBe('https://api.met.no/weatherapi/locationforecast/2.0/compact');
 expect([...url.searchParams]).toEqual([['lat','50.85'],['lon','4.35']]);
 // A point that rounds to zero is sent as 0, never -0; extra parameters are ignored.
 await (await r.get('?lat=-0.004&lon=-179.996&units=imperial&callback=x')).arrayBuffer();
 expect([...r.calls[1].url.searchParams]).toEqual([['lat','0'],['lon','-180']]);
},60000);

test('a kept answer is served until MET\'s Expires without another MET call',async()=>{
 const r=await weather();
 await (await r.get(BRUSSELS)).arrayBuffer();
 await r.at(T0+10*MIN);
 const hit=await r.get(BRUSSELS);
 expect(hit.status).toBe(200);expect(hit.headers.get('x-weather-cache')).toBe('hit');
 expect(hit.headers.get('cache-control')).toBe('public, max-age=1200');
 expect(await hit.text()).toBe(MET);
 expect(r.calls).toHaveLength(1);
},60000);

test('after Expires the answer is revalidated with If-Modified-Since; a 304 extends it with MET\'s new Expires',async()=>{
 const r=await weather();
 await (await r.get(BRUSSELS)).arrayBuffer();
 expect(r.calls[0].headers['if-modified-since']).toBeUndefined();
 r.stub.answer=(request,now)=>request.headers.get('if-modified-since')===LAST_MODIFIED?new Response(null,{status:304,headers:{expires:new Date(now+30*MIN).toUTCString(),'last-modified':LAST_MODIFIED}}):fresh(now);
 await r.at(T0+40*MIN);
 const revalidated=await r.get(BRUSSELS);
 expect(revalidated.status).toBe(200);expect(revalidated.headers.get('x-weather-cache')).toBe('revalidated');
 expect(revalidated.headers.get('cache-control')).toBe('public, max-age=1800');
 expect(await revalidated.text()).toBe(MET);
 expect(r.calls).toHaveLength(2);expect(r.calls[1].headers['if-modified-since']).toBe(LAST_MODIFIED);
 // The extended entry is served until the new Expires (T0 + 70 min) without a call.
 await r.at(T0+60*MIN);
 const hit=await r.get(BRUSSELS);
 expect(hit.headers.get('x-weather-cache')).toBe('hit');expect(hit.headers.get('cache-control')).toBe('public, max-age=600');
 expect(await hit.text()).toBe(MET);expect(r.calls).toHaveLength(2);
 // A changed forecast after that: MET answers 200 to the conditional request, and the new body replaces the old.
 const changed=MET.replace('"air_temperature": 8.1','"air_temperature": 7.9');
 r.stub.answer=(request,now)=>fresh(now,200,changed);
 await r.at(T0+75*MIN);
 const renewed=await r.get(BRUSSELS);
 expect(renewed.headers.get('x-weather-cache')).toBe('miss');expect(await renewed.text()).toBe(changed);
 expect(r.calls[2].headers['if-modified-since']).toBe(LAST_MODIFIED);
},60000);

test('MET\'s 203 (deprecation notice) passes through with its status, also from the cache',async()=>{
 const r=await weather();
 r.stub.answer=(request,now)=>fresh(now,203);
 const first=await r.get(BRUSSELS);
 expect(first.status).toBe(203);expect(first.headers.get('x-weather-upstream-status')).toBe('203');
 expect(first.headers.get('access-control-expose-headers')).toContain('x-weather-upstream-status');
 expect(await first.text()).toBe(MET);
 const hit=await r.get(BRUSSELS);
 expect(hit.status).toBe(203);expect(hit.headers.get('x-weather-upstream-status')).toBe('203');expect(hit.headers.get('x-weather-cache')).toBe('hit');
 await hit.arrayBuffer();expect(r.calls).toHaveLength(1);
},60000);

test.each([[429],[500],[503]])('MET %i becomes 503 UPSTREAM_UNAVAILABLE when nothing usable is kept',async status=>{
 const r=await weather();
 r.stub.answer=()=>new Response('busy',{status,headers:{'retry-after':'30'}});
 const res=await r.get(BRUSSELS);
 expect(res.status).toBe(503);expect(await res.json()).toEqual({error:'UPSTREAM_UNAVAILABLE'});
 expect(res.headers.get('cache-control')).toBe('no-store');expect(res.headers.get('x-weather-cache')).toBeNull();
 // Nothing was kept: the next request asks MET again.
 r.stub.answer=(request,now)=>fresh(now);
 const later=await r.get(BRUSSELS);expect(later.headers.get('x-weather-cache')).toBe('miss');await later.arrayBuffer();
 expect(r.calls).toHaveLength(2);
},60000);

test('while MET is unavailable, an answer less than 2 h past Expires is served marked stale; older is refused',async()=>{
 const r=await weather();
 await (await r.get(BRUSSELS)).arrayBuffer();
 r.stub.answer=()=>new Response('down',{status:502});
 await r.at(T0+30*MIN+WEATHER_LIMITS.staleMs-MIN);
 const stale=await r.get(BRUSSELS);
 expect(stale.status).toBe(200);expect(stale.headers.get('x-weather-stale')).toBe('1');expect(stale.headers.get('x-weather-cache')).toBe('stale');
 expect(stale.headers.get('cache-control')).toBe('public, max-age=0');expect(await stale.text()).toBe(MET);
 await r.at(T0+30*MIN+WEATHER_LIMITS.staleMs+MIN);
 const gone=await r.get(BRUSSELS);
 expect(gone.status).toBe(503);expect(await gone.json()).toEqual({error:'UPSTREAM_UNAVAILABLE'});
 expect(r.calls).toHaveLength(3);
},60000);

test('a MET call that does not answer in time, an oversized body and a body that is not JSON count as unavailable',async()=>{
 const r=await weather({bindings:{LOCAL_TIMEOUT_MS:'300'}});
 const hanging=[];
 r.stub.answer=()=>new Promise(resolve=>hanging.push(resolve));
 const slow=await r.get(BRUSSELS);
 expect(slow.status).toBe(503);expect(await slow.json()).toEqual({error:'UPSTREAM_UNAVAILABLE'});
 for(const resolve of hanging)resolve(new Response('late'));
 r.stub.answer=(request,now)=>fresh(now,200,'{"pad":"'+'x'.repeat(WEATHER_LIMITS.bodyBytes)+'"}');
 const big=await r.get(BRUSSELS);expect(big.status).toBe(503);await big.arrayBuffer();
 r.stub.answer=(request,now)=>fresh(now,200,'<html>maintenance</html>');
 const html=await r.get(BRUSSELS);expect(html.status).toBe(503);await html.arrayBuffer();
 r.stub.answer=()=>new Response(null,{status:302,headers:{location:'https://elsewhere.test/'}});
 const moved=await r.get(BRUSSELS);expect(moved.status).toBe(503);await moved.arrayBuffer();
 expect(r.calls).toHaveLength(4);
},60000);

test('only APP_ORIGIN gets CORS headers; another Origin is refused 403 before any MET call',async()=>{
 const r=await weather();
 for(const method of ['GET','OPTIONS']){
  const denied=await r.get(BRUSSELS,{method,headers:{origin:'https://evil.example'}});
  expect(denied.status).toBe(403);expect(await denied.json()).toEqual({error:'ORIGIN_DENIED'});
  expect(denied.headers.get('access-control-allow-origin')).toBeNull();
 }
 const preflight=await r.get(BRUSSELS,{method:'OPTIONS',headers:{'access-control-request-method':'GET'}});
 expect(preflight.status).toBe(204);
 expect(preflight.headers.get('access-control-allow-origin')).toBe(APP);
 expect(preflight.headers.get('access-control-allow-methods')).toBe('GET, OPTIONS');
 expect(r.calls).toHaveLength(0);
 // No Origin at all (curl, a server): served, without CORS headers.
 const plain=await r.get(BRUSSELS,{headers:{origin:null}});
 expect(plain.status).toBe(200);expect(plain.headers.get('access-control-allow-origin')).toBeNull();await plain.arrayBuffer();
 expect(r.calls).toHaveLength(1);
},60000);

test('missing, non-numeric or out-of-range coordinates are refused 400 without a MET call',async()=>{
 const r=await weather();
 for(const query of ['','?lat=50.85','?lon=4.35','?lat=abc&lon=4.35','?lat=50.85&lon=','?lat=91&lon=0','?lat=-90.01&lon=0','?lat=0&lon=180.5','?lat=0&lon=-181',
  '?lat=1e1&lon=0','?lat=+5&lon=0','?lat=0x10&lon=0','?lat=Infinity&lon=0','?lat=NaN&lon=0','?lat=%205&lon=0','?lat=5.&lon=0','?lat=1&lat=2&lon=0']){
  const res=await r.get(query);
  expect(res.status,query).toBe(400);expect(await res.json()).toEqual({error:'INVALID_COORDINATES'});
 }
 expect(r.calls).toHaveLength(0);
 // The edges are allowed.
 const edge=await r.get('?lat=-90&lon=180');expect(edge.status).toBe(200);await edge.arrayBuffer();
},60000);

test('any other path is 404 and any other method 405, without a MET call',async()=>{
 const r=await weather();
 for(const path of ['/','/v1/forecast/','/v1/forecasts','/v2/forecast','/__weather-cache/v1/50.85/4.35','/weatherapi/locationforecast/2.0/compact']){
  const res=await r.get(BRUSSELS,{path});expect(res.status,path).toBe(404);expect(await res.json()).toEqual({error:'NOT_FOUND'});
 }
 for(const method of ['POST','PUT','DELETE','PATCH']){
  const res=await r.get(BRUSSELS,{method});expect(res.status,method).toBe(405);
  expect(res.headers.get('allow')).toBe('GET, OPTIONS');expect(await res.json()).toEqual({error:'METHOD_NOT_ALLOWED'});
 }
 expect(r.calls).toHaveLength(0);
},60000);

test('MET receives only the point, this Worker\'s User-Agent and Accept: no client header, cookie or address',async()=>{
 const r=await weather();
 const client={cookie:'sb-access-token=secret-cookie','authorization':'Bearer client-token','user-agent':'Mozilla/5.0 (client browser)','accept-language':'nl-BE','referer':APP+'/app/today','x-forwarded-for':'203.0.113.9','x-real-ip':'203.0.113.9','cf-connecting-ip':'203.0.113.9','x-zigoals-device':'device-id'};
 const res=await r.get(BRUSSELS,{headers:client});expect(res.status).toBe(200);await res.arrayBuffer();
 expect(r.calls).toHaveLength(1);
 const seen=r.calls[0].headers;
 // Exactly these: the two this Worker sets, plus the two the runtime adds to every subrequest (host, and cf-worker naming
 // the Worker's own zone, as Cloudflare does in production). Nothing from the client.
 expect(seen).toEqual({'user-agent':UA,'accept':'application/json','host':'api.met.no','cf-worker':expect.any(String)});
 expect(seen['cf-worker']).not.toContain('203.0.113.9');
 const everything=JSON.stringify(r.calls[0]);
 for(const value of ['secret-cookie','client-token','client browser','nl-BE','203.0.113.9','device-id',APP])expect(everything).not.toContain(value);
},60000);

test('an empty or foreign MET_USER_AGENT and a missing APP_ORIGIN fail closed before any MET call',async()=>{
 for(const agent of ['','   ','Mozilla/5.0','ZIGoals/','ZIGoals/alpha\r\nX-Other: 1']){
  const r=await weather({bindings:{MET_USER_AGENT:agent}});
  const res=await r.get(BRUSSELS);expect(res.status,JSON.stringify(agent)).toBe(503);expect(await res.json()).toEqual({error:'PROVIDER_SETUP_REQUIRED'});
  expect(r.calls).toHaveLength(0);await r.dispose();
 }
 const none=await weather({omit:['MET_USER_AGENT']});
 expect((await none.get(BRUSSELS)).status).toBe(503);expect(none.calls).toHaveLength(0);
 for(const options of [{omit:['APP_ORIGIN']},{bindings:{APP_ORIGIN:'https://app.zigoals.test/path'}},{bindings:{APP_ORIGIN:'http://app.zigoals.test'}}]){
  const r=await weather(options);
  const res=await r.get(BRUSSELS);expect(res.status).toBe(503);expect(await res.json()).toEqual({error:'HOSTED_CONFIGURATION_REQUIRED'});
  expect(r.calls).toHaveLength(0);await r.dispose();
 }
},60000);

test('60 requests per minute per client address (IPv6 by /48); the next waits for the next minute',async()=>{
 const r=await weather();
 for(let i=0;i<WEATHER_LIMITS.perMinute;i++){const res=await r.get(BRUSSELS);expect(res.status,String(i)).toBe(200);await res.arrayBuffer();}
 const refused=await r.get(BRUSSELS);
 expect(refused.status).toBe(429);expect(await refused.json()).toEqual({error:'TRY_LATER',retryAfter:60});
 expect(refused.headers.get('retry-after')).toBe('60');
 // Another address has its own share; one MET call served everyone.
 const other=await r.get(BRUSSELS,{headers:{'cf-connecting-ip':'198.51.100.8'}});expect(other.status).toBe(200);await other.arrayBuffer();
 expect(r.calls).toHaveLength(1);
 // Two addresses in one IPv6 /48 share one count.
 for(let i=0;i<WEATHER_LIMITS.perMinute;i++){const res=await r.get(BRUSSELS,{headers:{'cf-connecting-ip':`2001:db8:42::${(i%2?'a':'b')}${i}`}});expect(res.status).toBe(200);await res.arrayBuffer();}
 expect((await r.get(BRUSSELS,{headers:{'cf-connecting-ip':'2001:0db8:0042:ffff::1'}})).status).toBe(429);
 expect((await r.get(BRUSSELS,{headers:{'cf-connecting-ip':'2001:db8:43::1'}})).status).toBe(200);
 // The next clock minute starts a fresh count.
 await r.at(T0+MIN);
 const next=await r.get(BRUSSELS);expect(next.status).toBe(200);await next.arrayBuffer();
},120000);

test('the Worker writes nothing to the console and never reads a client address except to count it',async()=>{
 const source=await readFile(WORKER,'utf8');
 expect(source).not.toMatch(/\bconsole\./);
 expect(source.match(/cf-connecting-ip/g)).toHaveLength(2);// the JSDoc note and the one read for the limiter
 expect(source).not.toMatch(/request\.headers\)|headers:request\.headers|new Request\(request/);
});
