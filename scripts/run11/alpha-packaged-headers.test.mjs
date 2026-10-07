import {test,expect,beforeAll} from 'vitest';
import {createRequire} from 'node:module';
import {readFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {hermeticWorkerOptions} from './hermetic-wrangler.mjs';
import {connectSources,permissionsPolicyFor,staticMissHeaders} from '../../apps/web/lib/csp-compose.mjs';
const require=createRequire(new URL('../../apps/web/node_modules/wrangler/package.json',import.meta.url));
const {Miniflare,convertV4MiniflareOptions}=require('miniflare'),{unstable_getMiniflareWorkerOptions}=require('wrangler');
const root=new URL('../../',import.meta.url).pathname;
// Session T (ADR-012): the effective headers of the generated public-Alpha artifact (build:alpha, then the dry run of
// wrangler.alpha.jsonc with --outdir), served by the real Worker in Miniflare: the Permissions-Policy per route (the
// microphone on every app page, the camera only on Health; Next applies the last matching header entry) and the one
// connect-src the app's data file names. Requires the generated build; never deploys or reaches a network.
//   pnpm --filter @zigoals/web build:alpha
//   pnpm --filter @zigoals/web exec wrangler deploy --config wrangler.alpha.jsonc --dry-run --outdir /tmp/zigoals-alpha-dry
//   ALPHA_PACKAGED=1 pnpm exec vitest run scripts/run11/alpha-packaged-headers.test.mjs
const enabled=process.env.ALPHA_PACKAGED==='1';
let script,app,egress;
beforeAll(async()=>{
 egress=JSON.parse(await readFile(resolve(root,'apps/web/lib/egress-policy.json'),'utf8'));
 if(!enabled)return;
 script=await readFile(process.env.ALPHA_PACKAGE_BUNDLE??'/tmp/zigoals-alpha-dry/worker.js','utf8');
 app=hermeticWorkerOptions(unstable_getMiniflareWorkerOptions,resolve(root,'apps/web/wrangler.alpha.jsonc')).workerOptions;
},60000);
// Every outbound request is refused, unless a test passes its own fixture for one (Session X Part 4: a logo image).
async function alpha(outbound=request=>{throw Error('Outbound fixture refused '+new URL(request.url).host);}){
 const mf=new Miniflare(convertV4MiniflareOptions({workers:[
  {name:'zigoals-alpha',modules:true,script,compatibilityDate:app.compatibilityDate,compatibilityFlags:app.compatibilityFlags,assets:app.assets,bindings:app.bindings,serviceBindings:{WORKER_SELF_REFERENCE:{name:'zigoals-alpha'}},outboundService:outbound},
 ]}));
 return mf;
}
test.runIf(enabled)('the packaged Alpha answers every app route with the reviewed Permissions-Policy and connect-src',async()=>{
 const mf=await alpha();
 try{
  for(const [path,expected] of ['/app','/app/habits','/app/health','/app/settings'].map(path=>[path,permissionsPolicyFor(egress,path)])){
   const response=await mf.dispatchFetch(`https://alpha.zigoals.app${path}`,{headers:{'cf-connecting-ip':'192.0.2.44'}});
   expect(response.status,path).toBe(200);
   expect(response.headers.get('permissions-policy'),path).toBe(expected);
   const connect=(response.headers.get('content-security-policy')??'').split(';').map(s=>s.trim()).find(s=>s.startsWith('connect-src '));
   expect(connect,path).toBe(`connect-src ${connectSources(egress,'app').join(' ')}`);
  }
  // The root redirects to /app; the global policy is asserted on the root's own response, not on the page it leads to.
  const root_=await mf.dispatchFetch('https://alpha.zigoals.app/',{headers:{'cf-connecting-ip':'192.0.2.44'},redirect:'manual'});
  expect([200,307,308]).toContain(root_.status);
  expect(root_.headers.get('permissions-policy')).toBe(permissionsPolicyFor(egress,'/'));
 }finally{await mf.dispose();}
},60000);
test('the data file names exactly the reviewed values (runs without the artifact)',()=>{
 expect(egress.permissionsPolicy).toEqual({global:'camera=(), microphone=(), geolocation=(), bluetooth=()',app:'camera=(), microphone=(self), geolocation=(), bluetooth=()',health:'camera=(self), microphone=(self), geolocation=(), bluetooth=(self)'});
 expect(egress.localModelSources).toEqual(['http://localhost:*','http://127.0.0.1:*']);
 expect(Object.keys(egress.aiProviderOrigins)).toEqual(['openai','anthropic','gemini','xai','openrouter']);
});
// Session W Part 1d: the packaged Alpha names its exact build on every app route, the commit build-alpha recorded.
test.runIf(enabled)('the packaged Alpha names its exact source commit on every app route (X-ZIGoals-Build)',async()=>{
 const {commit}=JSON.parse(await readFile(resolve(root,'apps/web/.open-next/alpha-build.json'),'utf8'));
 expect(commit).toMatch(/^[a-f0-9]{40}$/);
 const mf=await alpha();
 try{
  for(const path of ['/app','/app/health','/app/settings','/app/markets']){
   const response=await mf.dispatchFetch(`https://alpha.zigoals.app${path}`,{headers:{'cf-connecting-ip':'192.0.2.44'}});
   expect(response.status,path).toBe(200);
   expect(response.headers.get('x-zigoals-build'),path).toBe(commit);
  }
 }finally{await mf.dispose();}
},60000);
// Session W Part 23 (Session Q D2, [TIER 3] (deploy config)): a /_next/static/ file that does not exist gets the plain 404
// of alpha/worker.mjs (no HTML, nothing from the request, a policy that allows nothing, the static assets' headers) instead
// of Next's HTML 404 page without a policy; a file that exists still comes from the asset layer; pages keep their policy.
test.runIf(enabled)('the packaged Alpha answers a missing /_next/static/ file with a plain 404, and a real one from the assets',async()=>{
 const mf=await alpha();
 try{
  const expected=Object.fromEntries(staticMissHeaders(egress).map(([name,value])=>[name.toLowerCase(),value]));
  for(const path of ['/_next/static/chunks/does-not-exist.js?x=<b>hi</b>','/_next/static/','/_next/static']){
   const response=await mf.dispatchFetch(`https://alpha.zigoals.app${path}`,{headers:{'cf-connecting-ip':'192.0.2.44','x-zigoals-origin':'https://evil.example'}});
   expect(response.status,path).toBe(404);
   // Transport headers aside (content-length, transfer-encoding, and Miniflare's own mf-*), exactly the reviewed set.
   const headers=Object.fromEntries([...response.headers].filter(([name])=>!['content-length','transfer-encoding'].includes(name)&&!name.startsWith('mf-')));
   expect(headers,path).toEqual(expected);
   expect(await response.text(),path).toBe('Not found\n');
  }
  const chunk=(await readdir(resolve(root,'apps/web/.open-next/assets/_next/static/chunks'))).find(name=>name.endsWith('.js'));
  const real=await mf.dispatchFetch(`https://alpha.zigoals.app/_next/static/chunks/${chunk}`);
  expect(real.status).toBe(200);
  expect(real.headers.get('content-type')).toMatch(/javascript/);
  await real.arrayBuffer();
  const page=await mf.dispatchFetch('https://alpha.zigoals.app/app',{headers:{'cf-connecting-ip':'192.0.2.44'}});
  expect(page.status).toBe(200);
  expect(page.headers.get('content-security-policy')).toContain("'strict-dynamic'");
  await page.arrayBuffer();
 }finally{await mf.dispose();}
},60000);
// Session X Part 4 ([TIER 3] (security headers)): the packaged Alpha's logo route keeps its own policy and cache. A refusal
// is never stored, a logo the provider does not have is kept a minute, a logo a day, always under `default-src 'none';
// sandbox`; the build header and the global headers still apply; a page next to it keeps the page policy and no-store.
test.runIf(enabled)('the packaged Alpha serves market logos with their own sandbox policy and cache lifetime',async()=>{
 const png=new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1,8,6,0,0,0,31,21,196,137,0,0,0,10,73,68,65,84,120,156,99,0,1,0,0,5,0,1,13,10,45,180,0,0,0,0,73,69,78,68,174,66,96,130]);
 const requested=[];
 const mf=await alpha(request=>{const url=new URL(request.url);requested.push(url.host);if(url.host==='coin-images.coingecko.com'&&url.pathname==='/coins/images/1/large/bitcoin.png')return new Response(png,{headers:{'content-type':'image/png'}});return new Response('not here',{status:404});});
 const logo=path=>`https://alpha.zigoals.app/api/market-logo?url=${encodeURIComponent('https://coin-images.coingecko.com/coins/images/'+path)}`;
 const {commit}=JSON.parse(await readFile(resolve(root,'apps/web/.open-next/alpha-build.json'),'utf8'));
 try{
  const found=await mf.dispatchFetch(logo('1/large/bitcoin.png'),{headers:{'cf-connecting-ip':'192.0.2.44'}});
  expect(found.status).toBe(200);
  expect(found.headers.get('content-type')).toBe('image/png');
  expect(found.headers.get('content-security-policy')).toBe("default-src 'none'; sandbox");
  expect(found.headers.get('cache-control')).toBe('public, max-age=86400');
  expect(found.headers.get('x-content-type-options')).toBe('nosniff');
  expect(found.headers.get('cross-origin-resource-policy')).toBe('same-origin');
  expect(found.headers.get('x-zigoals-build')).toBe(commit);
  expect(new Uint8Array(await found.arrayBuffer())).toEqual(png);
  const missing=await mf.dispatchFetch(logo('2/large/missing.png'),{headers:{'cf-connecting-ip':'192.0.2.44'}});
  expect(missing.status).toBe(404);
  expect(missing.headers.get('content-security-policy')).toBe("default-src 'none'; sandbox");
  // The route asks for a minute, but OpenNext answers every 404 with Next's own no-store: a miss is not kept at all.
  expect(missing.headers.get('cache-control')).toBe('private, no-cache, no-store, max-age=0, must-revalidate');
  await missing.arrayBuffer();
  const refused=await mf.dispatchFetch('https://alpha.zigoals.app/api/market-logo?url=https%3A%2F%2Fevil.example%2Fx.png',{headers:{'cf-connecting-ip':'192.0.2.44'}});
  expect(refused.status).toBe(400);
  expect(refused.headers.get('content-security-policy')).toBe("default-src 'none'; sandbox");
  expect(refused.headers.get('cache-control')).toBe('no-store');
  await refused.arrayBuffer();
  expect(requested.every(host=>host==='coin-images.coingecko.com')).toBe(true);
  const page=await mf.dispatchFetch('https://alpha.zigoals.app/app/markets',{headers:{'cf-connecting-ip':'192.0.2.44'}});
  expect(page.headers.get('content-security-policy')).toContain("'strict-dynamic'");
  expect(page.headers.get('cache-control')).toBe('private, no-store, max-age=0');
  await page.arrayBuffer();
 }finally{await mf.dispose();}
},60000);
