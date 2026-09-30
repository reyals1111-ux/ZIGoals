import {test,expect} from 'vitest';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
const require=createRequire(new URL('../../apps/web/node_modules/wrangler/package.json',import.meta.url));
const {Miniflare,convertV4MiniflareOptions}=require('miniflare');

// FOOD_USER_AGENT template (docs/run11/FOOD_READINESS.md): `ZIGoals/<app version> (<owner contact>)`.
// The contact below is fictional; the owner supplies the real one privately.
const filled='ZIGoals/0.1.0 (alpha-contact@example.invalid)';
const script=await readFile(new URL('../../workers/food-lookup/worker.mjs',import.meta.url),'utf8');
async function lookup(userAgent){
 const requests=[];
 const outboundService=async req=>{requests.push({url:new URL(req.url),userAgent:req.headers.get('User-Agent')});return Response.json({status:'success',product:{code:'0034000470693',product_name:'Fictional food',nutriments:{}}});};
 const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script,compatibilityDate:'2026-09-13',durableObjects:{FOOD_BUDGET:{className:'FoodBudget',useSQLite:true}},bindings:userAgent===undefined?{}:{FOOD_USER_AGENT:userAgent},outboundService}));
 try{const res=await mf.dispatchFetch('https://food.test/lookup?code=0034000470693');return {status:res.status,body:await res.json(),requests};}finally{await mf.dispose();}
}

test('a filled FOOD_USER_AGENT template is sent unchanged with only the pinned v3.4 fields',async()=>{
 const {status,requests}=await lookup(filled);
 expect(status).toBe(200);expect(requests).toHaveLength(1);
 const [{url,userAgent}]=requests;
 expect(userAgent).toBe(filled);
 expect(url.origin+url.pathname).toBe('https://world.openfoodfacts.org/api/v3.4/product/0034000470693');
 expect([...url.searchParams.keys()]).toEqual(['fields']);
 expect(url.searchParams.get('fields')).toBe('code,product_name,brands_tags,nutrition_data_per,nutriments');
},30000);

test.each([
 ['missing',undefined],
 ['another app name','Mozilla/5.0 (X11; Linux x86_64)'],
 ['no identity after the prefix','ZIGoals/'],
 ['a header injection','ZIGoals/0.1.0 (alpha-contact@example.invalid)\r\nX-Other: 1'],
 ['more than 160 characters after the prefix','ZIGoals/'+'a'.repeat(161)],
])('an unusable FOOD_USER_AGENT (%s) fails closed before any provider call',async(_,userAgent)=>{
 const {status,body,requests}=await lookup(userAgent);
 expect(status).toBe(503);expect(body).toEqual({error:'PROVIDER_SETUP_REQUIRED'});expect(requests).toHaveLength(0);
},30000);
