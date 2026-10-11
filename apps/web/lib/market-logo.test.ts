import {expect,it} from 'vitest';
import {createMarketLogoCache} from './server/market-logo';
const url='https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png';
const png=()=>new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0]);
it('deduplicates bounded raster downloads and caches them for a day without credentials',async()=>{
 let calls=0,time=1000;let init:RequestInit|undefined;const loader=createMarketLogoCache(async(_url,options)=>{calls++;init=options;return new Response(png(),{headers:{'Content-Type':'image/png'}});},()=>time);
 const [a,b]=await Promise.all([loader.load(url),loader.load(url)]);expect(a?.contentType).toBe('image/png');expect(b?.bytes).toEqual(png());expect(calls).toBe(1);time+=23*3600000;await loader.load(url);expect(calls).toBe(1);expect(init).toMatchObject({credentials:'omit',redirect:'manual',referrerPolicy:'no-referrer'});expect(JSON.stringify(init)).not.toMatch(/api.key|Authorization|Cookie/);
});
it('rejects arbitrary URL destinations before fetch and invalid/active image content after fetch',async()=>{
 let calls=0;const loader=createMarketLogoCache(async()=>{calls++;return new Response('<svg onload="evil"/>',{headers:{'Content-Type':'image/svg+xml'}});});
 expect(await loader.load('https://localhost/private')).toBeNull();expect(calls).toBe(0);expect(await loader.load(url)).toBeNull();expect(calls).toBe(1);
 const fake=createMarketLogoCache(async()=>new Response('<html>evil</html>',{headers:{'Content-Type':'image/png'}}));expect(await fake.load(url)).toBeNull();
 const huge=createMarketLogoCache(async()=>new Response(new Uint8Array(512*1024+1),{headers:{'Content-Type':'image/png'}}));expect(await huge.load(url)).toBeNull();
});
it('bounds concurrent and new URL image downloads and retry-gates failures',async()=>{
 let calls=0,active=0,peak=0;const loader=createMarketLogoCache(async()=>{calls++;active++;peak=Math.max(peak,active);await Promise.resolve();active--;return new Response('quota',{status:429});},()=>1000);
 await Promise.all(Array.from({length:100},(_,i)=>loader.load(url.replace('/1/',`/${i}/`))));expect(calls).toBe(60);expect(peak).toBe(2);await loader.load(url);expect(calls).toBe(60);
});
it('logo route rejects unknown inputs and adds image containment headers',async()=>{
 const {GET}=await import('../app/api/market-logo/route');for(const query of ['url=http://localhost','url='+encodeURIComponent(url)+'&wallet=private','url='+encodeURIComponent(url)+'&url='+encodeURIComponent(url)]){const response=await GET(new Request('https://local/api/market-logo?'+query));expect(response.status).toBe(400);expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');}
});

it('loads raster logos in Workers without following redirect destinations',async()=>{
 let calls=0;const loader=createMarketLogoCache(async(_url,init)=>{
  if(init?.redirect==='error')throw new TypeError('Workers does not implement redirect:error');
  expect(init?.redirect).toBe('manual');calls++;return new Response(png(),{headers:{'Content-Type':'image/png'}});
 });
 expect((await loader.load(url))?.bytes).toEqual(png());expect(calls).toBe(1);
 let redirects=0;const redirected=createMarketLogoCache(async(_url,init)=>{expect(init?.redirect).toBe('manual');redirects++;return new Response(null,{status:302,headers:{Location:'https://untrusted.invalid/private'}});});
 expect(await redirected.load(url)).toBeNull();expect(redirects).toBe(1);
});
