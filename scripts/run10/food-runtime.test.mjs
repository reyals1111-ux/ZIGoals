import {test,expect} from 'vitest';
import {createRequire} from 'node:module';
import {readFile,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const require=createRequire(new URL('../../apps/web/node_modules/wrangler/package.json',import.meta.url));
const {Miniflare,convertV4MiniflareOptions}=require('miniflare');
test('shared food budget persists before outbound I/O, caches bounded public data and rejects arbitrary destinations',async()=>{
 const persist=await mkdtemp(join(tmpdir(),'zigoals-run10-food-'));let calls=0;
 const outboundService=async req=>{calls++;expect(new URL(req.url).hostname).toBe('world.openfoodfacts.org');expect(req.headers.get('User-Agent')).toBe('ZIGoals/test (https://example.invalid)');expect(req.url).not.toContain('email');return Response.json({status:'success',product:{code:'0034000470693',product_name:'Fictional food',nutriments:{'energy-kcal_100g':100,proteins_100g:2,carbohydrates_100g:10,fat_100g:3}}});};
 async function create(){return new Miniflare({...convertV4MiniflareOptions({modules:true,script:await readFile(new URL('../../workers/food-lookup/worker.mjs',import.meta.url),'utf8'),compatibilityDate:'2026-09-13',durableObjects:{FOOD_BUDGET:{className:'FoodBudget',useSQLite:true}},bindings:{FOOD_USER_AGENT:'ZIGoals/test (https://example.invalid)'},outboundService}),resourcePersistencePath:persist});}
 let mf=await create();const call=code=>mf.dispatchFetch('https://food.test/lookup?code='+code);
 try{
  expect((await call('https://evil.test')).status).toBe(400);expect(calls).toBe(0);
  const results=await Promise.all(['0034000470693','11111111','22222222'].map(call));expect(results.map(x=>x.status).sort()).toEqual([200,429,429]);expect(calls).toBe(1);
  expect((await call('0034000470693')).status).toBe(200);expect(calls).toBe(1);
  await mf.dispose();mf=await create();expect((await call('0034000470693')).status).toBe(200);expect((await call('33333333')).status).toBe(429);expect(calls).toBe(1);
 }finally{await mf.dispose();}
},30000);
