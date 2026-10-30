import {describe,test,expect} from 'vitest';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
const require=createRequire(new URL('../../apps/web/node_modules/wrangler/package.json',import.meta.url));
const {Miniflare,convertV4MiniflareOptions}=require('miniflare');

// Session AJ (item 22, TIER 3 egress routes): GET /search?q=&lang= reads the Swiss Food Composition Database (FSVO) behind
// the food Worker, in its own budget object: one FSVO request per 2 s for the whole deployment, the barcode route's client
// share, 24 h caching, the FOOD_USER_AGENT, no redirects, a 128 kB body cap and the FSVO attribution on every result.
// Real Worker in Miniflare on the real clock; the provider is a local fake, so nothing here reaches FSVO.
//
// FIXTURE, not real data: the shapes follow the FSVO API (its OpenAPI document and one real search, read 2026-10-29):
// GET …/BLV-api/foods returns hits with a numeric `id` (the DBID) and `foodName`; GET …/BLV-api/food/<DBID> returns `name`
// and `values`, each with `value` per 100 g edible portion, `component.code` (ENERCC, PROT625, CHO, FAT, FIBT, SUGAR,
// NACL) and `unit.code`. Every name, id and number below is made up.
const script=await readFile(new URL('../../workers/food-lookup/worker.mjs',import.meta.url),'utf8');
const AGENT='ZIGoals/0.1.0 (alpha-contact@example.invalid)';
const FSVO='https://api.webapp.prod.blv.foodcase-services.com/BLV_WebApp_WS/webresources/BLV-api/';
const ATTRIBUTION='Source: Swiss Food Composition Database V 7.1, Federal Food Safety and Veterinary Office FSVO (naehrwertdaten.ch)';
const hit=(id,name)=>({id,foodName:name,generic:true,categoryNames:'Fixture fruit',amount:0,foodid:7,valueTypeCode:''});
const detail=(id,name,values={})=>({id,name,isgeneric:true,isrecipe:false,foodid:7,values:Object.entries(values).map(([code,[value,unit]])=>({id:1,value,component:{code,name:'Fixture '+code},unit:unit===undefined?undefined:{code:unit,name:unit}}))});
const fruit=(id,name)=>detail(id,name,{ENERCC:[50,'kcal'],PROT625:[0.5,'g'],CHO:[11,'g'],FAT:[0.25,'g'],FIBT:[2,'g'],SUGAR:[9,'g'],NACL:[0,'g']});
const SEARCHES={
 'fixture apple':[hit(900001,'Fixture apple, fresh'),hit(900002,'Fixture apple juice'),hit(900003,'Fixture apple pie'),hit(900004,'Fixture apple sauce'),hit(900005,'Fixture dried apple'),hit(900006,'Fixture apple six'),hit(900007,'Fixture apple seven')],
 'fixture pear':[hit(900011,'Fixture pear'),hit(900001,'Fixture apple, fresh')],
 'fixture plum':[hit(900021,'Fixture plum')],'fixture fig':[hit(900022,'Fixture fig')],'fixture kiwi':[hit(900023,'Fixture kiwi')],'fixture lime':[hit(900024,'Fixture lime')],
 'fixture odd':[{id:'../../evil'},{id:-1},{id:1.5},{foodName:'no id'},null,hit(900031,'Fixture odd one'),hit(900031,'Fixture odd one again'),hit(900032,'Fixture odd two')],
 'fixture nothing':[],
};
const DETAILS={
 900001:detail(900001,'Fixture apple, fresh',{ENERCC:[52,'kcal'],PROT625:[0.3,'g'],CHO:[11.4,'g'],FAT:[0.2,'g'],FIBT:[2.04,'g'],SUGAR:[10.1,'g'],NACL:[0,'g'],VITC:[5,'mg']}),
 // Units: a value in the wrong unit, out of range or negative stays unknown; a value without a unit is the component's own.
 900031:detail(900031,'  Fixture\u0007 odd one  ',{ENERCC:[1200,'kcal'],PROT625:[-1,'g'],CHO:[12,'mg'],FAT:[3,'G'],SUGAR:[4]}),
};
const detailFor=id=>DETAILS[id]??fruit(id,'Fixture food '+id);
function worker({fsvo,bindings={FOOD_USER_AGENT:AGENT}}={}){
 const calls=[];
 const outboundService=async request=>{
  const url=new URL(request.url);calls.push({url,at:Date.now(),headers:Object.fromEntries(request.headers)});
  if(url.origin==='https://world.openfoodfacts.org')return Response.json({status:'success',product:{code:url.pathname.split('/').pop(),product_name:'Fixture barcode food'}});
  if(fsvo)return fsvo(url,calls.length);
  return fsvoFixture(url);
 };
 const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script,compatibilityDate:'2026-09-13',durableObjects:{FOOD_BUDGET:{className:'FoodBudget',useSQLite:true}},bindings,outboundService}));
 const search=async(query,init={})=>{const started=Date.now(),res=await mf.dispatchFetch('https://food.test/search?'+query,init);return {status:res.status,body:await res.json(),ms:Date.now()-started};};
 return {mf,calls,search};
}
function fsvoFixture(url){
 if(url.pathname.endsWith('/BLV-api/foods'))return Response.json(SEARCHES[url.searchParams.get('search')]??[]);
 const id=/\/BLV-api\/food\/(\d+)$/.exec(url.pathname)?.[1];
 return id?Response.json(detailFor(Number(id))):new Response('{}',{status:404,headers:{'content-type':'application/json'}});
}
const q=(words,extra={})=>new URLSearchParams({q:words,...extra}).toString();
const gaps=calls=>calls.slice(1).map((c,i)=>c.at-calls[i].at);

describe.concurrent('food search (FSVO)',()=>{
 test('input is validated before any provider call; anything unusable is refused plainly',async()=>{
  const {mf,calls,search}=worker();
  try{
   for(const bad of ['q=a','q='+'a'.repeat(61),'q=%3Cscript%3E','q=https%3A%2F%2Fevil.test','q=apple%3Bdrop','q=%20%20','q=-apple','q=apple&lang=nl','q=apple&lang=EN','q=apple&limit=50','q=apple&q=pear','q=apple&lang=en&lang=de','lang=en',''])
    expect(await search(bad),bad).toMatchObject({status:400,body:{error:'INVALID_QUERY'}});
   expect((await mf.dispatchFetch('https://food.test/search?q=apple',{method:'POST',body:'{}'})).status).toBe(400);
   expect(await search(q('fixture apple'),{headers:{'x-food-client':'192.0.2.7'}})).toMatchObject({status:400,body:{error:'INVALID_CLIENT'}});
   expect(calls).toEqual([]);
  }finally{await mf.dispose();}
 },30_000);

 test('an unusable FOOD_USER_AGENT fails closed before any provider call',async()=>{
  for(const bindings of [{},{FOOD_USER_AGENT:'Mozilla/5.0'},{FOOD_USER_AGENT:AGENT+'\r\nX-Other: 1'}]){
   const {mf,calls,search}=worker({bindings});
   try{expect(await search(q('fixture apple'))).toMatchObject({status:503,body:{error:'PROVIDER_SETUP_REQUIRED'}});expect(calls).toEqual([]);}finally{await mf.dispose();}
  }
 },30_000);

 test('one search: at most 5 hits, each detail in turn, 2 s apart, only the pinned FSVO paths, the User-Agent and nothing about the person',async()=>{
  const {mf,calls,search}=worker();
  try{
   const answer=await search(q('  Fixture   APPLE '),{headers:{cookie:'session=private','x-food-client':'v4:192.0.2.7','cf-connecting-ip':'192.0.2.7','x-forwarded-for':'192.0.2.7',referer:'https://alpha.zigoals.app/app/health',authorization:'Bearer private'}});
   expect(answer.status).toBe(200);
   expect(answer.body.results.map(r=>r.id)).toEqual(['900001','900002','900003','900004','900005']);
   // The host allow-list: the search, then the five details, each at a fixed path with only its own parameters.
   expect(calls.map(c=>c.url.origin+c.url.pathname)).toEqual([FSVO+'foods',...[1,2,3,4,5].map(n=>FSVO+'food/90000'+n)]);
   expect([...calls[0].url.searchParams]).toEqual([['search','fixture apple'],['lang','en'],['limit','10']]);
   for(const c of calls.slice(1))expect([...c.url.searchParams]).toEqual([['lang','en']]);
   for(const c of calls){
    expect(c.headers['user-agent']).toBe(AGENT);expect(c.headers.accept).toBe('application/json');
    for(const name of ['cookie','x-food-client','cf-connecting-ip','x-forwarded-for','referer','authorization'])expect(c.headers[name],name).toBeUndefined();
   }
   // The global budget: one FSVO request per 2 s.
   for(const gap of gaps(calls))expect(gap).toBeGreaterThanOrEqual(1_900);
  }finally{await mf.dispose();}
 },40_000);

 test('the mapping: per-100 g kcal and mg, unknown stays null, and the attribution and link on every result',async()=>{
  const {mf,search}=worker();
  try{
   const apple=await search(q('fixture pear',{lang:'en'}));
   expect(apple.status).toBe(200);
   expect(apple.body.results).toHaveLength(2);
   for(const result of apple.body.results)expect(result).toMatchObject({basis:'per-100g',source:'Swiss Food Composition Database',datasetVersion:'V 7.1',attribution:ATTRIBUTION,link:'https://naehrwertdaten.ch/en/'});
   expect(apple.body.results[1]).toEqual({id:'900001',name:'Fixture apple, fresh',basis:'per-100g',nutrients:{kcal:52,proteinMg:300,carbsMg:11400,fatMg:200,fiberMg:2040,sugarMg:10100,saltMg:0},source:'Swiss Food Composition Database',datasetVersion:'V 7.1',attribution:ATTRIBUTION,link:'https://naehrwertdaten.ch/en/'});
   // Bad hit ids are skipped and never fetched; a duplicate is read once; odd values stay unknown.
   const odd=await search(q('fixture odd'));
   expect(odd.body.results.map(r=>r.id)).toEqual(['900031','900032']);
   expect(odd.body.results[0].name).toBe('Fixture odd one');
   expect(odd.body.results[0].nutrients).toEqual({kcal:null,proteinMg:null,carbsMg:null,fatMg:3000,fiberMg:null,sugarMg:4000,saltMg:null});
   for(const result of odd.body.results)expect(result.attribution).toBe(ATTRIBUTION);
   expect(await search(q('fixture nothing'))).toMatchObject({status:200,body:{results:[]}});
  }finally{await mf.dispose();}
 },60_000);

 test('cache: the same words (in any spacing or case) and known details use no provider request',async()=>{
  const {mf,calls,search}=worker();
  try{
   const first=await search(q('fixture pear'));expect(first.status).toBe(200);expect(calls).toHaveLength(3);
   const again=await search(q('FIXTURE  pear'));
   expect(again.body).toEqual(first.body);expect(again.ms).toBeLessThan(1_500);expect(calls).toHaveLength(3);
   // Another search whose hit was already read fetches only the search and the new detail.
   const apple=await search(q('fixture apple'));
   expect(apple.body.results).toHaveLength(5);
   expect(calls.slice(3).map(c=>c.url.pathname.split('/').pop())).toEqual(['foods','900002','900003','900004','900005']);
   // An empty answer is kept too.
   await search(q('fixture nothing'));const before=calls.length;expect((await search(q('fixture nothing'))).body).toEqual({results:[]});expect(calls).toHaveLength(before);
  }finally{await mf.dispose();}
 },60_000);

 test('two searches at once share the global budget: every FSVO request is at least 2 s after the one before',async()=>{
  const {mf,calls,search}=worker();
  try{
   const [a,b]=await Promise.all([search(q('fixture plum')),search(q('fixture fig'))]);
   expect([a.status,b.status]).toEqual([200,200]);
   expect(calls).toHaveLength(4);
   const ordered=[...calls].sort((x,y)=>x.at-y.at);for(const gap of gaps(ordered))expect(gap).toBeGreaterThanOrEqual(1_900);
  }finally{await mf.dispose();}
 },40_000);

 test('a client gets 3 provider searches a minute; cache hits do not count, and another client is still served',async()=>{
  const {mf,calls,search}=worker(),me={headers:{'x-food-client':'v4:192.0.2.7'}},friend={headers:{'x-food-client':'v6:2001:0db8:1234::/48'}};
  try{
   for(const words of ['fixture plum','fixture fig','fixture kiwi'])expect((await search(q(words),me)).status).toBe(200);
   const refused=await search(q('fixture lime'),me);
   expect(refused.status).toBe(429);expect(refused.body.error).toBe('TRY_LATER');expect(refused.body.retryAfter).toBeGreaterThanOrEqual(1);expect(refused.body.retryAfter).toBeLessThanOrEqual(60);
   expect(calls).toHaveLength(6);
   expect((await search(q('fixture plum'),me)).status).toBe(200);expect(calls).toHaveLength(6);
   expect((await search(q('fixture lime'),friend)).status).toBe(200);expect(calls).toHaveLength(8);
  }finally{await mf.dispose();}
 },60_000);

 test('redirects are refused, never followed: a redirected search fails and a redirected detail is left out',async()=>{
  const away=()=>new Response(null,{status:302,headers:{location:'https://evil.example/steal'}});
  const searchMoved=worker({fsvo:away});
  try{
   expect(await searchMoved.search(q('fixture apple'))).toMatchObject({status:502,body:{error:'PROVIDER_UNAVAILABLE'}});
   expect(searchMoved.calls.map(c=>c.url.origin)).toEqual([new URL(FSVO).origin]);
  }finally{await searchMoved.mf.dispose();}
  const detailMoved=worker({fsvo:url=>url.pathname.endsWith('/food/900001')?away():fsvoFixture(url)});
  try{
   const answer=await detailMoved.search(q('fixture pear'));
   expect(answer.status).toBe(200);expect(answer.body.results.map(r=>r.id)).toEqual(['900011']);
   expect(detailMoved.calls.every(c=>c.url.origin===new URL(FSVO).origin)).toBe(true);
  }finally{await detailMoved.mf.dispose();}
 },40_000);

 test('the body cap: an answer over 128 kB is refused; a detail over it is left out',async()=>{
  const big=()=>new Response('['+' '.repeat(130_000)+']',{headers:{'content-type':'application/json'}});
  const tooBig=worker({fsvo:big});
  try{expect(await tooBig.search(q('fixture apple'))).toMatchObject({status:502,body:{error:'PROVIDER_UNAVAILABLE'}});}finally{await tooBig.mf.dispose();}
  const bigDetail=worker({fsvo:url=>url.pathname.endsWith('/food/900011')?Response.json({...detailFor(900011),padding:'x'.repeat(130_000)}):fsvoFixture(url)});
  try{const answer=await bigDetail.search(q('fixture pear'));expect(answer.status).toBe(200);expect(answer.body.results.map(r=>r.id)).toEqual(['900001']);}finally{await bigDetail.mf.dispose();}
 },40_000);

 test.each([429,503])('an FSVO %i pauses searches for 60 s without a further request, and barcode lookups keep their own budget',async status=>{
  const {mf,calls,search}=worker({fsvo:()=>new Response('busy',{status})});
  try{
   expect(await search(q('fixture apple'))).toMatchObject({status:429,body:{error:'PROVIDER_THROTTLED',retryAfter:60}});
   const next=await search(q('fixture pear'));expect(next.status).toBe(429);expect(next.body.error).toBe('TRY_LATER');
   expect(calls).toHaveLength(1);
   const barcode=await mf.dispatchFetch('https://food.test/lookup?code=12345678');expect(barcode.status).toBe(200);await barcode.json();
   expect(calls.map(c=>c.url.hostname)).toEqual(['api.webapp.prod.blv.foodcase-services.com','world.openfoodfacts.org']);
  }finally{await mf.dispose();}
 },30_000);
});
