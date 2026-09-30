import {test,expect} from 'vitest';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
const require=createRequire(new URL('../../apps/web/node_modules/wrangler/package.json',import.meta.url));
const {Miniflare,convertV4MiniflareOptions}=require('miniflare');

// Open Food Facts answers over-limit reads with 429 and global overload with 503. The Worker
// calls from Cloudflare egress IPs that other customers may share, so either can arrive even
// below our own budget. Both must back off the shared budget and never read as "not found".
const script=await readFile(new URL('../../workers/food-lookup/worker.mjs',import.meta.url),'utf8');
test.each([429,503])('an upstream %i backs off the shared budget and reports throttling, not a missing product',async status=>{
 let calls=0;
 const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script,compatibilityDate:'2026-09-13',durableObjects:{FOOD_BUDGET:{className:'FoodBudget',useSQLite:true}},bindings:{FOOD_USER_AGENT:'ZIGoals/0.1.0 (alpha-contact@example.invalid)'},outboundService:async()=>{calls++;return new Response('busy',{status});}}));
 try{
  const first=await mf.dispatchFetch('https://food.test/lookup?code=0034000470693');
  expect(first.status).toBe(429);expect(await first.json()).toEqual({error:'PROVIDER_THROTTLED',retryAfter:60});expect(calls).toBe(1);
  // A different barcode right away is refused locally, without another provider call.
  const second=await mf.dispatchFetch('https://food.test/lookup?code=11111111');
  expect(second.status).toBe(429);expect((await second.json()).error).toBe('TRY_LATER');expect(calls).toBe(1);
 }finally{await mf.dispose();}
},30000);
