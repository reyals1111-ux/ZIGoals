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

describe.concurrent('food lookup queue',()=>{
 test('two new barcodes within 12 s both succeed: the second waits for the next shared slot',async()=>{
  const {mf,calls,lookup}=budget(code=>product(code));
  try{
   const first=lookup('0034000470693');await pause(100);const second=lookup('11111111');
   expect((await first).status).toBe(200);
   const waited=await second;
   expect(waited.status).toBe(200);expect(waited.body.product.code).toBe('11111111');
   expect(waited.ms).toBeGreaterThan(10_000);
   // The provider still saw at most one request per 12 s.
   expect(calls.map(c=>c.code)).toEqual(['0034000470693','11111111']);expect(calls[1].at-calls[0].at).toBeGreaterThanOrEqual(11_500);
  }finally{await mf.dispose();}
 },40_000);

 test('while one lookup waits, another new barcode is refused at once and honestly, without a provider call',async()=>{
  const {mf,calls,lookup}=budget(code=>product(code));
  try{
   const first=lookup('0034000470693');await pause(100);const queued=lookup('11111111');await pause(100);
   const refused=await lookup('22222222');
   expect(refused.status).toBe(429);expect(refused.body.error).toBe('TRY_LATER');
   expect(refused.body.retryAfter).toBeGreaterThanOrEqual(1);expect(refused.body.retryAfter).toBeLessThanOrEqual(24);
   expect(refused.ms).toBeLessThan(5_000);
   expect((await first).status).toBe(200);expect((await queued).status).toBe(200);
   expect(calls.map(c=>c.code)).toEqual(['0034000470693','11111111']);
  }finally{await mf.dispose();}
 },40_000);

 test('a throttle that arrives while a lookup waits: it reports throttling, not "not found", and makes no provider call',async()=>{
  // The first provider answer is slow and then says 429, so the second lookup is already waiting when the backoff starts.
  const {mf,calls,lookup}=budget(async()=>{await pause(1_000);return new Response('busy',{status:429});});
  try{
   const first=lookup('0034000470693');await pause(100);const queued=lookup('11111111');
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
   const first=lookup('0034000470693');await pause(100);const same=lookup('0034000470693');
   expect((await first).status).toBe(200);
   const waited=await same;
   expect(waited.status).toBe(200);expect(waited.body.product.code).toBe('0034000470693');
   expect(calls).toHaveLength(1);
  }finally{await mf.dispose();}
 },40_000);
});
