import {describe,test,expect} from 'vitest';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
const require=createRequire(new URL('../../apps/web/node_modules/wrangler/package.json',import.meta.url));
const {Miniflare,convertV4MiniflareOptions}=require('miniflare');

// Session AK (Part 1b, TIER 3 egress routes): GET /lookup asks Open Food Facts first; only its "not found" goes on to USDA
// FoodData Central Branded Foods, and only with the FDC_API_KEY secret. FDC has its own budget object (one request per
// 4 s, back-off on 429/503, 24 h / 1 h cache, 160 kB body cap), the barcode client share and the FOOD_USER_AGENT. Every
// success names its source. Real Worker in Miniflare on the real clock; both providers are local fakes.
//
// FIXTURE, not real data: the FDC answer follows the documented foods/search shape (fdc_api.yaml: `foods[]` with fdcId,
// dataType, description, brandOwner, gtinUpc, foodNutrients) with the field names of the live search answer
// (nutrientId, nutrientNumber, unitName, value). Every name, id, barcode and number below is made up.
const script=await readFile(new URL('../../workers/food-lookup/worker.mjs',import.meta.url),'utf8');
const AGENT='ZIGoals/0.1.0 (alpha-contact@example.invalid)',KEY='FixtureKey0123456789abcdefABCDEF01234567';
const FDC='https://api.nal.usda.gov/fdc/v1/foods/search';
const ATTRIBUTION='U.S. Department of Agriculture, Agricultural Research Service. FoodData Central, 2019. fdc.nal.usda.gov.';
const nutrient=(nutrientId,nutrientNumber,unitName,value)=>({nutrientId,nutrientName:'Fixture '+nutrientNumber,nutrientNumber,unitName,value,derivationCode:'LCCS'});
const branded=(gtinUpc,extra={})=>({fdcId:9000001,dataType:'Branded',description:'FIXTURE OAT BAR',brandOwner:'Fixture Foods Inc.',brandName:'FIXTURE',gtinUpc,servingSizeUnit:'g',foodNutrients:[
 nutrient(1008,'208','KCAL',412),nutrient(1003,'203','G',7.06),nutrient(1005,'205','G',64.7),nutrient(1004,'204','G',14.1),nutrient(1079,'291','G',5.9),nutrient(2000,'269','G',23.5),nutrient(1258,'606','G',1.76),
 nutrient(1093,'307','MG',235),nutrient(1092,'306','MG',294),nutrient(1087,'301','MG',59),nutrient(1089,'303','MG',2.12),nutrient(1162,'401','MG',0),nutrient(1110,'324','IU',400),nutrient(1178,'418','UG',0.6),
 // Odd entries stay unknown: a wrong unit, a negative value, an unknown nutrient, a second energy value.
 nutrient(1090,'304','G',30),nutrient(1095,'309','MG',-1),nutrient(1062,'268','kJ',1724),nutrient(1008,'208','KCAL',999)],...extra});
const OFF_FOUND={code:'5000000000017',status:'success',product:{code:'5000000000017',product_name:'Fixture OFF food',nutriments:{'energy-kcal_100g':100}}};
function worker({off,fdc,bindings={FOOD_USER_AGENT:AGENT,FDC_API_KEY:KEY}}={}){
 const calls=[];
 const outboundService=async request=>{
  const url=new URL(request.url);calls.push({url,at:Date.now(),headers:Object.fromEntries(request.headers)});
  if(url.origin==='https://world.openfoodfacts.org'){
   const code=url.pathname.split('/').pop();
   if(off)return off(code);
   return code==='5000000000017'?Response.json(OFF_FOUND):Response.json({status:'failure',result:{id:'product_not_found'}},{status:404});
  }
  if(fdc)return fdc(url);
  const q=url.searchParams.get('query');
  return Response.json({totalHits:1,foods:q==='041303020937'?[branded('99999999999999',{fdcId:9000002}),branded('041303020937')]:q==='4006381333931'?[branded('4006381333932')]:[]});
 };
 const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script,compatibilityDate:'2026-09-13',durableObjects:{FOOD_BUDGET:{className:'FoodBudget',useSQLite:true}},bindings,outboundService}));
 const lookup=async(code,init={})=>{const started=Date.now(),res=await mf.dispatchFetch('https://food.test/lookup?code='+code,init);return {status:res.status,body:await res.json(),ms:Date.now()-started};};
 const fdcCalls=()=>calls.filter(c=>c.url.hostname==='api.nal.usda.gov');
 return {mf,calls,fdcCalls,lookup};
}

describe.concurrent('barcode lookup: Open Food Facts, then FoodData Central',()=>{
 test('Open Food Facts found: its answer unchanged with the source named, and no FDC request',async()=>{
  const {mf,calls,fdcCalls,lookup}=worker();
  try{
   const found=await lookup('5000000000017');
   expect(found.status).toBe(200);
   expect(found.body).toEqual({...OFF_FOUND,source:'Open Food Facts',attribution:'Source: Open Food Facts (openfoodfacts.org), Open Database Licence 1.0 / Database Contents Licence 1.0',link:'https://world.openfoodfacts.org/'});
   expect(fdcCalls()).toEqual([]);expect(calls).toHaveLength(1);
   // The cached answer is named the same way.
   expect((await lookup('5000000000017')).body).toEqual(found.body);expect(calls).toHaveLength(1);
  }finally{await mf.dispose();}
 },30_000);

 test('Open Food Facts not found + key: one FDC search by UPC-A, the exact GTIN picked, mapped per 100 g with its source',async()=>{
  const {mf,calls,fdcCalls,lookup}=worker();
  try{
   const answer=await lookup('0041303020937',{headers:{'x-food-client':'v4:192.0.2.7',cookie:'session=private',authorization:'Bearer private','cf-connecting-ip':'192.0.2.7'}});
   expect(answer.status).toBe(200);
   expect(calls.map(c=>c.url.hostname)).toEqual(['world.openfoodfacts.org','api.nal.usda.gov']);
   const [call]=fdcCalls();
   expect(call.url.origin+call.url.pathname).toBe(FDC);
   // The EAN-13 with a leading zero is asked as its UPC-A; the key is a header, never in the URL.
   expect([...call.url.searchParams]).toEqual([['query','041303020937'],['dataType','Branded'],['pageSize','5']]);
   expect(call.url.search).not.toContain(KEY);
   expect(call.headers['x-api-key']).toBe(KEY);expect(call.headers['user-agent']).toBe(AGENT);expect(call.headers.accept).toBe('application/json');
   for(const name of ['cookie','authorization','x-food-client','cf-connecting-ip'])expect(call.headers[name],name).toBeUndefined();
   expect(answer.body).toEqual({source:'USDA FoodData Central',attribution:ATTRIBUTION,link:'https://fdc.nal.usda.gov/',licence:'CC0-1.0',product:{
    code:'0041303020937',gtinUpc:'041303020937',fdcId:9000001,name:'FIXTURE OAT BAR',brand:'FIXTURE',basis:'per-100g-or-100ml',labelUnit:'g',
    nutrients:{kcal:412,proteinMg:7060,carbsMg:64700,fatMg:14100,fiberMg:5900,sugarMg:23500,saturatedFatMg:1760,sodiumMg:235,potassiumMg:294,calciumMg:59,ironMg:2.12,magnesiumMg:null,zincMg:null,vitaminAUg:null,vitaminCMg:0,vitaminDUg:10,vitaminEMg:null,vitaminKUg:null,vitaminB12Ug:0.6,folateUg:null}}});
  }finally{await mf.dispose();}
 },40_000);

 test('Open Food Facts not found without a usable key: no FDC request, 404 NOT_FOUND',async()=>{
  for(const bindings of [{FOOD_USER_AGENT:AGENT},{FOOD_USER_AGENT:AGENT,FDC_API_KEY:''},{FOOD_USER_AGENT:AGENT,FDC_API_KEY:'short'},{FOOD_USER_AGENT:AGENT,FDC_API_KEY:KEY+'\r\nX-Other: 1'}]){
   const {mf,calls,fdcCalls,lookup}=worker({bindings});
   try{expect(await lookup('0041303020937')).toMatchObject({status:404,body:{error:'NOT_FOUND'}});expect(fdcCalls()).toEqual([]);expect(calls).toHaveLength(1);}finally{await mf.dispose();}
  }
 },60_000);

 test('an unusable FOOD_USER_AGENT fails closed before either provider',async()=>{
  const {mf,calls,lookup}=worker({bindings:{FDC_API_KEY:KEY}});
  try{expect(await lookup('0041303020937')).toMatchObject({status:503,body:{error:'PROVIDER_SETUP_REQUIRED'}});expect(calls).toEqual([]);}finally{await mf.dispose();}
 },30_000);

 test('a "not found" in a 200 answer (status 0) goes on to FDC too',async()=>{
  const {mf,fdcCalls,lookup}=worker({off:()=>Response.json({status:0,status_verbose:'product not found',code:'0041303020937'})});
  try{const answer=await lookup('0041303020937');expect(answer.status).toBe(200);expect(answer.body.source).toBe('USDA FoodData Central');expect(fdcCalls()).toHaveLength(1);}finally{await mf.dispose();}
 },30_000);

 test('GTIN forms: a 14-digit code matches its UPC-A; another EAN-13 in the hits is not taken; no match stays NOT_FOUND for 1 h',async()=>{
  const {mf,fdcCalls,lookup}=worker();
  try{
   const fourteen=await lookup('00041303020937');
   expect(fourteen.status).toBe(200);expect(fourteen.body.product).toMatchObject({code:'00041303020937',gtinUpc:'041303020937',fdcId:9000001});
   expect(fdcCalls()[0].url.searchParams.get('query')).toBe('041303020937');
   // The neighbouring EAN-13 in FDC's hits is a different product: not taken.
   const other=await lookup('4006381333931');
   expect(other).toMatchObject({status:404,body:{error:'NOT_FOUND'}});
   expect(fdcCalls()[1].url.searchParams.get('query')).toBe('4006381333931');
   // The unknown answer is kept: asking again reaches neither provider.
   const before=fdcCalls().length,again=await lookup('4006381333931');
   expect(again.status).toBe(404);expect(fdcCalls()).toHaveLength(before);
  }finally{await mf.dispose();}
 },60_000);

 test('a cache hit uses no slot: the same barcode again reaches neither provider and answers at once',async()=>{
  const {mf,calls,lookup}=worker();
  try{
   const first=await lookup('0041303020937');expect(first.status).toBe(200);expect(calls).toHaveLength(2);
   const again=await lookup('0041303020937',{headers:{'x-food-client':'v4:192.0.2.7'}});
   expect(again.body).toEqual(first.body);expect(again.ms).toBeLessThan(1_500);expect(calls).toHaveLength(2);
  }finally{await mf.dispose();}
 },30_000);

 test('an FDC 429 pauses FDC for its Retry-After: the answer stays NOT_FOUND and the next lookup sends nothing to FDC',async()=>{
  const {mf,fdcCalls,lookup}=worker({fdc:()=>new Response('{"error":{"code":"OVER_RATE_LIMIT"}}',{status:429,headers:{'content-type':'application/json','retry-after':'120'}})});
  try{
   expect(await lookup('0041303020937')).toMatchObject({status:404,body:{error:'NOT_FOUND'}});
   expect(fdcCalls()).toHaveLength(1);
   // Open Food Facts' "not found" is cached; FDC is paused, so nothing is sent and the answer is at once.
   const again=await lookup('0041303020937');
   expect(again).toMatchObject({status:404,body:{error:'NOT_FOUND'}});expect(again.ms).toBeLessThan(1_500);
   expect(fdcCalls()).toHaveLength(1);
  }finally{await mf.dispose();}
 },30_000);

 test('an FDC body over 160 kB is refused, and a redirect is never followed: both stay NOT_FOUND',async()=>{
  const big=worker({fdc:()=>Response.json({foods:[branded('041303020937',{ingredients:'x'.repeat(170_000)})]})});
  try{expect(await big.lookup('0041303020937')).toMatchObject({status:404,body:{error:'NOT_FOUND'}});expect(big.fdcCalls()).toHaveLength(1);}finally{await big.mf.dispose();}
  const moved=worker({fdc:()=>new Response(null,{status:302,headers:{location:'https://evil.example/steal'}})});
  try{expect(await moved.lookup('0041303020937')).toMatchObject({status:404,body:{error:'NOT_FOUND'}});expect(moved.calls.map(c=>c.url.hostname)).toEqual(['world.openfoodfacts.org','api.nal.usda.gov']);}finally{await moved.mf.dispose();}
 },40_000);

 test('the FDC budget is its own: one request per 4 s, and an unavailable answer is not cached',async()=>{
  // FDC fails (not cached); Open Food Facts' "not found" is cached, so the second lookup goes straight to FDC's slot.
  const {mf,calls,fdcCalls,lookup}=worker({fdc:()=>new Response('oops',{status:500})});
  try{
   expect((await lookup('0041303020937')).status).toBe(404);
   expect((await lookup('0041303020937')).status).toBe(404);
   expect(calls.map(c=>c.url.hostname)).toEqual(['world.openfoodfacts.org','api.nal.usda.gov','api.nal.usda.gov']);
   const [first,second]=fdcCalls();expect(second.at-first.at).toBeGreaterThanOrEqual(3_900);
  }finally{await mf.dispose();}
 },40_000);
});
