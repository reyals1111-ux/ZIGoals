import {describe,test,expect} from 'vitest';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
const require=createRequire(new URL('../../apps/web/node_modules/wrangler/package.json',import.meta.url));
const {Miniflare,convertV4MiniflareOptions}=require('miniflare');

// The shared food budget admits one Open Food Facts request per 12 s. A second new barcode inside that window now
// waits for the next slot instead of being refused at once; only one lookup waits at a time, never for more than
// 15 s, and a throttled lookup never reads as a missing product. Real time: each case spends one 12 s slot.
const script=await readFile(new URL('../../workers/food-lookup/worker.mjs',import.meta.url),'utf8');
const product=code=>Response.json({status:'success',product:{code,product_name:'Fictional food',nutriments:{'energy-kcal_100g':100,proteins_100g:2,carbohydrates_100g:10,fat_100g:3}}});
function budget(upstream){
 const calls=[];
 const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script,compatibilityDate:'2026-09-13',durableObjects:{FOOD_BUDGET:{className:'FoodBudget',useSQLite:true}},bindings:{FOOD_USER_AGENT:'ZIGoals/0.1.0 (alpha-contact@example.invalid)'},outboundService:async request=>{const code=new URL(request.url).pathname.split('/').pop();calls.push({code,at:Date.now()});return upstream(code,calls.length);}}));
 const lookup=async code=>{const started=Date.now(),res=await mf.dispatchFetch('https://food.test/lookup?code='+code);return {status:res.status,body:await res.json(),ms:Date.now()-started};};
 return {mf,calls,lookup};
}
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
/** Polls until `ready()` holds (at most 10 s): the provider call is the one observable sign that a lookup holds the slot. */
async function until(ready){for(let i=0;i<1_000&&!ready();i++)await pause(10);expect(ready()).toBe(true);}
// Session P (PR 1): the lookups used to be sent 100 ms apart and relied on arriving in that order. On a busy runner the
// Worker's cold start outlasts the pause, the first requests arrive together and workerd may serve them in another
// order, so a lookup meant to wait was refused and the one meant to be refused waited (CI run 37141593543, unit job).
// Each case now sends the next lookup only once the slot is observably taken, and the one case where two lookups race
// for the single waiting place asserts the pair: exactly one waits and one is refused, whichever arrives first.

describe.concurrent('food lookup queue',()=>{
 test('two new barcodes within 12 s both succeed: the second waits for the next shared slot',async()=>{
  const {mf,calls,lookup}=budget(code=>product(code));
  try{
   const first=await lookup('0034000470693');expect(first.status).toBe(200);
   const waited=await lookup('11111111');
   expect(waited.status).toBe(200);expect(waited.body.product.code).toBe('11111111');
   expect(waited.ms).toBeGreaterThan(10_000);
   // The provider still saw at most one request per 12 s.
   expect(calls.map(c=>c.code)).toEqual(['0034000470693','11111111']);expect(calls[1].at-calls[0].at).toBeGreaterThanOrEqual(11_500);
  }finally{await mf.dispose();}
 },40_000);

 test('while one lookup waits, another new barcode is refused at once and honestly, without a provider call',async()=>{
  const {mf,calls,lookup}=budget(code=>product(code));
  try{
   expect((await lookup('0034000470693')).status).toBe(200);
   // Two new barcodes while the slot is taken: one may wait, the other is refused at once, in arrival order.
   const [b,c]=await Promise.all([lookup('11111111'),(async()=>{await pause(100);return lookup('22222222');})()]);
   const refused=[b,c].find(r=>r.status===429),waited=[b,c].find(r=>r.status===200);
   expect([b,c].map(r=>r.status).sort()).toEqual([200,429]);
   expect(refused.body.error).toBe('TRY_LATER');
   expect(refused.body.retryAfter).toBeGreaterThanOrEqual(1);expect(refused.body.retryAfter).toBeLessThanOrEqual(24);
   expect(refused.ms).toBeLessThan(5_000);expect(waited.ms).toBeGreaterThan(10_000);
   expect(calls.map(c=>c.code)).toEqual(['0034000470693',waited.body.product.code]);
  }finally{await mf.dispose();}
 },40_000);

 test('a throttle that arrives while a lookup waits: it reports throttling, not "not found", and makes no provider call',async()=>{
  // The first provider answer is slow and then says 429, so the second lookup is already waiting when the backoff starts.
  const {mf,calls,lookup}=budget(async()=>{await pause(1_000);return new Response('busy',{status:429});});
  try{
   const first=lookup('0034000470693');await until(()=>calls.length===1);const queued=lookup('11111111');
   expect(await first).toMatchObject({status:429,body:{error:'PROVIDER_THROTTLED',retryAfter:60}});
   const waited=await queued;
   expect(waited.status).toBe(429);expect(waited.body.error).toBe('PROVIDER_THROTTLED');expect(waited.body.retryAfter).toBeGreaterThan(40);
   expect(calls).toHaveLength(1);
   // The backoff still refuses new barcodes at once.
   const after=await lookup('22222222');expect(after).toMatchObject({status:429,body:{error:'TRY_LATER'}});expect(after.ms).toBeLessThan(5_000);expect(calls).toHaveLength(1);
  }finally{await mf.dispose();}
 },40_000);

 test('a waiting lookup for a product another request fetched meanwhile is served from the cache',async()=>{
  const {mf,calls,lookup}=budget(async code=>{await pause(1_000);return product(code);});
  try{
   const first=lookup('0034000470693');await until(()=>calls.length===1);const same=lookup('0034000470693');
   expect((await first).status).toBe(200);
   const waited=await same;
   expect(waited.status).toBe(200);expect(waited.body.product.code).toBe('0034000470693');
   expect(calls).toHaveLength(1);
  }finally{await mf.dispose();}
 },40_000);
});
