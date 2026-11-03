/** @typedef {{FOOD_BUDGET:DurableObjectNamespace,FOOD_USER_AGENT?:string,FDC_API_KEY?:string,ISOLATED_FIXTURE?:string,LOCAL_TEST_NOW?:string,LOCAL_SWEEP_MS?:string}} Env */
/** @typedef {{body:unknown,status:number,until:number}} Cached */
/** @typedef {{buckets:Record<string,{n:number,recent:number[]}>}} FoodDay */
/** @typedef {{kcal:number|null,proteinMg:number|null,carbsMg:number|null,fatMg:number|null,fiberMg:number|null,sugarMg:number|null,saltMg:number|null}} GenericNutrients */
/** @typedef {{id:string,name:string,basis:'per-100g',nutrients:GenericNutrients,source:'Swiss Food Composition Database',datasetVersion:'V 7.1',attribution:string,link:string}} GenericFood */
/** @typedef {'kcal'|'proteinMg'|'carbsMg'|'fatMg'|'fiberMg'|'sugarMg'|'saturatedFatMg'|'sodiumMg'|'potassiumMg'|'calciumMg'|'ironMg'|'magnesiumMg'|'zincMg'|'vitaminAUg'|'vitaminCMg'|'vitaminDUg'|'vitaminEMg'|'vitaminKUg'|'vitaminB12Ug'|'folateUg'} BrandedField */
/** @param {unknown} body @param {number} [status] */
const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const barcode=/^(?:\d{8}|\d{13}|\d{14})$/;
// Session AK (Part 1b): every /lookup success names its source. Open Food Facts' own answer is passed on unchanged with
// these three fields added beside it (the app's parseFoodProduct reads only `status` and `product`, so it parses as before).
const OFF_SOURCE='Open Food Facts',OFF_ATTRIBUTION='Source: Open Food Facts (openfoodfacts.org), Open Database Licence 1.0 / Database Contents Licence 1.0',OFF_LINK='https://world.openfoodfacts.org/';
/** Open Food Facts' answer with its source named. @param {unknown} body */
const offAnswer=body=>({.../** @type {object} */(body),source:OFF_SOURCE,attribution:OFF_ATTRIBUTION,link:OFF_LINK});
// The provider User-Agent template (docs/run11/FOOD_READINESS.md); anything else fails closed before any provider call.
const USER_AGENT=/^ZIGoals\/[^\r\n]{1,160}$/;
// One provider request per 12 s for the whole deployment (at most 5/min, a third of Open Food Facts' 15/min per IP).
// A lookup that finds the slot taken may wait for the next one instead of failing at once, but only one lookup
// waits at a time and never for more than 15 s. A 429/503 from the provider pauses every lookup for 60 s.
const SPACING=12000,MAX_WAIT=15000,MAX_QUEUED=1,BACKOFF=60000;
// Found products are kept 24 h; an unknown barcode (provider 404) 1 h, so repeating it uses no slot (Session S, FIX_PLAN C3).
const FOUND_MS=86400000,NOT_FOUND_MS=3600000,MAX_CACHED=256;
// Per client (Session S): at most 3 provider lookups in any rolling minute and 120 per UTC day, inside the global slot
// spacing above. A person scanning several products in a row succeeds while nobody else scans. Cache hits never count.
const CLIENT_MINUTE=3,CLIENT_DAY=120;
// Retention (Session S, FIX_PLAN C7): an expired answer is deleted when it is read, and while anything is stored an
// alarm deletes expired answers, day rows older than yesterday and an earlier day's client key at least hourly.
const SWEEP_MS=3600000;
// The app's address group (market-client-address.ts): an IPv4 address, or an IPv6 /48. Anything else is refused.
const CLIENT_GROUP=/^(?:v4:(?:\d{1,3}\.){3}\d{1,3}|v6:[0-9a-f]{4}:[0-9a-f]{4}:[0-9a-f]{4}::\/48)$/;
const KEY_ROW='food-client-key',DAY_INDEX='food-days',dayRow=/** @param {string} day */day=>'food-day:'+day;
// Session AJ (item 22, TIER 3 egress routes): generic-food text search in the Swiss Food Composition Database (FSVO/BLV,
// naehrwertdaten.ch). No key; FSVO allows use in a nutrition diary app with acknowledgement of the source, so every
// result carries the attribution below (docs/research/session-aj/FOOD_SOURCES.md). Only this origin and path are read.
const FSVO_ORIGIN='https://api.webapp.prod.blv.foodcase-services.com',FSVO_PATH='/BLV_WebApp_WS/webresources/BLV-api/';
const FSVO_ATTRIBUTION='Source: Swiss Food Composition Database V 7.1, Federal Food Safety and Veterinary Office FSVO (naehrwertdaten.ch)',FSVO_LINK='https://naehrwertdaten.ch/en/';
// Its own Durable Object (same class): its own slot, back-off, client shares and cache, apart from Open Food Facts.
// One FSVO request per 2 s for the whole deployment. A search reads the hit list, then each of at most 5 hits' details in
// turn, each in its own slot; no request waits more than 10 s for one. The client share is the barcode one (3 a minute,
// 120 a UTC day), counted once per search that needs the provider. Searches and details are kept 24 h (an empty search
// 1 h), at most 512 rows; a detail is about 42 kB, so the body cap is 128 kB.
const FSVO_BUDGET='fsvo-search-budget-v1',FSVO_SPACING=2000,FSVO_MAX_WAIT=10000,FSVO_HITS=5,FSVO_MAX_CACHED=512,FSVO_BODY_CAP=128000;
const FSVO_LANGS=['en','de','fr','it'];
// Session AK (Part 1b, TIER 3 egress routes): a barcode Open Food Facts does not know is looked up in USDA FoodData Central
// Branded Foods (api.nal.usda.gov), only when the owner set the FDC_API_KEY secret; without it the step is skipped and
// nothing is sent. The key travels in the X-Api-Key header (api.data.gov's developer manual; the FDC API guide's examples
// use `api_key`, which would put the key in URLs and logs). Only the barcode, the User-Agent and the key are sent.
// FDC data are public domain (CC0 1.0); FDC asks for the citation below (https://fdc.nal.usda.gov/api-guide/).
const FDC_ORIGIN='https://api.nal.usda.gov',FDC_PATH='/fdc/v1/foods/search',FDC_KEY=/^[A-Za-z0-9]{20,64}$/;
const FDC_SOURCE='USDA FoodData Central',FDC_ATTRIBUTION='U.S. Department of Agriculture, Agricultural Research Service. FoodData Central, 2019. fdc.nal.usda.gov.',FDC_LINK='https://fdc.nal.usda.gov/';
// Its own Durable Object (same class), like FSVO's: one FDC request per 4 s for the whole deployment (900 an hour at most,
// under FDC's 1,000 per hour per key; going over blocks the key for an hour), no lookup waits more than 10 s for its slot,
// the barcode client share (3 a minute, 120 a UTC day), found answers kept 24 h and unknown ones 1 h. A 429 or 503
// pauses FDC for its Retry-After, at least 60 s and at most the hour FDC blocks a key. Five hits at most per answer.
const FDC_BUDGET='fdc-lookup-budget-v1',FDC_SPACING=4000,FDC_MAX_WAIT=10000,FDC_PAGE=5,FDC_BODY_CAP=160000,FDC_MAX_CACHED=512,FDC_MAX_BACKOFF=3600000;
// FDC nutrient (by nutrient id, or the older nutrient number) → field, unit, scale to the field's unit, the most 100 g can
// hold. Branded Foods values are per 100 g (or 100 mL) as FDC standardises them from the label; IU of vitamin D is µg × 40.
/** @type {Record<string,[BrandedField,string,number,number]>} */
const FDC_NUTRIENTS={};
for(const [ids,field,unit,scale,max] of /** @type {[string[],BrandedField,string,number,number][]} */([[['1008','208'],'kcal','kcal',1,1000],[['1003','203'],'proteinMg','g',1000,100],[['1005','205'],'carbsMg','g',1000,100],[['1004','204'],'fatMg','g',1000,100],[['1079','291'],'fiberMg','g',1000,100],[['2000','269'],'sugarMg','g',1000,100],[['1258','606'],'saturatedFatMg','g',1000,100],[['1093','307'],'sodiumMg','mg',1,100000],[['1092','306'],'potassiumMg','mg',1,100000],[['1087','301'],'calciumMg','mg',1,100000],[['1089','303'],'ironMg','mg',1,100000],[['1090','304'],'magnesiumMg','mg',1,100000],[['1095','309'],'zincMg','mg',1,100000],[['1106','320'],'vitaminAUg','ug',1,100000000],[['1162','401'],'vitaminCMg','mg',1,100000],[['1114','328'],'vitaminDUg','ug',1,100000000],[['1110','324'],'vitaminDUg','iu',1/40,4000000000],[['1109','323'],'vitaminEMg','mg',1,100000],[['1185','430'],'vitaminKUg','ug',1,100000000],[['1178','418'],'vitaminB12Ug','ug',1,100000000],[['1177','417'],'folateUg','ug',1,100000000]]))for(const id of ids)FDC_NUTRIENTS[id]=[field,unit,scale,max];
/** The 14-digit GTIN form of 8 to 14 digits: UPC-A 041303020937, EAN-13 0041303020937 and 00041303020937 are one product. @param {string} code */
const gtin14=code=>code.padStart(14,'0');
/** The form FDC most likely stores: UPC-A (12 digits) for a US code, EAN-13 or GTIN-14 otherwise, EAN-8 as it is. @param {string} code */
const fdcQuery=code=>{if(code.length===8)return code;const s=code.replace(/^0+/,'');return s.length<=12?s.padStart(12,'0'):s.length===13?s:code;};
// 2 to 60 letters, digits, spaces or basic punctuation, starting with a letter or digit (apps/web/lib/food-search.ts).
const SEARCH_TEXT=/^[\p{L}\p{M}\d][\p{L}\p{M}\d ,.'’()&/-]{1,59}$/u;
/** @param {string|null} raw */
const searchQuery=raw=>{const q=(raw??'').normalize('NFC').trim().replace(/\s+/g,' ').toLowerCase();return SEARCH_TEXT.test(q)?q:null;};
// Component code → field, unit, scale to the app's units, and the most 100 g can hold. Values are per 100 g edible portion.
/** @type {Record<string,[keyof GenericNutrients,string,number,number]>} */
const FSVO_COMPONENTS={ENERCC:['kcal','kcal',1,1000],PROT625:['proteinMg','g',1000,100],CHO:['carbsMg','g',1000,100],FAT:['fatMg','g',1000,100],FIBT:['fiberMg','g',1000,100],SUGAR:['sugarMg','g',1000,100],NACL:['saltMg','g',1000,100]};
/** @param {number} at */
const utcDay=at=>new Date(at).toISOString().slice(0,10);
/** @param {number} ms */
const later=ms=>reply({error:'TRY_LATER',retryAfter:Math.max(1,Math.ceil(ms/1000))},429);
/** @type {ExportedHandler<Env>} */
const worker={async fetch(request,env){
 const url=new URL(request.url);
 if(request.method==='GET'&&url.pathname==='/search'){
  const keys=[...url.searchParams.keys()],q=searchQuery(url.searchParams.get('q')),lang=url.searchParams.get('lang')??'en';
  if(keys.some(k=>k!=='q'&&k!=='lang')||keys.filter(k=>k==='q').length!==1||keys.filter(k=>k==='lang').length>1||!q||!FSVO_LANGS.includes(lang))return reply({error:'INVALID_QUERY'},400);
  // A new request: only the normalised words, the language and the app's client value reach the budget object.
  const client=request.headers.get('x-food-client');
  return env.FOOD_BUDGET.get(env.FOOD_BUDGET.idFromName(FSVO_BUDGET)).fetch(new Request('https://food.internal/search?'+new URLSearchParams({q,lang}),{headers:client===null?{}:{'x-food-client':client}}));
 }
 if(request.method!=='GET'||url.pathname!=='/lookup'||[...url.searchParams.keys()].some(k=>k!=='code')||!barcode.test(url.searchParams.get('code')??''))return reply({error:'INVALID_BARCODE'},400);
 const off=await env.FOOD_BUDGET.get(env.FOOD_BUDGET.idFromName('shared-provider-budget-v1')).fetch(request);
 // Open Food Facts first. Only its "not found" goes on to FoodData Central, and only with a usable key; anything FDC
 // cannot answer (no match, busy, throttled, unavailable) leaves the answer "not found", so the person can add the food.
 if(off.status!==404||!FDC_KEY.test(env.FDC_API_KEY??''))return off;
 await off.body?.cancel();
 const client=request.headers.get('x-food-client'),code=/** @type {string} tested above */(url.searchParams.get('code'));
 const fdc=await env.FOOD_BUDGET.get(env.FOOD_BUDGET.idFromName(FDC_BUDGET)).fetch(new Request('https://food.internal/fdc?'+new URLSearchParams({code}),{headers:client===null?{}:{'x-food-client':client}}));
 if(fdc.status===200)return fdc;
 await fdc.body?.cancel();return reply({error:'NOT_FOUND'},404);}};
export default worker;
/** A client is one of 4,096 buckets: the first 12 bits of an HMAC-SHA256 of its address group under a random key that is
 * replaced every UTC day. Neither the address nor the group is stored, and once the day's key is replaced no stored
 * bucket can be linked to an address again. The same pattern as the market coordinator (Session R1). @param {string} key @param {string} group */
async function bucketOf(key,group){
 const hmac=await crypto.subtle.importKey('raw',new Uint8Array(/** @type {RegExpMatchArray} 64 hex characters */(key.match(/../g)).map(h=>parseInt(h,16))),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const mac=new Uint8Array(await crypto.subtle.sign('HMAC',hmac,new TextEncoder().encode(group)));
 return 'b'+(((/** @type {number} */(mac[0]))<<4)|((/** @type {number} */(mac[1]))>>4)).toString(16).padStart(3,'0');
}
/** The client's share, checked inside the budget transaction: a refusal, or `count`, which records this request and is
 * called only when a slot is granted. A request without a client value has no share. Session S's rule, shared by both routes.
 * @param {DurableObjectTransaction} s @param {string|null} group @param {number} now
 * @returns {Promise<{refuse:number}|{count:()=>Promise<void>}>} */
async function clientShare(s,group,now){
 const day=utcDay(now);
 // The day's client key, made on first use and stored with the first lookup that uses it.
 let key=group?/** @type {{day:string,key:string}|undefined} */(await s.get(KEY_ROW)):undefined;
 if(group&&(key?.day!==day||!/^[0-9a-f]{64}$/.test(key.key)))key={day,key:[...crypto.getRandomValues(new Uint8Array(32))].map(v=>v.toString(16).padStart(2,'0')).join('')};
 const bucket=group&&key?await bucketOf(key.key,group):undefined;
 if(!bucket||!key)return {count:async()=>{}};
 const usage=/** @type {FoodDay} */((await s.get(dayRow(day)))??{buckets:{}}),mine=usage.buckets[bucket]??{n:0,recent:[]},recent=mine.recent.filter(at=>at>now-60000),stored=key;
 if(mine.n>=CLIENT_DAY)return {refuse:Date.parse(day+'T00:00:00Z')+86400000-now};
 if(recent.length>=CLIENT_MINUTE)return {refuse:Math.min(...recent)+60000-now};
 return {count:async()=>{
  await s.put(dayRow(day),{buckets:{...usage.buckets,[bucket]:{n:mine.n+1,recent:[...recent,now]}}});
  await s.put(KEY_ROW,stored);
  // Day rows older than yesterday go, at most 4 per lookup, so none outlives about 48 hours of use.
  const days=/** @type {string[]} */((await s.get(DAY_INDEX))??[]),old=days.filter(d=>d<utcDay(now-86400000)).slice(0,4);
  for(const d of old)await s.delete(dayRow(d));
  await s.put(DAY_INDEX,[...new Set([...days.filter(d=>!old.includes(d)),day])].sort());
 }};
}
/** The next slot of a second-source budget object (FSVO, FDC), reserved inside a transaction: refused during a back-off or
 * when it is more than `wait` ms away. @param {DurableObjectTransaction} s @param {number} now @param {number} [spacing] @param {number} [wait]
 * @returns {Promise<{refuse:number}|{at:number}>} */
async function fsvoSlot(s,now,spacing=FSVO_SPACING,wait=FSVO_MAX_WAIT){
 const next=/** @type {number|undefined} */(await s.get('next'))??0,backoff=/** @type {number|undefined} */(await s.get('backoffUntil'))??0;
 if(backoff>now)return {refuse:backoff-now};
 const at=Math.max(now,next);if(at-now>wait)return {refuse:at-now};
 await s.put('next',at+spacing);return {at};
}
/** Reads a JSON body of at most `limit` bytes as strict UTF-8, or throws. @param {Response} res @param {number} limit */
async function readJson(res,limit){
 const reader=res.body?.getReader();if(!reader)throw Error('empty');let text='',size=0;const decoder=new TextDecoder('utf-8',{fatal:true,ignoreBOM:false});
 try{while(true){const p=await reader.read();if(p.done)break;size+=p.value.length;if(size>limit)throw Error('size');text+=decoder.decode(p.value,{stream:true});}text+=decoder.decode();}catch(e){await reader.cancel();throw e;}
 return /** @type {unknown} */(JSON.parse(text));
}
/** At most 5 distinct DBIDs from a search answer. A hit whose id is not a plain positive integer is skipped, never fetched.
 * @param {unknown[]} hits */
const fsvoHits=hits=>[...new Set(hits.flatMap(hit=>{const id=hit&&typeof hit==='object'?/** @type {{id?:unknown}} */(hit).id:undefined;return typeof id==='number'&&Number.isSafeInteger(id)&&id>0&&id<2**31?[id]:[];}))].slice(0,FSVO_HITS);
/** One FSVO food detail in the app's food shape: name, per-100 g nutrients (kcal, and mg for the rest) and the source.
 * A missing, mis-unitised or implausible value stays null (unknown), never 0. Null when the detail has no usable name.
 * @param {number} id @param {unknown} raw @returns {GenericFood|null} */
function fsvoFood(id,raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
 const detail=/** @type {{name?:unknown,values?:unknown}} */(raw);
 const name=typeof detail.name==='string'?detail.name.normalize('NFC').replace(/\p{Cc}/gu,'').replace(/\s+/g,' ').trim().slice(0,120):'';
 if(!name)return null;
 /** @type {GenericNutrients} */
 const nutrients={kcal:null,proteinMg:null,carbsMg:null,fatMg:null,fiberMg:null,sugarMg:null,saltMg:null};
 for(const entry of Array.isArray(detail.values)?detail.values:[]){
  const value=/** @type {{value?:unknown,component?:{code?:unknown},unit?:{code?:unknown}}|null} */(entry);
  const code=value?.component?.code,unit=value?.unit?.code,amount=value?.value;
  if(typeof code!=='string'||!Object.hasOwn(FSVO_COMPONENTS,code))continue;
  const [field,expected,scale,max]=/** @type {[keyof GenericNutrients,string,number,number]} */(FSVO_COMPONENTS[code]);
  // The unit, when given, must be the component's own (kcal or g); a value is read once.
  if(unit!==undefined&&(typeof unit!=='string'||unit.toLowerCase()!==expected))continue;
  if(typeof amount==='number'&&Number.isFinite(amount)&&amount>=0&&amount<=max&&nutrients[field]===null)nutrients[field]=Math.round(amount*scale);
 }
 return {id:String(id),name,basis:'per-100g',nutrients,source:'Swiss Food Composition Database',datasetVersion:'V 7.1',attribution:FSVO_ATTRIBUTION,link:FSVO_LINK};
}
/** The FDC search hit whose gtinUpc is the requested product (leading zeros aside), in the normalised /lookup shape, or null.
 * Names and brands are cleaned and cut; a missing, mis-unitised or implausible nutrient stays null (unknown), never 0.
 * @param {string} code @param {unknown} raw */
function fdcProduct(code,raw){
 const list=raw&&typeof raw==='object'?/** @type {{foods?:unknown}} */(raw).foods:undefined,foods=Array.isArray(list)?list.slice(0,FDC_PAGE):[];
 const text=/** @param {unknown} v @param {number} max */(v,max)=>typeof v==='string'?v.normalize('NFC').replace(/\p{Cc}/gu,'').replace(/\s+/g,' ').trim().slice(0,max):'';
 for(const item of foods){
  if(!item||typeof item!=='object')continue;
  const food=/** @type {{fdcId?:unknown,dataType?:unknown,description?:unknown,gtinUpc?:unknown,brandName?:unknown,brandOwner?:unknown,servingSizeUnit?:unknown,foodNutrients?:unknown}} */(item);
  if(typeof food.gtinUpc!=='string'||!/^\d{8,14}$/.test(food.gtinUpc)||gtin14(food.gtinUpc)!==gtin14(code))continue;
  if(food.dataType!==undefined&&food.dataType!=='Branded')continue;
  const name=text(food.description,120),fdcId=food.fdcId;
  if(!name||typeof fdcId!=='number'||!Number.isSafeInteger(fdcId)||fdcId<1)continue;
  /** @type {Record<BrandedField,number|null>} */
  const nutrients=/** @type {Record<BrandedField,number|null>} */(Object.fromEntries([...new Set(Object.values(FDC_NUTRIENTS).map(([f])=>f))].map(f=>[f,null])));
  for(const entry of Array.isArray(food.foodNutrients)?food.foodNutrients:[]){
   // The search shape (nutrientId, nutrientNumber, unitName, value), the API spec's (number, unitName, amount) and the
   // food-detail shape (nutrient.{id,number,unitName}, amount) are all read; the unit must be the nutrient's own.
   const n=/** @type {{nutrientId?:unknown,nutrientNumber?:unknown,number?:unknown,unitName?:unknown,value?:unknown,amount?:unknown,nutrient?:{id?:unknown,number?:unknown,unitName?:unknown}}|null} */(entry&&typeof entry==='object'?entry:null);if(!n)continue;
   const ids=[n.nutrientId??n.nutrient?.id,n.nutrientNumber??n.number??n.nutrient?.number].filter(v=>typeof v==='number'||typeof v==='string').map(String);
   const key=ids.find(id=>Object.hasOwn(FDC_NUTRIENTS,id));if(!key)continue;
   const [field,unit,scale,max]=/** @type {[BrandedField,string,number,number]} */(FDC_NUTRIENTS[key]);
   const unitName=n.unitName??n.nutrient?.unitName,amount=n.value??n.amount;
   if(typeof unitName!=='string'||unitName.toLowerCase().replace('µ','u')!==unit)continue;
   if(typeof amount!=='number'||!Number.isFinite(amount)||amount<0||amount>max||nutrients[field]!==null)continue;
   // kcal and grams-as-mg are whole numbers; the other units keep three decimals.
   const value=amount*scale;nutrients[field]=scale===1000||field==='kcal'?Math.round(value):Math.round(value*1000)/1000;
  }
  const unitText=typeof food.servingSizeUnit==='string'?food.servingSizeUnit.toLowerCase():'';
  return {source:FDC_SOURCE,attribution:FDC_ATTRIBUTION,link:FDC_LINK,licence:'CC0-1.0',product:{code,gtinUpc:food.gtinUpc,fdcId,name,brand:text(food.brandName,80)||text(food.brandOwner,80),basis:'per-100g-or-100ml',labelUnit:['g','grm'].includes(unitText)?'g':['ml','mlt'].includes(unitText)?'ml':null,nutrients}};
 }
 return null;
}
export class FoodBudget{
 /** @param {DurableObjectState} state @param {Env} env */
 constructor(state,env){this.state=state;this.env=env;}
 /** The fixture clock only in isolated tests, as in the admission and market Workers. */
 now(){return this.env.ISOLATED_FIXTURE==='true'?Number(this.env.LOCAL_TEST_NOW):Date.now();}
 /** @param {Request} request */
 async fetch(request){
  if(new URL(request.url).pathname==='/search')return this.search(request);
  if(new URL(request.url).pathname==='/fdc')return this.fdc(request);
  const code=new URL(request.url).searchParams.get('code');if(!barcode.test(code??''))return reply({error:'INVALID_BARCODE'},400);
  if(!USER_AGENT.test(this.env.FOOD_USER_AGENT??''))return reply({error:'PROVIDER_SETUP_REQUIRED'},503);
  const group=request.headers.get('x-food-client');if(group!==null&&!CLIENT_GROUP.test(group))return reply({error:'INVALID_CLIENT'},400);
  const cached=async()=>{
   const cache=/** @type {Cached|undefined} */(await this.state.storage.get('cache:'+code));if(!cache)return null;
   if(cache.until>this.now())return reply(cache.status===200?offAnswer(cache.body):cache.body,cache.status);
   await this.state.storage.delete('cache:'+code);return null;
  };
  const hit=await cached();if(hit)return hit;
  const now=this.now();
  // Reserve the next free slot: now, or a later one if at most MAX_QUEUED lookups wait and the wait is at most MAX_WAIT.
  // The client's share is checked first and counted only when a slot is granted.
  const slot=await this.state.storage.transaction(async s=>{
   const share=await clientShare(s,group,now);if('refuse' in share)return {refuse:share.refuse};
   const next=/** @type {number|undefined} */(await s.get('next'))??0,backoff=/** @type {number|undefined} */(await s.get('backoffUntil'))??0;
   if(backoff>now)return {refuse:backoff-now};
   const at=Math.max(now,next),queued=next>now?Math.ceil((next-now)/SPACING)-1:0;
   if(at>now&&(at-now>MAX_WAIT||queued>=MAX_QUEUED))return {refuse:at-now};
   await s.put('next',at+SPACING);
   await share.count();
   return {at};
  });
  if(slot.refuse!==undefined)return later(slot.refuse);
  await this.armSweep();
  // Reservation survives worker death; failures still consume the shared attempt allowance.
  if(slot.at>this.now()){
   await new Promise(resolve=>setTimeout(resolve,slot.at-this.now()));
   // While this lookup waited, another may have fetched the same product, or the provider may have throttled us.
   const late=await cached();if(late)return late;
   const backoff=/** @type {number|undefined} */(await this.state.storage.get('backoffUntil'))??0;if(backoff>this.now())return reply({error:'PROVIDER_THROTTLED',retryAfter:Math.ceil((backoff-this.now())/1000)},429);
  }
  try{
   const res=await fetch('https://world.openfoodfacts.org/api/v3.4/product/'+code+'?fields=code,product_name,brands_tags,nutrition_data_per,nutriments,nutriscore_grade',{headers:{'User-Agent':/** @type {string} checked above */(this.env.FOOD_USER_AGENT),accept:'application/json'},redirect:'manual',signal:AbortSignal.timeout(8000)});
   if(res.status===429||res.status===503){await res.body?.cancel();await this.backOff();return reply({error:'PROVIDER_THROTTLED',retryAfter:BACKOFF/1000},429);}
   if(res.status===404){await res.body?.cancel();const body={error:'NOT_FOUND'};await this.remember(code,body,404,NOT_FOUND_MS);return reply(body,404);}
   if(!res.ok||!res.headers.get('content-type')?.includes('application/json')){await res.body?.cancel();return reply({error:'PROVIDER_UNAVAILABLE'},502);}
   const body=await readJson(res,128000);if(!body||typeof body!=='object'||Array.isArray(body))throw Error('invalid');
   // A "not found" in a 200 answer (status 0 in the older API, or a failure without a product) is a not found too.
   const said=/** @type {{status?:unknown,product?:unknown}} */(body);
   if(said.status===0||said.status==='0'||(said.status==='failure'&&!said.product)){const missing={error:'NOT_FOUND'};await this.remember(code,missing,404,NOT_FOUND_MS);return reply(missing,404);}
   await this.remember(code,body,200,FOUND_MS);
   return reply(offAnswer(body));
  }catch{return reply({error:'PROVIDER_UNAVAILABLE'},502);}
 }
 /** A 429 or 503 from the provider pauses every request to it for 60 s (FDC: its Retry-After, see FDC_MAX_BACKOFF). */
 async backOff(ms=BACKOFF){await this.state.storage.transaction(async s=>{const until=this.now()+ms;await s.put('backoffUntil',until);if((/** @type {number|undefined} */(await s.get('next'))??0)<until)await s.put('next',until);});}
 /** Seconds left of a back-off, or 0. */
 async backedOff(){const until=/** @type {number|undefined} */(await this.state.storage.get('backoffUntil'))??0;return until>this.now()?Math.ceil((until-this.now())/1000):0;}
 /** A cached body that has not expired, or undefined; an expired one is deleted when read. @param {string} key */
 async recall(key){
  const row=/** @type {Cached|undefined} */(await this.state.storage.get('cache:'+key));if(!row)return undefined;
  if(row.until>this.now())return row.body;
  await this.state.storage.delete('cache:'+key);return undefined;
 }
 /** Generic-food search (GET /search?q=&lang=, in the FSVO budget object). Read-only; nothing about the person is sent.
  * @param {Request} request */
 async search(request){
  const url=new URL(request.url),q=searchQuery(url.searchParams.get('q')),lang=url.searchParams.get('lang')??'en';
  if(!q||!FSVO_LANGS.includes(lang))return reply({error:'INVALID_QUERY'},400);
  const agent=this.env.FOOD_USER_AGENT??'';if(!USER_AGENT.test(agent))return reply({error:'PROVIDER_SETUP_REQUIRED'},503);
  const group=request.headers.get('x-food-client');if(group!==null&&!CLIENT_GROUP.test(group))return reply({error:'INVALID_CLIENT'},400);
  const searchKey='fsvo-search:'+lang+':'+q,foodKey=/** @param {number} id */id=>'fsvo-food:'+lang+':'+id;
  /** @returns {Promise<number[]|undefined>} */
  const cachedIds=async()=>{const row=/** @type {{ids?:unknown}|undefined} */(await this.recall(searchKey));return Array.isArray(row?.ids)?fsvoHits(row.ids.map(id=>({id}))):undefined;};
  /** @param {number} id @returns {Promise<{food:GenericFood|null}|undefined>} */
  const cachedFood=async id=>/** @type {{food:GenericFood|null}|undefined} */(await this.recall(foodKey(id)));
  /** Every result from the cache, or null when any part needs the provider. */
  const fromCache=async()=>{const ids=await cachedIds();if(!ids)return null;const foods=[];for(const id of ids){const row=await cachedFood(id);if(!row)return null;if(row.food)foods.push(row.food);}return foods;};
  const hit=await fromCache();if(hit)return reply({results:hit});
  const now=this.now();
  const admitted=await this.state.storage.transaction(async s=>{
   const share=await clientShare(s,group,now);if('refuse' in share)return {refuse:share.refuse};
   const slot=await fsvoSlot(s,now);if('at' in slot)await share.count();return slot;
  });
  if('refuse' in admitted)return later(admitted.refuse);
  await this.armSweep();
  /** @type {number|undefined} */
  let reserved=admitted.at;
  /** Waits for the admission slot, then for a newly reserved one per request. False: no slot soon enough, or a back-off began. */
  const turn=async()=>{
   let at=reserved;reserved=undefined;
   if(at===undefined){const slot=await this.state.storage.transaction(s=>fsvoSlot(s,this.now()));if('refuse' in slot)return false;at=slot.at;}
   if(at>this.now())await new Promise(resolve=>setTimeout(resolve,/** @type {number} */(at)-this.now()));
   return (await this.backedOff())===0;
  };
  /** One read of a fixed FSVO path: only `Accept` and the User-Agent go with it; no redirect is followed.
   * @param {string} path @returns {Promise<{body:unknown}|{throttled:true}|{failed:true}>} */
  const read=async path=>{
   const target=new URL(FSVO_PATH+path,FSVO_ORIGIN);if(target.origin!==FSVO_ORIGIN||!target.pathname.startsWith(FSVO_PATH))return {failed:true};
   try{
    const res=await fetch(target,{headers:{'User-Agent':agent,Accept:'application/json'},redirect:'manual',signal:AbortSignal.timeout(8000)});
    if(res.status===429||res.status===503){await res.body?.cancel();await this.backOff();return {throttled:true};}
    if(!res.ok||!res.headers.get('content-type')?.includes('application/json')){await res.body?.cancel();return {failed:true};}
    return {body:await readJson(res,FSVO_BODY_CAP)};
   }catch{return {failed:true};}
  };
  const throttled=async()=>reply({error:'PROVIDER_THROTTLED',retryAfter:Math.max(1,await this.backedOff())},429);
  let ids=await cachedIds();
  if(!ids){
   if(!(await turn()))return throttled();
   // While this search waited, another may have read the same words.
   const late=await fromCache();if(late)return reply({results:late});
   const answer=await read('foods?'+new URLSearchParams({search:q,lang,limit:'10'}));
   if('throttled' in answer)return throttled();
   if('failed' in answer||!Array.isArray(answer.body))return reply({error:'PROVIDER_UNAVAILABLE'},502);
   ids=fsvoHits(answer.body);
   await this.remember(searchKey,{ids},200,ids.length?FOUND_MS:NOT_FOUND_MS,FSVO_MAX_CACHED);
  }
  /** @type {GenericFood[]} */
  const results=[];let short=/** @type {''|'busy'|'throttled'|'failed'} */('');
  for(const id of ids){
   const known=await cachedFood(id);if(known){if(known.food)results.push(known.food);continue;}
   if(!(await turn())){short=(await this.backedOff())?'throttled':'busy';break;}
   const answer=await read('food/'+id+'?'+new URLSearchParams({lang}));
   if('throttled' in answer){short='throttled';break;}
   if('failed' in answer){short='failed';continue;}
   const food=fsvoFood(id,answer.body);await this.remember(foodKey(id),{food},200,FOUND_MS,FSVO_MAX_CACHED);if(food)results.push(food);
  }
  // Fewer results than hits is still an answer; none at all says why.
  if(!results.length&&short)return short==='throttled'?throttled():short==='busy'?later(FSVO_SPACING):reply({error:'PROVIDER_UNAVAILABLE'},502);
  return reply({results});
 }
 /** FoodData Central Branded Foods by barcode (GET /fdc?code=, in the FDC budget object; reached only from /lookup after
  * Open Food Facts said "not found" and only with a usable key). 200 with the normalised product, or 404 NOT_FOUND;
  * anything else (429, 502, 503) the caller turns into "not found". @param {Request} request */
 async fdc(request){
  const code=new URL(request.url).searchParams.get('code')??'';if(!barcode.test(code))return reply({error:'INVALID_BARCODE'},400);
  const agent=this.env.FOOD_USER_AGENT??'',key=this.env.FDC_API_KEY??'';
  if(!USER_AGENT.test(agent)||!FDC_KEY.test(key))return reply({error:'PROVIDER_SETUP_REQUIRED'},503);
  const group=request.headers.get('x-food-client');if(group!==null&&!CLIENT_GROUP.test(group))return reply({error:'INVALID_CLIENT'},400);
  // One cache row per product, whichever of its 8- to 14-digit forms was asked.
  const cacheKey='fdc:'+gtin14(code);
  const cached=async()=>{const row=/** @type {Cached|undefined} */(await this.state.storage.get('cache:'+cacheKey));if(!row)return null;if(row.until>this.now())return reply(row.body,row.status);await this.state.storage.delete('cache:'+cacheKey);return null;};
  const hit=await cached();if(hit)return hit;
  const now=this.now();
  const admitted=await this.state.storage.transaction(async s=>{
   const share=await clientShare(s,group,now);if('refuse' in share)return {refuse:share.refuse};
   const slot=await fsvoSlot(s,now,FDC_SPACING,FDC_MAX_WAIT);if('at' in slot)await share.count();return slot;
  });
  if('refuse' in admitted)return later(admitted.refuse);
  await this.armSweep();
  if(admitted.at>this.now()){
   await new Promise(resolve=>setTimeout(resolve,admitted.at-this.now()));
   const late=await cached();if(late)return late;
   const wait=await this.backedOff();if(wait)return reply({error:'PROVIDER_THROTTLED',retryAfter:wait},429);
  }
  const target=new URL(FDC_PATH+'?'+new URLSearchParams({query:fdcQuery(code),dataType:'Branded',pageSize:String(FDC_PAGE)}),FDC_ORIGIN);
  try{
   const res=await fetch(target,{headers:{'User-Agent':agent,Accept:'application/json','X-Api-Key':key},redirect:'manual',signal:AbortSignal.timeout(8000)});
   if(res.status===429||res.status===503){
    // Retry-After in seconds, kept between 60 s and the hour FDC blocks an over-limit key.
    const after=Number(res.headers.get('retry-after')),ms=Number.isFinite(after)&&after>0?Math.min(FDC_MAX_BACKOFF,Math.max(BACKOFF,after*1000)):FDC_MAX_BACKOFF;
    await res.body?.cancel();await this.backOff(ms);return reply({error:'PROVIDER_THROTTLED',retryAfter:Math.ceil(ms/1000)},429);
   }
   if(!res.ok||!res.headers.get('content-type')?.includes('application/json')){await res.body?.cancel();return reply({error:'PROVIDER_UNAVAILABLE'},502);}
   const found=fdcProduct(code,await readJson(res,FDC_BODY_CAP));
   if(!found){const missing={error:'NOT_FOUND'};await this.remember(cacheKey,missing,404,NOT_FOUND_MS,FDC_MAX_CACHED);return reply(missing,404);}
   await this.remember(cacheKey,found,200,FOUND_MS,FDC_MAX_CACHED);return reply(found);
  }catch{return reply({error:'PROVIDER_UNAVAILABLE'},502);}
 }
 /** Alarm spacing on the real clock; only an isolated test may shorten it. */
 sweepMs(){const local=Number(this.env.LOCAL_SWEEP_MS);return this.env.ISOLATED_FIXTURE==='true'&&Number.isSafeInteger(local)&&local>0?local:SWEEP_MS;}
 async armSweep(){if(await this.state.storage.getAlarm()===null)await this.state.storage.setAlarm(Date.now()+this.sweepMs());}
 /** Deletes what has outlived its use, and re-arms while anything that can expire is still stored. */
 async alarm(){
  const now=this.now(),today=utcDay(now),yesterday=utcDay(now-86400000);
  const left=await this.state.storage.transaction(async s=>{
   const rows=/** @type {Map<string,Cached>} */(await s.list({prefix:'cache:'})),expired=[...rows].filter(([,row])=>!(row.until>now)).map(([key])=>key);
   if(expired.length)await s.delete(expired);
   const days=/** @type {string[]} */((await s.get(DAY_INDEX))??[]),old=days.filter(d=>d<yesterday);
   for(const d of old)await s.delete(dayRow(d));
   if(old.length)await s.put(DAY_INDEX,days.filter(d=>!old.includes(d)));
   const key=/** @type {{day:string}|undefined} */(await s.get(KEY_ROW));if(key&&key.day<today)await s.delete(KEY_ROW);
   return rows.size-expired.length+days.length-old.length;
  });
  if(left>0)await this.state.storage.setAlarm(Date.now()+this.sweepMs());
 }
 /** Caches an answer (found or not found); keeps at most `max`, dropping the soonest to expire.
  * @param {string|null} code @param {unknown} body @param {number} status @param {number} ms @param {number} [max] */
 async remember(code,body,status,ms,max=MAX_CACHED){
  await this.state.storage.put('cache:'+code,{body,status,until:this.now()+ms});
  const rows=/** @type {Map<string,Cached>} */(await this.state.storage.list({prefix:'cache:'}));if(rows.size>max){const oldest=[...rows].sort((a,b)=>a[1].until-b[1].until).slice(0,rows.size-max).map(([k])=>k);await this.state.storage.delete(oldest);}
 }
}
